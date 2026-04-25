// Rewrite user's text in a chosen X profile's style.
// POST /api/rewrite-tweet { styleUsername, userText, count?, tone?, lengthHint? }

import { setCorsHeaders } from './lib/cors.js'
import { XQUIK_BASE_URL } from './lib/endpoints.js'
import { geminiCall, sendGeminiError } from './lib/geminiCall.js'

function detectLanguage(tweets) {
  const text = tweets.join(' ').toLowerCase()
  const trChars = (text.match(/[çğıöşü]/g) || []).length
  const trWords = (text.match(/\b(ve|bir|bu|da|de|ile|için|ama|çok|var|yok|ben|sen|biz)\b/g) || []).length
  const enWords = (text.match(/\b(the|and|is|are|was|were|you|have|has|had|just|about|that|this|with|from)\b/g) || []).length
  const arChars = (text.match(/[\u0600-\u06FF]/g) || []).length
  if (arChars > text.length * 0.1) return 'ar'
  if (trChars > 2 || trWords > enWords * 1.5) return 'tr'
  if (enWords > 3) return 'en'
  return 'en'
}

const LENGTH_RULES = {
  tr: {
    kisa: 'UZUNLUK: Her versiyon 60–120 karakter arasında olmalı. 60\'tan kısa KABUL EDİLMEZ.',
    normal: 'UZUNLUK: Her versiyon 100–200 karakter arasında olmalı. 100\'den kısa KABUL EDİLMEZ.',
    uzun: 'UZUNLUK: Her versiyon 200–270 karakter arasında olmalı. 200\'den kısa KABUL EDİLMEZ. 280\'i GEÇME.',
    auto: (avg) => `UZUNLUK: Profilin ortalaması ${avg} karakter — o aralıkta kal.`,
  },
  en: {
    kisa: 'LENGTH: Each version must be 60–120 characters. Under 60 is NOT acceptable.',
    normal: 'LENGTH: Each version must be 100–200 characters. Under 100 is NOT acceptable.',
    uzun: 'LENGTH: Each version must be 200–270 characters. Under 200 is NOT acceptable. Do NOT exceed 280.',
    auto: (avg) => `LENGTH: Profile average is ${avg} characters — stay in that range.`,
  },
}

function lengthBlock(lang, hint, avgLen) {
  const rules = LENGTH_RULES[lang] || LENGTH_RULES.en
  if (hint === 'kisa' || hint === 'normal' || hint === 'uzun') return rules[hint]
  return rules.auto(avgLen)
}

