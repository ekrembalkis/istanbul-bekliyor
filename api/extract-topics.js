// Serverless topic extractor: X Tweet Search → Gemini summarization
// GET /api/extract-topics

import { setCorsHeaders } from './lib/cors.js'

export default async function handler(req, res) {
  setCorsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim()
  const XQUIK_KEY = process.env.XQUIK_API_KEY
  if (!GEMINI_KEY || !XQUIK_KEY) {
    return res.status(500).json({ error: 'API keys not configured' })
  }

  const { category = '' } = req.query || {}

  // Category → radar category mapping + optional X search queries for richer context
  const CATEGORY_MAP = {
    siyaset: { radar: 'politics', queries: ['imamoğlu OR "istanbul belediye" lang:tr', 'demokrasi OR adalet lang:tr -filter:replies'] },
    teknoloji: { radar: 'tech', queries: ['yapay zeka OR teknoloji lang:tr -filter:replies'] },
    ekonomi: { radar: 'business', queries: ['ekonomi OR dolar OR enflasyon lang:tr -filter:replies'] },
    spor: { radar: 'entertainment', queries: ['süper lig OR galatasaray OR fenerbahçe lang:tr -filter:replies'] },
    bilim: { radar: 'science', queries: ['bilim OR uzay OR araştırma lang:tr -filter:replies'] },
    kultur: { radar: 'culture', queries: ['sinema OR müzik OR kitap lang:tr -filter:replies'] },
    gundem: { radar: 'general', queries: ['gündem OR son dakika lang:tr -filter:replies'] },
  }

  const catConfig = CATEGORY_MAP[category] || CATEGORY_MAP.siyaset

  try {
    // 1. Fetch from Xquik Radar (FREE, no subscription needed)
    let radarItems = []
    try {
      const radarRes = await fetch(
        `https://xquik.com/api/v1/radar?region=TR&hours=24&limit=10&category=${catConfig.radar}`,
        { headers: { 'x-api-key': XQUIK_KEY } }
      )
      if (radarRes.ok) {
        const radarData = await radarRes.json()
        radarItems = radarData.items || []
      }
    } catch { /* radar failed, continue with X search */ }

    // 2. Also search X for tweet context (paid, best effort)
    const allTweets = []
    for (const q of catConfig.queries) {
      try {
        const searchRes = await fetch(
          `https://xquik.com/api/v1/x/tweets/search?q=${encodeURIComponent(q)}&limit=5&queryType=Top`,
          { headers: { 'x-api-key': XQUIK_KEY } }
        )
        if (searchRes.ok) {
          const data = await searchRes.json()
          const good = (data.tweets || [])
            .filter(t => (t.likeCount || 0) > 100)
            .slice(0, 4)
          allTweets.push(...good)
        }
      } catch { /* skip failed queries */ }
    }

    // 3. Build topic list from radar items
    if (radarItems.length === 0 && allTweets.length === 0) {
      return res.status(200).json({ topics: [], category: category || 'siyaset' })
    }

    // Use Gemini to merge radar + tweets into clean topic titles
    const radarTitles = radarItems.slice(0, 8).map((r, i) => `${i + 1}. [RADAR] ${r.title}`).join('\n')
    const tweetTexts = allTweets
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      .slice(0, 6)
      .map((t, i) => {
        const clean = t.text.replace(/https?:\/\/\S+/g, '').replace(/@\S+/g, '').trim()
        return `${i + 1}. [TWEET] ${clean.substring(0, 150)}`
      })
      .join('\n')

    const combined = [radarTitles, tweetTexts].filter(Boolean).join('\n\n')

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Asagidaki gundem verilerinden 5 KISA KONU BASLIGI cikar. Her baslik 3-6 kelime, Turkce olmali. Kategori: ${category || 'siyaset'}. Sadece JSON string array dondur.\n\n${combined}\n\nJSON array:` }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
        }),
      }
    )

    if (!geminiRes.ok) {
      // Fallback: use radar titles directly
      const topics = radarItems.slice(0, 5).map(r => ({
        title: r.title,
        source: 'live',
        relevance: Math.min(95, 60 + (r.score || 0)),
        reason: `${r.source} · skor ${r.score || 0}`,
        context: '',
        tweets: [],
      }))
      return res.status(200).json({ topics, category: category || 'siyaset' })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const geminiUsage = {
      promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
      completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
      calls: 1,
    }

    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    let titles = []
    try { titles = JSON.parse(jsonMatch?.[0] || '[]') } catch { titles = [] }

    // 4. Build topics with tweet context
    const topics = titles.slice(0, 5).map((title) => {
      const relatedTweets = allTweets
        .filter(t => {
          const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
          const tweetLower = t.text.toLowerCase()
          return words.some(w => tweetLower.includes(w))
        })
        .slice(0, 3)

      const context = relatedTweets
        .map(t => t.text.replace(/https?:\/\/\S+/g, '').trim())
        .filter(t => t.length > 20)
        .join('\n---\n')

      const bestLikes = relatedTweets.length > 0
        ? Math.max(...relatedTweets.map(t => t.likeCount || 0))
        : 0

      const topTweets = relatedTweets
        .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
        .slice(0, 3)
        .map(t => ({
          text: t.text.replace(/https?:\/\/\S+/g, '').trim(),
          likeCount: t.likeCount || 0,
          retweetCount: t.retweetCount || 0,
          author: t.author?.username || t.username || '',
        }))

      // Match with radar for extra context
      const radarMatch = radarItems.find(r => {
        const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        return words.some(w => r.title.toLowerCase().includes(w))
      })

      return {
        title,
        source: 'live',
        relevance: Math.min(95, 60 + Math.round(bestLikes / 500) + (radarMatch?.score || 0)),
        reason: radarMatch
          ? `${radarMatch.source} · ${relatedTweets.length} tweet`
          : `${relatedTweets.length} tweet · ${bestLikes.toLocaleString()} begeni`,
        context,
        tweets: topTweets,
      }
    })

    return res.status(200).json({ topics, category: category || 'siyaset', geminiUsage })
  } catch (error) {
    console.error('Extract topics error:', error)
    return res.status(200).json({ topics: [] })
  }
}
