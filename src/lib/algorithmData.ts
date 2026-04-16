// Dynamic algorithm data from Xquik compose API with localStorage cache

const CACHE_KEY = 'ib_algorithm_data'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export interface AlgorithmRule {
  rule: string
}

export interface ScorerWeight {
  signal: string
  weight: number
  context: string
}

export interface EngagementMultiplier {
  action: string
  multiplier: string
}

export interface AlgorithmData {
  contentRules: AlgorithmRule[]
  scorerWeights: ScorerWeight[]
  engagementMultipliers: EngagementMultiplier[]
  topPenalties: string[]
  engagementVelocity: string
  source: string
  cachedAt: number
}

interface CachedData extends AlgorithmData {
  cachedAt: number
}

function getCached(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as CachedData
    if (Date.now() - data.cachedAt > CACHE_TTL) return null // expired
    return data
  } catch {
    return null
  }
}

function getStaleCache(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedData
  } catch {
    return null
  }
}

function setCache(data: AlgorithmData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }))
  } catch { /* storage full, ignore */ }
}

/** Fetch algorithm data from Xquik compose API with cache */
export async function fetchAlgorithmData(): Promise<AlgorithmData | null> {
  // 1. Check fresh cache
  const cached = getCached()
  if (cached) return cached

  // 2. Fetch from API
  try {
    // Always proxy through server-side — API key stays on server
    const url = `/api/xquik?path=${encodeURIComponent('/compose')}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ step: 'compose', topic: 'algorithm data fetch' }),
    })

    if (!res.ok) throw new Error(`API ${res.status}`)
    const raw = await res.json()

    const data: AlgorithmData = {
      contentRules: raw.contentRules || [],
      scorerWeights: raw.scorerWeights || [],
      engagementMultipliers: raw.engagementMultipliers || [],
      topPenalties: raw.topPenalties || [],
      engagementVelocity: raw.engagementVelocity || '',
      source: raw.source || '',
      cachedAt: Date.now(),
    }

    setCache(data)
    return data
  } catch {
    // 3. Fallback: return stale cache
    return getStaleCache()
  }
}

/** Check if a scorer weight is confirmed from source code or estimated */
export function isConfirmedSignal(signal: string): boolean {
  // These 19 signals are confirmed from x-algorithm-main/runners.py lines 202-222
  const confirmed = new Set([
    'favorite', 'reply', 'retweet', 'photo_expand', 'click',
    'profile_click', 'vqv', 'share', 'share_via_dm', 'share_via_copy_link',
    'dwell', 'quote', 'quoted_click', 'follow_author',
    'not_interested', 'block_author', 'mute_author', 'report', 'dwell_time',
  ])
  // Match partial: "reply" matches "reply" signal
  const signalLower = signal.toLowerCase().replace(/[^a-z_]/g, '')
  return [...confirmed].some(c => signalLower.includes(c.replace('_', '')))
}
