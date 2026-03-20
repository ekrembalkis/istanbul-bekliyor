export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  // Only allow Twitter image CDN
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'pbs.twimg.com') {
      return res.status(400).json({ error: 'Only pbs.twimg.com URLs are allowed' })
    }
    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTPS URLs are allowed' })
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IstanbulBekliyor/1.0)',
        'Accept': 'image/*',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'

    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    res.setHeader('Content-Type', contentType)

    const buffer = await response.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Image proxy error:', error)
    return res.status(500).json({ error: 'Failed to proxy image' })
  }
}
