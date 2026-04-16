// Allowed origins for CORS — configurable via env var
const DEFAULT_ORIGINS = 'http://localhost:5173,http://localhost:4173'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || ''
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}
