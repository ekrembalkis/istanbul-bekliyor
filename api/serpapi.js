// SerpAPI image search proxy — server-side key, no client exposure
// GET /api/serpapi?q=search+terms&num=10

const BLOCKED_DOMAINS = [
  'wikia.nocookie.net', 'fandom.com', 'pinterest.com', 'instagram.com',
  'facebook.com', 'fbsbx.com', 'fbcdn.net', 'lookaside.fbsbx.com',
  'tiktok.com', 'twitter.com', 'twimg.com', 'reddit.com',
  'deviantart.com', 'artstation.com', 'behance.net', 'dribbble.com',
  'linkedin.com', 'amazon.com', 'ebay.com', 'etsy.com',
  'aliexpress.com', 'alibaba.com',
]

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'SERPAPI_KEY not configured' })
  }

  const q = req.query.q || ''
  const num = req.query.num || '10'

  if (!q || String(q).trim().length < 2) {
    return res.status(400).json({ error: 'Query too short (min 2 chars)' })
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google_images',
      q: String(q).trim(),
      num: String(num),
      safe: 'active',
    })

    const response = await fetch(`https://serpapi.com/search.json?${params}`)

    if (!response.ok) {
      const errText = await response.text()
      return res.status(response.status).json({
        error: `SerpAPI error: ${response.status}`,
        details: errText.substring(0, 200),
      })
    }

    const data = await response.json()

    if (data.error) {
      return res.status(400).json({ error: data.error })
    }

    const images = (data.images_results || []).filter((img) => {
      const url = img.original || ''
      return !BLOCKED_DOMAINS.some((domain) => url.includes(domain))
    })

    return res.status(200).json({ images_results: images })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Proxy request failed' })
  }
}