function toneBlock(lang, tone) {
  if (!tone || !tone.trim()) return ''
  return lang === 'tr' ? `TON: ${tone.trim()}` : `TONE: ${tone.trim()}`
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const XQUIK_KEY = (process.env.XQUIK_API_KEY || '').trim()
  if (!XQUIK_KEY) return res.status(500).json({ error: 'XQUIK_API_KEY not configured' })

  const {
    styleUsername,
    userText,
    count = 3,
    tone = '',
    lengthHint = '',
  } = req.body || {}

  if (!styleUsername || !userText || !userText.trim()) {
    return res.status(400).json({ error: 'styleUsername and userText are required' })
  }

  const clampedCount = Math.max(1, Math.min(10, Number(count) || 3))

  try {
    const styleRes = await fetch(
      `${XQUIK_BASE_URL}/styles/${encodeURIComponent(String(styleUsername).replace('@', ''))}`,
      { headers: { 'x-api-key': XQUIK_KEY } }
    )
    if (!styleRes.ok) {
      return res.status(400).json({ error: 'Style profile not found. Analyze the profile first.' })
    }
    const styleData = await styleRes.json()
    const styleTweets = (styleData.tweets || [])
      .filter(t => !t.text.startsWith('@') && t.text.length > 20)
      .map(t => t.text)
      .slice(0, 60)

    if (styleTweets.length < 3) {
      return res.status(400).json({ error: 'Not enough style data. Analyze the profile first.' })
    }

    const lang = detectLanguage(styleTweets)
    const avgLen = Math.round(styleTweets.reduce((s, tw) => s + tw.length, 0) / styleTweets.length)
    const examples = styleTweets.map((tw, i) => `${i + 1}. ${tw}`).join('\n')
    const lenLine = lengthBlock(lang, lengthHint, avgLen)
    const toneLine = toneBlock(lang, tone)
    const extraBlock = [toneLine, lenLine].filter(Boolean).join('\n')

    const prompts = {
      tr: {
        system: `Sen bir tweet yeniden yazarısın. Görevin: kullanıcının yazdığı metnin ANLAMINI KORU, ama verilen profilin ses tonunda, kelime seçiminde, cümle yapısında ve karakterinde yeniden yaz.`,
        user: `STİL ÖRNEKLERİ (@${styleUsername}'in gerçek tweetleri — bu tarzı birebir yakala):
${examples}

KULLANICININ METNİ (anlamını koru, stilini değiştir):
"${userText.trim()}"

${extraBlock}

KURALLAR:
- ASLA orijinal metnin anlamını değiştirme, sadece STİLİ değiştir
- Üstteki profilin noktalama, büyük/küçük harf, argo, emoji, hashtag alışkanlıklarını birebir taklit et
- ASLA açıklama yazma, sadece yeniden yazılmış tweet
- Profilin stili hashtag/emoji KULLANMIYORSA, sen de KULLANMA
- Link ekleme
- Uzunluk kuralı yukarıda — ONA MUTLAKA UY

${clampedCount} farklı versiyon üret. Her biri AYNI ANLAMI taşısın ama farklı açıdan, farklı kelime seçimiyle yazılsın. Sadece tweet metinlerini yaz. Her birini yeni satırda numara ile başlat (1. 2. 3.). Başka hiçbir şey yazma.`,
      },
      en: {
        system: `You are a tweet rewriter. Your job: PRESERVE the MEANING of the user's text, but rewrite it in the given profile's voice, word choice, sentence structure, and character.`,
        user: `STYLE EXAMPLES (@${styleUsername}'s real tweets — imitate this voice exactly):
${examples}

USER'S TEXT (keep the meaning, change only the style):
"${userText.trim()}"

${extraBlock}

RULES:
- NEVER change the original meaning, only change the STYLE
- Exactly mimic the profile's punctuation, capitalization, slang, emoji, hashtag habits
- NEVER write explanations, only the rewritten tweet
- If the profile's style does NOT use hashtags/emojis, do NOT use them
- No links
- Length rule is above — YOU MUST FOLLOW IT

Produce ${clampedCount} different versions. Each should carry the SAME MEANING but from a different angle with different word choices. Only write the tweet texts. Start each on a new line numbered (1. 2. 3.). Nothing else.`,
      },
    }
    const p = prompts[lang] || prompts.en

    // Output budget: ~240 tok/version + slack. Helper applies thinkingLevel=low
    // on top, so output budget is no longer eaten by silent reasoning.
    const maxOutput = Math.min(3000, 280 * clampedCount + 400)

    let geminiResult
    try {
      geminiResult = await geminiCall({
        systemInstruction: p.system,
        prompt: p.user,
        thinkingLevel: 'low',
        generationConfigOverrides: { maxOutputTokens: maxOutput },
      })
    } catch (err) {
      console.error('rewrite-tweet: Gemini call failed', err.status, err.message)
      return sendGeminiError(err, res)
    }

    const raw = geminiResult.text
    const usage = {
      promptTokenCount: geminiResult.usage.promptTokens,
      candidatesTokenCount: geminiResult.usage.completionTokens,
      thoughtsTokenCount: geminiResult.usage.thoughtTokens,
      totalTokenCount: geminiResult.usage.totalTokens,
    }

    // Tolerant parser:
    //   1) Try newline-separated numbered list (preferred shape).
    //   2) Fallback: pull every "<digit><.|)|/> ..." span via regex (handles
    //      single-line "1. … 2. … 3. …" output).
    //   3) Last resort: a single non-empty line is the only rewrite we got.
    const cleanLine = line => line
      .replace(/^\d+[\.\)\/]\s*/, '')
      .replace(/^["'`]|["'`]$/g, '')
      .trim()

    let rewrites = raw
      .split('\n')
      .map(cleanLine)
      .filter(line => line.length > 10)

    if (rewrites.length < clampedCount) {
      const inline = [...raw.matchAll(/(?:^|\s)\d+[\.\)\/]\s*([^\n]+?)(?=(?:\s+\d+[\.\)\/])|$)/g)]
        .map(m => cleanLine(m[1] || ''))
        .filter(line => line.length > 10)
      if (inline.length > rewrites.length) rewrites = inline
    }

    if (rewrites.length === 0 && raw.trim().length > 10) {
      rewrites = [cleanLine(raw.trim())]
    }

    rewrites = rewrites.slice(0, clampedCount)

    if (rewrites.length === 0) {
      return res.status(502).json({
        error: 'Rewrite produced no usable output',
        finishReason: geminiResult.finishReason,
        raw: raw.slice(0, 400),
      })
    }

    return res.status(200).json({
      rewrites,
      language: lang,
      usage: {
        inputTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
      },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Rewrite failed', detail: err.message })
  }
}
