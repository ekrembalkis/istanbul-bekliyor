export interface NewsItem {
  id: string
  title: string
  description: string
  url: string
  source: string
  sourceLabel: string
  publishedAt: string
  category: string
  campaignRelevance: number
  isCampaignSignal: boolean
  imageUrl?: string
}

export interface NewsApiResponse {
  items: NewsItem[]
  fetchedAt: string
  sourceStatus: Record<string, 'ok' | 'error'>
}

export interface NewsFilter {
  category: string   // 'all' | specific category
  source: string     // 'all' | specific source key
  campaignOnly: boolean
  searchQuery: string
}

interface NewsCache {
  data: NewsApiResponse
  cachedAt: number
}

const CACHE_KEY = 'ib_news_cache'
const CACHE_TTL = 5 * 60 * 1000   // 5 minutes
const POLL_INTERVAL = 3 * 60 * 1000 // 3 minutes

function getCache(): NewsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache: NewsCache = JSON.parse(raw)
    if (Date.now() - cache.cachedAt > CACHE_TTL) return null
    return cache
  } catch {
    return null
  }
}

function setCache(data: NewsApiResponse): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }))
  } catch { /* quota exceeded — ignore */ }
}

export async function fetchNews(sources?: string[]): Promise<NewsApiResponse> {
  // Return cache if fresh
  const cache = getCache()
  if (cache) return cache.data

  const params = new URLSearchParams()
  if (sources?.length) params.set('sources', sources.join(','))
  params.set('limit', '100')

  const url = `/api/news?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`News API error: ${response.status}`)
  }

  const data: NewsApiResponse = await response.json()
  setCache(data)
  return data
}

export function filterNews(items: NewsItem[], filter: NewsFilter): NewsItem[] {
  let filtered = items

  if (filter.campaignOnly) {
    filtered = filtered.filter(item => item.isCampaignSignal)
  }

  if (filter.category !== 'all') {
    filtered = filtered.filter(item => item.category === filter.category)
  }

  if (filter.source !== 'all') {
    filtered = filtered.filter(item => item.source === filter.source)
  }

  if (filter.searchQuery.trim()) {
    const q = filter.searchQuery.toLowerCase()
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    )
  }

  return filtered
}

export function startNewsPolling(
  callback: (data: NewsApiResponse) => void,
  onError?: (err: Error) => void
): () => void {
  let intervalId: ReturnType<typeof setInterval> | null = null
  let isVisible = true

  const poll = async () => {
    if (!isVisible) return
    try {
      // Clear cache to force fresh fetch
      localStorage.removeItem(CACHE_KEY)
      const data = await fetchNews()
      callback(data)
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }

  const handleVisibility = () => {
    isVisible = document.visibilityState === 'visible'
    if (isVisible) poll() // Fetch immediately when tab becomes visible
  }

  document.addEventListener('visibilitychange', handleVisibility)
  intervalId = setInterval(poll, POLL_INTERVAL)

  // Cleanup
  return () => {
    if (intervalId) clearInterval(intervalId)
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}

export function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'az önce'
  if (diffMin < 60) return `${diffMin} dk önce`
  if (diffHour < 24) return `${diffHour} saat önce`
  if (diffDay < 7) return `${diffDay} gün önce`
  return new Date(dateStr).toLocaleDateString('tr-TR')
}

export function getNewsForTweet(item: NewsItem): { newsTitle: string; newsContext: string; newsUrl: string } {
  return {
    newsTitle: item.title,
    newsContext: item.description,
    newsUrl: item.url,
  }
}

export const CATEGORIES = [
  { key: 'all', label: 'Tümü' },
  { key: 'siyaset', label: 'Siyaset' },
  { key: 'ekonomi', label: 'Ekonomi' },
  { key: 'dunya', label: 'Dünya' },
  { key: 'teknoloji', label: 'Teknoloji' },
  { key: 'toplum', label: 'Toplum' },
  { key: 'spor', label: 'Spor' },
] as const

export const SOURCES = [
  { key: 'all', label: 'Tüm Kaynaklar' },
  { key: 'aa', label: 'Anadolu Ajansı' },
  { key: 'ntv', label: 'NTV' },
  { key: 'cnnturk', label: 'CNN Türk' },
  { key: 'diken', label: 'Diken' },
  { key: 'bianet', label: 'Bianet' },
  { key: 'bbc', label: 'BBC Türkçe' },
  { key: 'sozcu', label: 'Sözcü' },
  { key: 'cumhuriyet', label: 'Cumhuriyet' },
] as const
