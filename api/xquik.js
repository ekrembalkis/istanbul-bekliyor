import { setCorsHeaders } from './lib/cors.js'

export default async function handler(req, res) {
  setCorsHeaders(req, res)

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const apiKey = process.env.XQUIK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'XQUIK_API_KEY not configured' })
  }

  // Extract the path after /api/xquik
  // req.url = /api/xquik?path=/styles&method=POST
  const { path, ...queryParams } = req.query
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' })
  }

  const method = req.method
  const url = `https://xquik.com/api/v1${path}`

  try {
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    }

    if (method !== 'GET' && method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body)
    }

    const response = await fetch(url, fetchOptions)

    if (response.status === 204) {
      return res.status(204).end()
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const text = await response.text()
      return res.status(response.status || 502).json({
        error: `Xquik returned non-JSON (${response.status})`,
        detail: text.substring(0, 200),
      })
    }

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Proxy error' })
  }
}
