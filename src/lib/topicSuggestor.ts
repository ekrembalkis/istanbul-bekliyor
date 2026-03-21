// Topic suggestion engine: X Tweet Search (live) + Campaign context

import { getDayPlan } from '../data/campaign'
import { getDayCount } from './utils'
import type { StyleProfile } from './xquik'

export interface TopicSuggestion {
  title: string
  source: 'live' | 'campaign'
  relevance: number
  reason: string
  context?: string  // full tweet texts for Gemini context
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

/** Extract a short topic (3-6 words) from tweet text */
function extractTopic(text: string): string | null {
  const clean = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/@\S+/g, '')
    .replace(/#\S+/g, '')
    .replace(/RT\s+/g, '')
    .replace(/["""'']/g, '')
    .trim()

  // Try known patterns to extract short topic
  const patterns: RegExp[] = [
    // "X hakkında Y" → "X hakkında Y"
    /(\S+\s+hakkında\s+\S+(?:\s+\S+)?)/i,
    // "X davası" → "X davası"
    /([\wçğıöşüÇĞİÖŞÜ]+\s+davası)/i,
    // "X tutuklandı/tutuklanması" → topic around tutuklama
    /([\wçğıöşüÇĞİÖŞÜ]+\s+tutuklan\S*)/i,
    // "X'in Y'si" → proper noun topic
    /([\wçğıöşüÇĞİÖŞÜ]+['']?[iı]n\s+[\wçğıöşüÇĞİÖŞÜ]+['']?[iısü])/i,
  ]

  for (const pat of patterns) {
    const match = clean.match(pat)
    if (match && match[1].length > 5 && match[1].length < 40) {
      return match[1].trim()
    }
  }

  // Fallback: first 4-6 meaningful words
  const words = clean.split(/\s+/).filter(w => w.length > 2)
  if (words.length >= 3) {
    const topic = words.slice(0, 5).join(' ')
    if (topic.length > 10 && topic.length < 50) return topic
  }

  return null
}

/** Group tweets by topic similarity and return best per group */
function groupAndLabel(tweets: (SearchTweet & { topic: string })[]): TopicSuggestion[] {
  // Simple grouping: if two topics share 2+ words, they're the same topic
  const groups: { topic: string; tweets: typeof tweets }[] = []

  for (const t of tweets) {
    const tWords = new Set(t.topic.toLowerCase().split(/\s+/))
    let matched = false
    for (const g of groups) {
      const gWords = new Set(g.topic.toLowerCase().split(/\s+/))
      const overlap = [...tWords].filter(w => gWords.has(w) && w.length > 3).length
      if (overlap >= 2) {
        g.tweets.push(t)
        matched = true
        break
      }
    }
    if (!matched) {
      groups.push({ topic: t.topic, tweets: [t] })
    }
  }

  return groups
    .sort((a, b) => {
      const aMax = Math.max(...a.tweets.map(t => t.likeCount || 0))
      const bMax = Math.max(...b.tweets.map(t => t.likeCount || 0))
      return bMax - aMax
    })
    .slice(0, 5)
    .map(g => {
      const sorted = g.tweets.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      const best = sorted[0]
      // Build context: top 3 tweets in this topic group (full text for Gemini)
      const context = sorted.slice(0, 3)
        .map(t => t.text.replace(/https?:\/\/\S+/g, '').trim())
        .filter(t => t.length > 20)
        .join('\n---\n')
      return {
        title: g.topic,
        source: 'live' as const,
        relevance: Math.min(95, 60 + Math.round((best.likeCount || 0) / 500)),
        reason: `${g.tweets.length} tweet · ${(best.likeCount || 0).toLocaleString()} begeni`,
        context,
      }
    })
}

async function fetchLiveTopics(
  searchFn: (query: string) => Promise<{ tweets: SearchTweet[] }>
): Promise<TopicSuggestion[]> {
  const allWithTopics: (SearchTweet & { topic: string })[] = []

  for (const query of SEARCH_QUERIES) {
    try {
      const data = await searchFn(query)
      const tweets = (data.tweets || [])
        .filter(t => (t.likeCount || 0) > 300)
        .slice(0, 5)

      for (const tweet of tweets) {
        const topic = extractTopic(tweet.text)
        if (topic) {
          allWithTopics.push({ ...tweet, topic })
        }
      }
    } catch {
      // Search may require subscription
    }
  }

  return groupAndLabel(allWithTopics)
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
  _apiFn: unknown,
  _currentStyle: StyleProfile | null,
  searchFn?: (query: string) => Promise<{ tweets: SearchTweet[] }>
): Promise<TopicSuggestion[]> {
  const campaign = getCampaignTopic()
  const live = searchFn ? await fetchLiveTopics(searchFn) : []

  return [campaign, ...live].slice(0, 7)
}
