// Serverless viral tweet search by category
// GET /api/search-viral?category=siyaset&limit=8

const CATEGORY_QUERIES = {
  siyaset: 'imamoğlu OR adalet OR demokrasi OR meclis lang:tr -filter:replies',
  gundem: 'gündem OR son dakika OR Türkiye lang:tr -filter:replies',
  ekonomi: 'ekonomi OR dolar OR enflasyon OR borsa lang:tr -filter:replies',
  teknoloji: 'yapay zeka OR teknoloji OR yazılım lang:tr -filter:replies',
  spor: 'süper lig OR galatasaray OR fenerbahçe OR beşiktaş lang:tr -filter:replies',
  bilim: 'bilim OR uzay OR araştırma OR NASA lang:tr -filter:replies',
  kultur: 'sinema OR müzik OR kitap OR dizi lang:tr -filter:replies',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const XQUIK_KEY = process.env.XQUIK_API_KEY
  if (!XQUIK_KEY) return res.status(500).json({ error: 'XQUIK_API_KEY not configured' })

  const { category = 'siyaset', limit = '8' } = req.query || {}
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const baseQuery = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.siyaset
  const query = `${baseQuery} since:${today}`
  const maxResults = Math.min(parseInt(limit) || 8, 20)

  try {
    const searchRes = await fetch(
      `https://xquik.com/api/v1/x/tweets/search?q=${encodeURIComponent(query)}&limit=${maxResults * 2}&queryType=Top`,
      { headers: { 'x-api-key': XQUIK_KEY } }
    )

    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}))
      return res.status(searchRes.status).json({ error: err.error || 'Tweet search failed', tweets: [] })
    }

    const data = await searchRes.json()
    const tweets = (data.tweets || [])
      .filter(t => (t.likeCount || 0) > 10 && t.text && t.text.length > 20)
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      .slice(0, maxResults)
      .map(t => ({
        id: t.id,
        text: t.text.replace(/https?:\/\/\S+/g, '').trim(),
        author: t.author?.username || t.authorUsername || '',
        likeCount: t.likeCount || 0,
        retweetCount: t.retweetCount || 0,
        replyCount: t.replyCount || 0,
      }))

    return res.status(200).json({ tweets, category, query })
  } catch (error) {
    console.error('Search viral error:', error)
    return res.status(500).json({ error: 'Search failed', detail: error.message, tweets: [] })
  }
}
