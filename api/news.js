import { XMLParser } from 'fast-xml-parser'

const FEEDS = [
  { key: 'aa', label: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=guncel' },
  { key: 'ntv', label: 'NTV', url: 'https://www.ntv.com.tr/gundem.rss' },
  { key: 'cnnturk', label: 'CNN Türk', url: 'https://www.cnnturk.com/feed/rss/all/news' },
  { key: 'diken', label: 'Diken', url: 'https://www.diken.com.tr/feed/' },
  { key: 'bianet', label: 'Bianet', url: 'https://bianet.org/rss/bianet' },
  { key: 'bbc', label: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml' },
  { key: 'sozcu', label: 'Sözcü', url: 'https://www.sozcu.com.tr/rss/tum-haberler.xml' },
  { key: 'cumhuriyet', label: 'Cumhuriyet', url: 'https://www.cumhuriyet.com.tr/rss' },
]

const CATEGORY_KEYWORDS = {
  siyaset: ['siyaset', 'parti', 'meclis', 'seçim', 'oy', 'muhalefet', 'iktidar', 'başbakan', 'cumhurbaşkanı', 'bakan', 'milletvekili', 'anayasa', 'yargı', 'mahkeme', 'dava', 'hükümet', 'tbmm', 'chp', 'akp', 'ak parti', 'mhp', 'hdp', 'dem', 'iyi parti'],
  ekonomi: ['ekonomi', 'dolar', 'euro', 'enflasyon', 'faiz', 'borsa', 'merkez bankası', 'kur', 'ihracat', 'ithalat', 'büyüme', 'işsizlik', 'tüik', 'bütçe', 'vergi', 'zam', 'asgari ücret'],
  dunya: ['dünya', 'abd', 'avrupa', 'rusya', 'ukrayna', 'nato', 'birleşmiş milletler', 'avrupa birliği', 'uluslararası', 'washington', 'brüksel', 'moskova', 'suriye', 'iran', 'gaza', 'israil', 'filistin'],
  teknoloji: ['teknoloji', 'yapay zeka', 'yapay zekâ', 'siber', 'dijital', 'internet', 'yazılım', 'uygulama', 'apple', 'google', 'microsoft', 'startup', 'robot'],
  toplum: ['toplum', 'eğitim', 'sağlık', 'deprem', 'sel', 'afet', 'kadın', 'çocuk', 'göç', 'mülteci', 'üniversite', 'öğrenci', 'hastane', 'doktor'],
  spor: ['spor', 'futbol', 'basketbol', 'galatasaray', 'fenerbahçe', 'beşiktaş', 'trabzonspor', 'süper lig', 'şampiyonlar ligi', 'milli takım', 'olimpiyat', 'tff'],
}

const CAMPAIGN_KEYWORDS = {
  tier1: ['imamoğlu', 'ekrem imamoğlu', 'istanbul büyükşehir', 'ibb başkan'],
  tier2: ['tutuklama', 'tutuklu', 'tahliye', 'beraat', 'savcılık', 'iddianame', 'duruşma', 'hapis', 'cezaevi', 'anayasa mahkemesi', 'aihm', 'siyasi tutuklular'],
  tier3: ['demokrasi', 'özgürlük', 'insan hakları', 'basın özgürlüğü', 'ifade özgürlüğü', 'hukukun üstünlüğü', 'seçilme hakkı', 'siyasi yasak'],
}

const RSS_CATEGORY_MAP = {
  'güncel': 'toplum', 'gündem': 'siyaset', 'siyaset': 'siyaset', 'politika': 'siyaset',
  'ekonomi': 'ekonomi', 'finans': 'ekonomi', 'iş': 'ekonomi', 'piyasa': 'ekonomi',
  'dünya': 'dunya', 'world': 'dunya', 'international': 'dunya',
  'teknoloji': 'teknoloji', 'bilim': 'teknoloji', 'tech': 'teknoloji', 'science': 'teknoloji',
  'spor': 'spor', 'sport': 'spor', 'sports': 'spor',
  'yaşam': 'toplum', 'sağlık': 'toplum', 'eğitim': 'toplum', 'kültür': 'toplum',
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['item', 'entry'].includes(name),
  processEntities: true,
  htmlEntities: true,
})

function stripHtml(html) {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function hashId(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function categorize(title, description, rssCategories) {
  // 1. Try RSS native categories first
  if (rssCategories) {
    const cats = Array.isArray(rssCategories) ? rssCategories : [rssCategories]
    for (const cat of cats) {
      const catStr = (typeof cat === 'string' ? cat : cat?.['#text'] || '').toLowerCase().trim()
      if (RSS_CATEGORY_MAP[catStr]) return RSS_CATEGORY_MAP[catStr]
    }
  }

  // 2. Keyword fallback
  const text = `${title} ${description}`.toLowerCase()
  let bestCategory = 'toplum'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (text.includes(kw)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  return bestCategory
}

function scoreCampaignRelevance(title, description) {
  const text = `${title} ${description}`.toLowerCase()
  let score = 0
  for (const kw of CAMPAIGN_KEYWORDS.tier1) { if (text.includes(kw)) score += 3 }
  for (const kw of CAMPAIGN_KEYWORDS.tier2) { if (text.includes(kw)) score += 2 }
  for (const kw of CAMPAIGN_KEYWORDS.tier3) { if (text.includes(kw)) score += 1 }
  return Math.min(score, 10)
}

function parseDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

function extractImage(item) {
  // Try enclosure
  if (item.enclosure?.['@_url']) return item.enclosure['@_url']
  // Try media:content
  if (item['media:content']?.['@_url']) return item['media:content']['@_url']
  // Try media:thumbnail
  if (item['media:thumbnail']?.['@_url']) return item['media:thumbnail']['@_url']
  // Try description img tag
  const desc = item.description || item.content || ''
  const imgMatch = typeof desc === 'string' ? desc.match(/src="([^"]+)"/) : null
  return imgMatch ? imgMatch[1] : undefined
}

function parseFeed(xml, feedConfig) {
  const result = parser.parse(xml)
  const items = []

  // RSS 2.0: rss.channel.item
  const rssItems = result?.rss?.channel?.item || []
  // Atom: feed.entry
  const atomItems = result?.feed?.entry || []

  const rawItems = rssItems.length > 0 ? rssItems : atomItems
  const isAtom = atomItems.length > 0

  for (const item of rawItems.slice(0, 20)) {
    const title = stripHtml(isAtom ? item.title?.['#text'] || item.title : item.title)
    const description = stripHtml(
      isAtom
        ? item.summary?.['#text'] || item.summary || item.content?.['#text'] || item.content
        : item.description || item['content:encoded']
    ).slice(0, 200)
    const url = isAtom
      ? (item.link?.['@_href'] || item.link)
      : (item.link || item.guid?.['#text'] || item.guid)

    if (!title || !url) continue

    const publishedAt = parseDate(
      isAtom ? (item.published || item.updated) : (item.pubDate || item['dc:date'])
    )

    const rssCategories = item.category
    const category = categorize(title, description, rssCategories)
    const campaignRelevance = scoreCampaignRelevance(title, description)

    items.push({
      id: hashId(url),
      title,
      description,
      url: typeof url === 'string' ? url : url?.['#text'] || '',
      source: feedConfig.key,
      sourceLabel: feedConfig.label,
      publishedAt: publishedAt || new Date().toISOString(),
      category,
      campaignRelevance,
      isCampaignSignal: campaignRelevance >= 3,
      imageUrl: extractImage(item),
    })
  }

  return items
}

async function fetchFeed(feedConfig, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(feedConfig.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'IstanbulBekliyor/1.0 (RSS Reader)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
    })
    clearTimeout(timer)

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const xml = await response.text()
    return { items: parseFeed(xml, feedConfig), status: 'ok' }
  } catch (err) {
    clearTimeout(timer)
    return { items: [], status: 'error', error: err.message }
  }
}

import { setCorsHeaders } from './lib/cors.js'

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { sources, limit } = req.query
  const maxItems = Math.min(parseInt(limit) || 100, 200)

  // Filter feeds by source keys if provided
  const selectedFeeds = sources
    ? FEEDS.filter(f => sources.split(',').includes(f.key))
    : FEEDS

  if (selectedFeeds.length === 0) {
    return res.status(400).json({ error: 'No valid sources specified' })
  }

  try {
    const results = await Promise.allSettled(
      selectedFeeds.map(feed => fetchFeed(feed))
    )

    const allItems = []
    const sourceStatus = {}

    results.forEach((result, i) => {
      const feedKey = selectedFeeds[i].key
      if (result.status === 'fulfilled') {
        sourceStatus[feedKey] = result.value.status
        allItems.push(...result.value.items)
      } else {
        sourceStatus[feedKey] = 'error'
      }
    })

    // Deduplicate by id (URL hash)
    const seen = new Set()
    const unique = []
    for (const item of allItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        unique.push(item)
      }
    }

    // Sort: campaign signals first, then by date
    unique.sort((a, b) => {
      if (a.isCampaignSignal !== b.isCampaignSignal) return b.isCampaignSignal ? 1 : -1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    return res.status(200).json({
      items: unique.slice(0, maxItems),
      fetchedAt: new Date().toISOString(),
      sourceStatus,
    })
  } catch (err) {
    return res.status(500).json({ error: 'RSS fetch failed', message: err.message })
  }
}
