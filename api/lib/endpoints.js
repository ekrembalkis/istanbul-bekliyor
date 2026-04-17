// Centralized external service endpoints.
// Defaults load from config.json — override via env vars for staging/testing.

import defaults from './endpoints.defaults.json' with { type: 'json' }

export const XQUIK_BASE_URL = (process.env.XQUIK_BASE_URL || defaults.XQUIK_BASE_URL).trim()
export const GEMINI_BASE_URL = (process.env.GEMINI_BASE_URL || defaults.GEMINI_BASE_URL).trim()
export const GEMINI_MODEL = (process.env.GEMINI_MODEL || defaults.GEMINI_MODEL).trim()
