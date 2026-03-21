// Topic suggestion engine: X Tweet Search (live) + Campaign context

import { getDayPlan } from '../data/campaign'
import { getDayCount } from './utils'
import type { StyleProfile } from './xquik'

export interface TopicSuggestion {
  title: string
  source: 'live' | 'campaign'
  relevance: number
  reason: string
}

// ── X Tweet Search: Real-time trending topics ──

interface SearchTweet {
  text: string
  likeCount?: number
  viewCount?: number
  author?: { username: string }
}

const SEARCH_QUERIES = [
  'imamoğlu OR "istanbul belediye" lang:tr',
  'demokrasi OR adalet OR özgürlük lang:tr -filter:replies',
  'tutuklu OR mahkeme OR "ibb davası" lang:tr',
]

async function fetchLiveTopics(
  searchFn: (query: string) => Promise<{ tweets: SearchTweet[] }>
): Promise<TopicSuggestion[]> {
  const suggestions: TopicSuggestion[] = []
  const seen = new Set<string>()

  for (const query of SEARCH_QUERIES) {
    try {
      const data = await searchFn(query)
      const tweets = (data.tweets || [])
        .filter(t => (t.likeCount || 0) > 500) // only high-engagement
        .slice(0, 3)

      for (const tweet of tweets) {
        // Extract a usable topic from the tweet (first meaningful sentence)
        const clean = tweet.text
          .replace(/https?:\/\/\S+/g, '')
          .replace(/@\S+/g, '')
          .replace(/#\S+/g, '')
          .replace(/RT\s+/g, '')
          .trim()

        const fragment = clean.split(/[.\n!]/).filter(s => s.trim().length > 20)[0]?.trim()
        if (!fragment) continue

        // Truncate to reasonable topic length
        const topic = fragment.length > 80 ? fragment.substring(0, 77) + '...' : fragment

        const key = topic.toLowerCase().substring(0, 30)
        if (seen.has(key)) continue
        seen.add(key)

        suggestions.push({
          title: topic,
          source: 'live',
          relevance: Math.min(95, 60 + Math.round((tweet.likeCount || 0) / 500)),
          reason: `${(tweet.likeCount || 0).toLocaleString()} begeni · @${tweet.author?.username || '?'}`,
        })
      }
    } catch {
      // Search may require subscription — skip silently
    }
  }

  return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 5)
}

// ── Campaign Theme (today) ──

function getCampaignTopic(): TopicSuggestion {
  const day = getDayCount()
  const plan = getDayPlan(day)
  return {
    title: `GUN ${day}: ${plan.theme}`,
    source: 'campaign',
    relevance: 90,
    reason: 'Bugunku kampanya temasi',
  }
}

// ── Combined Suggestions ──

export async function getTopicSuggestions(
  _apiFn: unknown, // kept for interface compat, not used
  _currentStyle: StyleProfile | null,
  searchFn?: (query: string) => Promise<{ tweets: SearchTweet[] }>
): Promise<TopicSuggestion[]> {
  const campaign = getCampaignTopic()
  const live = searchFn ? await fetchLiveTopics(searchFn) : []

  return [campaign, ...live].slice(0, 7)
}
