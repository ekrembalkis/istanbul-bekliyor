// Centralized Gemini caller for all panel endpoints.
//
// Wraps the v1beta REST API with:
//   - per-call thinkingLevel (Gemini 3 models default to "medium" reasoning,
//     which silently consumes maxOutputTokens before any visible text. We
//     pin "low" by default so output budgets actually go to output.)
//   - temperature=1.0 + topP/topK (Gemini 3 best practice)
//   - safetySettings: BLOCK_ONLY_HIGH (campaign content is political; default
//     filters truncate legitimate political speech)
//   - AbortController(30s) timeout + single retry on 429/5xx
//   - optional responseJsonSchema for structured output
//   - sanitizePromptInput helper for prompt-injection mitigation
//
// Reads model + endpoint from env (centralized in lib/endpoints.js).

import { GEMINI_BASE_URL, GEMINI_MODEL } from './endpoints.js'

const RETRY_STATUS = new Set([429, 500, 502, 503, 504])

const PERMISSIVE_SAFETY = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
].map(category => ({ category, threshold: 'BLOCK_ONLY_HIGH' }))

const DEFAULT_GEN_CONFIG = {
  temperature: 1.0,
  topP: 0.95,
  topK: 40,
}

/** Length-cap + escape risky control sequences for any user-supplied string
 *  that gets interpolated into a prompt. */
export function sanitizePromptInput(value, { maxLen = 4000 } = {}) {
  if (value == null) return ''
  let s = String(value)
  s = s.replace(/```+/g, '').replace(/'''+/g, '').replace(/"""+/g, '')
  s = s.replace(/\b(system|assistant|user)\s*:/gi, m => m.replace(':', '∶'))
  if (s.length > maxLen) s = s.slice(0, maxLen) + '…'
  return s
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

/**
 * @typedef {Object} GeminiCallOpts
 * @property {string} prompt                          User-side prompt body.
 * @property {string} [systemInstruction]             System role text (preferred over inlining).
 * @property {'minimal'|'low'|'medium'|'high'} [thinkingLevel='low']
 *   Reasoning depth. "minimal" = lowest latency, "low" = default for format-following
 *   tasks (rewrites, prompts), "medium" = synthesis (DNA/topics), "high" = complex.
 * @property {object} [responseJsonSchema]            JSON Schema for structured output.
 * @property {object} [generationConfigOverrides]     temperature/topP/topK/maxOutputTokens overrides.
 * @property {string} [modelOverride]                 Override env-pinned model.
 * @property {number} [timeoutMs=30000]               Per-attempt timeout.
 */

/** Returns { text, json, usage, raw, model, finishReason }. Throws on
 *  unrecoverable error (helper handles retries internally). */
export async function geminiCall(opts) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim()
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY not configured'), { status: 500 })

  const base = (GEMINI_BASE_URL || '').replace(/\/+$/, '')
  if (!base) throw Object.assign(new Error('GEMINI_BASE_URL not configured'), { status: 500 })

  const model = opts.modelOverride || GEMINI_MODEL
  if (!model) throw Object.assign(new Error('GEMINI_MODEL not configured'), { status: 500 })

  const url = `${base}/models/${model}:generateContent?key=${apiKey}`

  const generationConfig = {
    ...DEFAULT_GEN_CONFIG,
    maxOutputTokens: 2048,
    ...opts.generationConfigOverrides,
    thinkingConfig: { thinkingLevel: opts.thinkingLevel || 'low' },
  }
  if (opts.responseJsonSchema) {
    generationConfig.responseMimeType = 'application/json'
    generationConfig.responseJsonSchema = opts.responseJsonSchema
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
    generationConfig,
    safetySettings: PERMISSIVE_SAFETY,
  }
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] }
  }

  const timeoutMs = opts.timeoutMs ?? 30_000
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }

  let lastErr = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs)
      if (res.ok) {
        const raw = await res.json()
        const candidate = raw?.candidates?.[0]
        const text = candidate?.content?.parts?.map(p => p.text).filter(Boolean).join('') ?? ''
        const usage = {
          promptTokens: raw?.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: raw?.usageMetadata?.candidatesTokenCount ?? 0,
          thoughtTokens: raw?.usageMetadata?.thoughtsTokenCount ?? 0,
          totalTokens: raw?.usageMetadata?.totalTokenCount ?? 0,
        }
        let json = null
        if (opts.responseJsonSchema) {
          try {
            json = JSON.parse(text)
          } catch (parseErr) {
            throw Object.assign(new Error('Gemini returned invalid JSON'), {
              status: 502,
              detail: { parseError: String(parseErr), finishReason: candidate?.finishReason, textPreview: text.slice(0, 240) },
            })
          }
        }
        return { text, json, usage, raw, model, finishReason: candidate?.finishReason }
      }

      const errBody = await res.json().catch(() => ({}))
      const error = Object.assign(new Error(errBody?.error?.message || res.statusText), {
        status: res.status,
        detail: errBody?.error,
      })
      if (RETRY_STATUS.has(res.status) && attempt === 0) {
        lastErr = error
        await sleep(500 + Math.random() * 500)
        continue
      }
      throw error
    } catch (err) {
      if (err.name === 'AbortError') {
        const e = Object.assign(new Error('Gemini request timed out'), { status: 504 })
        if (attempt === 0) {
          lastErr = e
          continue
        }
        throw e
      }
      if (attempt === 0 && (err.status == null || RETRY_STATUS.has(err.status))) {
        lastErr = err
        await sleep(500 + Math.random() * 500)
        continue
      }
      throw err
    }
  }
  throw lastErr ?? new Error('Gemini call failed')
}

/** Convenience: map an error from geminiCall to a Vercel-style res. */
export function sendGeminiError(err, res) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500
  res.status(status).json({
    error: status === 429 ? 'rate_limited' : status >= 500 ? 'gemini_unavailable' : 'gemini_bad_request',
    message: err.message,
    detail: err.detail ?? null,
  })
}
