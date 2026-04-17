// Centralized external service endpoints.
// All values MUST be provided via env vars (see .env.example).

function required(name) {
  const v = (process.env[name] || '').trim()
  if (!v) throw new Error(`${name} is not configured. Set it in .env or deployment environment.`)
  return v
}

export const XQUIK_BASE_URL = required('XQUIK_BASE_URL')
export const GEMINI_BASE_URL = required('GEMINI_BASE_URL')
export const GEMINI_MODEL = required('GEMINI_MODEL')
