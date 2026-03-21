// Topic suggestion engine: Radar + Style Analysis + Campaign themes

import type { StyleProfile } from './xquik'

export interface TopicSuggestion {
  title: string
  source: 'radar' | 'style' | 'campaign'
  relevance: number  // 0-100
  reason: string
}

// ── Radar Topics (Xquik API) ──

interface RadarItem {
  title: string
  source: string
  score: number
  category: string
}

export async function fetchRadarTopics(
  apiFn: (path: string) => Promise<{ items: RadarItem[] }>
): Promise<TopicSuggestion[]> {
  try {
    const data = await apiFn('/radar?region=TR&hours=24&limit=15')
    return (data.items || []).map(item => ({
      title: item.title,
      source: 'radar' as const,
      relevance: Math.min(100, Math.round(item.score / 100)),
      reason: `${item.source} - TR gundem`,
    }))
  } catch {
    return []
  }
}

// ── Style Tweet Analysis ──

export function analyzeStyleTopics(style: StyleProfile | null): TopicSuggestion[] {
  if (!style?.tweets?.length) return []

  const allText = style.tweets.map(t => t.text).join(' ').toLowerCase()

  // Turkish stop words to exclude
  const stopWords = new Set([
    'bir', 'bu', 'da', 'de', 've', 'ile', 'icin', 'var', 'yok', 'ama',
    'ben', 'sen', 'biz', 'siz', 'olan', 'gibi', 'daha', 'cok', 'kadar',
    'sonra', 'neden', 'nasil', 'niye', 'iste', 'falan', 'valla', 'hatta',
    'https', 'http', 'amk', 'diye', 'baya', 'bile', 'hala', 'artik',
  ])

  const words = allText
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\wçğıöşüÇĞİÖŞÜ\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w))

  // Word frequency
  const freq: Record<string, number> = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })

  // Top themes (frequency > 1)
  return Object.entries(freq)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({
      title: word,
      source: 'style' as const,
      relevance: Math.min(100, count * 20),
      reason: `${count}x kullanilmis`,
    }))
}

// ── Campaign Theme (today) ──

export function getCampaignTopic(): TopicSuggestion | null {
  // Import campaign data dynamically to avoid circular deps
  try {
    const arrestDate = new Date('2025-03-19')
    const today = new Date()
    const dayNumber = Math.floor((today.getTime() - arrestDate.getTime()) / 86400000) + 1

    const themes = [
      'Bos Koltuk', 'Bahar Gelecek', 'Bogaz Bekliyor', 'Adalet',
      'Sabir', 'Umut', 'Direnis', 'Hafiza', 'Isik', 'Kapi',
    ]
    const theme = themes[dayNumber % themes.length]

    return {
      title: `GUN ${dayNumber}: ${theme}`,
      source: 'campaign',
      relevance: 90,
      reason: `Bugunku kampanya temasi`,
    }
  } catch {
    return null
  }
}

// ── Combined Suggestions ──

export async function getTopicSuggestions(
  apiFn: (path: string) => Promise<{ items: RadarItem[] }>,
  currentStyle: StyleProfile | null,
): Promise<TopicSuggestion[]> {
  const [radar, styleTopics, campaign] = await Promise.all([
    fetchRadarTopics(apiFn),
    Promise.resolve(analyzeStyleTopics(currentStyle)),
    Promise.resolve(getCampaignTopic()),
  ])

  const suggestions: TopicSuggestion[] = []

  // Campaign theme first (always relevant)
  if (campaign) suggestions.push(campaign)

  // Style-matched radar topics (if style word appears in radar title)
  const styleWords = new Set(styleTopics.map(s => s.title))
  const matchedRadar = radar.filter(r =>
    styleWords.has(r.title.toLowerCase()) ||
    [...styleWords].some(sw => r.title.toLowerCase().includes(sw))
  )
  matchedRadar.forEach(r => {
    r.relevance = Math.min(100, r.relevance + 30)
    r.reason = 'Gundem + stil eslesmesi'
  })
  suggestions.push(...matchedRadar)

  // Top radar (not matched)
  const matchedTitles = new Set(matchedRadar.map(m => m.title))
  suggestions.push(...radar.filter(r => !matchedTitles.has(r.title)).slice(0, 3))

  // Style themes (unique)
  suggestions.push(...styleTopics.slice(0, 3))

  // Deduplicate and sort by relevance
  const seen = new Set<string>()
  return suggestions.filter(s => {
    const key = s.title.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => b.relevance - a.relevance).slice(0, 8)
}
