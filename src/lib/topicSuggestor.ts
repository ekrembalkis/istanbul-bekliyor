// Topic suggestion engine: serverless Gemini extraction + campaign theme

import { getDayPlan } from '../data/campaign'
import { getDayCount } from './utils'
import type { StyleProfile } from './xquik'

export interface TopicTweet {
  text: string
  likeCount: number
  retweetCount: number
  author: string
}

export interface TopicSuggestion {
  title: string
  source: 'live' | 'campaign'
  relevance: number
  reason: string
  context?: string
  tweets?: TopicTweet[]
}

function getCampaignTopic(): TopicSuggestion {
  const day = getDayCount()
  const plan = getDayPlan(day)
  return {
    title: `GUN ${day}: ${plan.theme}`,
    source: 'campaign',
    relevance: 90,
    reason: 'Bugünkü kampanya teması',
  }
}

export const TOPIC_CATEGORIES = [
  { key: 'tumu', label: 'Tümü' },
  { key: 'siyaset', label: 'Siyaset' },
  { key: 'gundem', label: 'Gündem' },
  { key: 'ekonomi', label: 'Ekonomi' },
  { key: 'teknoloji', label: 'Teknoloji' },
  { key: 'spor', label: 'Spor' },
  { key: 'bilim', label: 'Bilim' },
  { key: 'kultur', label: 'Kültür' },
] as const

export type TopicCategory = typeof TOPIC_CATEGORIES[number]['key']

export async function getTopicSuggestions(
  _apiFn: unknown,
  _currentStyle: StyleProfile | null,
  category: TopicCategory = 'siyaset',
): Promise<TopicSuggestion[]> {
  const campaign = getCampaignTopic()

  // Fetch live topics from serverless endpoint (Radar + X Search + Gemini)
  try {
    const res = await fetch(`/api/extract-topics?category=${category}`)
    if (res.ok) {
      const data = await res.json()
      const live: TopicSuggestion[] = (data.topics || []).map((t: TopicSuggestion) => ({
        ...t,
        source: 'live' as const,
      }))
      return [campaign, ...live].slice(0, 7)
    }
  } catch { /* fallback to campaign only */ }

  return [campaign]
}
