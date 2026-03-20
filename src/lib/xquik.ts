// In production: calls go through /api/xquik proxy (avoids CORS)
// In dev: calls go directly to xquik.com with API key
const IS_DEV = import.meta.env.DEV
const DIRECT_URL = 'https://xquik.com/api/v1'
const API_KEY = import.meta.env.VITE_XQUIK_API_KEY?.trim() || ''

export interface StyleProfile {
  xUsername: string
  tweetCount: number
  isOwnAccount: boolean
  fetchedAt: string
  tweets: StyleTweet[]
}

export interface StyleTweet {
  id: string
  text: string
  createdAt: string
  authorUsername: string
}

export interface ScoreResult {
  passed: boolean
  passedCount: number
  totalChecks: number
  topSuggestion: string
  intentUrl: string
  checklist: { factor: string; passed: boolean }[]
}

export interface ComposeRefineResult {
  compositionGuidance: string[]
  examplePatterns: { pattern: string; description: string }[]
  intentUrl: string
  nextStep: string
}

// ── Core API Caller ──
async function api<T = unknown>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const method = options?.method || 'GET'

  let url: string
  let headers: Record<string, string>

  if (IS_DEV) {
    // Dev: direct call with API key
    url = `${DIRECT_URL}${path}`
    headers = { 'Content-Type': 'application/json', 'x-api-key': API_KEY }
  } else {
    // Production: go through Vercel serverless proxy
    url = `/api/xquik?path=${encodeURIComponent(path)}`
    headers = { 'Content-Type': 'application/json' }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.message || err.error || `API error ${res.status}`)
  }

  if (res.status === 204) return {} as T
  return res.json()
}

// ── Style Operations ──

/** Analyze a user's writing style from their recent tweets */
export async function analyzeStyle(username: string): Promise<StyleProfile> {
  return api<StyleProfile>('/styles', {
    method: 'POST',
    body: { username: username.replace('@', '') }
  })
}

/** Get a cached style profile */
export async function getStyleFromAPI(username: string): Promise<StyleProfile> {
  return api<StyleProfile>(`/styles/${encodeURIComponent(username.replace('@', ''))}`)
}

/** List all cached styles */
export async function listStyles(): Promise<{ styles: StyleProfile[] }> {
  return api<{ styles: StyleProfile[] }>('/styles')
}

/** Save custom tweets as a style (FREE) */
export async function saveCustomStyle(username: string, label: string, tweets: string[]): Promise<StyleProfile> {
  return api<StyleProfile>(`/styles/${encodeURIComponent(username.replace('@', ''))}`, {
    method: 'PUT',
    body: {
      label,
      tweets: tweets.map(text => ({ text }))
    }
  })
}

/** Delete a cached style */
export async function deleteStyleFromAPI(username: string): Promise<void> {
  await api(`/styles/${encodeURIComponent(username.replace('@', ''))}`, { method: 'DELETE' })
}

// ── Compose Operations ──

/** Step 1: Get composition guidance with style matching */
export async function composeRefine(opts: {
  topic: string
  tone: string
  goal: string
  styleUsername?: string
  mediaType?: string
}): Promise<ComposeRefineResult> {
  return api<ComposeRefineResult>('/compose', {
    method: 'POST',
    body: {
      step: 'refine',
      topic: opts.topic,
      tone: opts.tone,
      goal: opts.goal,
      styleUsername: opts.styleUsername?.replace('@', ''),
      mediaType: opts.mediaType || 'photo',
    }
  })
}

/** Step 2: Score a draft tweet against 11 algorithm checks */
export async function scoreDraft(draft: string, hasMedia = true): Promise<ScoreResult> {
  return api<ScoreResult>('/compose', {
    method: 'POST',
    body: {
      step: 'score',
      draft,
      hasMedia,
      hasLink: false,
    }
  })
}

// ── Tweet Search ──
export async function searchTweets(query: string, limit = 50): Promise<{ tweets: StyleTweet[] }> {
  return api<{ tweets: StyleTweet[] }>(`/x/tweets/search?q=${encodeURIComponent(query)}&limit=${limit}`)
}

// ── User Lookup ──
export interface XUser {
  id: string
  username: string
  name: string
  followers?: number
  following?: number
  verified?: boolean
  description?: string
  profilePicture?: string
  statusesCount?: number
}

export async function lookupUser(username: string): Promise<XUser> {
  return api<XUser>(`/x/users/${encodeURIComponent(username.replace('@', ''))}`)
}

// ── Helpers ──

/** Validate X username format: 1-15 chars, only [A-Za-z0-9_] */
export function isValidXUsername(name: string): boolean {
  return /^[A-Za-z0-9_]{1,15}$/.test(name)
}

/** Proxy Twitter profile images through our server to bypass tracking prevention */
export function proxyImageUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return ''
  // Upgrade to higher resolution
  const upgraded = url.replace('_normal', '_200x200')
  if (IS_DEV) return upgraded
  return `/api/image-proxy?url=${encodeURIComponent(upgraded)}`
}

// ── Local Storage for Drafts ──
export interface Draft {
  id: string
  text: string
  topic: string
  styleUsername: string
  score?: number
  scoreChecklist?: { factor: string; passed: boolean }[]
  createdAt: string
}

const DRAFTS_KEY = 'ib_drafts'

export function getSavedDrafts(): Draft[] {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]') } catch { return [] }
}

export function saveDraft(draft: Draft) {
  const drafts = getSavedDrafts()
  drafts.unshift(draft)
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 50)))
}

export function deleteDraft(id: string) {
  const drafts = getSavedDrafts().filter(d => d.id !== id)
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
}

/** Check if API is ready (dev: needs key, prod: proxy handles it) */
export function hasApiKey(): boolean {
  if (IS_DEV) return !!API_KEY && API_KEY.startsWith('xq_')
  return true // Production uses serverless proxy with server-side key
}
