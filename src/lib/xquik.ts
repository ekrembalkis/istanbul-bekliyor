// Xquik API proxy — calls go through the backend
// In production, these would go through your own API route to protect keys
// For now, we use the Xquik MCP tool results cached/passed from the panel operator

export interface StyleProfile {
  xUsername: string
  tweetCount: number
  isOwnAccount: boolean
  fetchedAt: string
  tweets: StyleTweet[]
}

export interface StyleTweet {
  id: string
  text: string
  createdAt: string
  authorUsername: string
}

export interface ComposeResult {
  contentRules?: { rule: string }[]
  followUpQuestions?: string[]
  compositionGuidance?: string[]
  examplePatterns?: { pattern: string; description: string }[]
  intentUrl?: string
  nextStep?: string
  styleTweets?: StyleTweet[]
}

export interface ScoreResult {
  passed: boolean
  passedCount: number
  totalChecks: number
  topSuggestion: string
  intentUrl: string
  checklist: { factor: string; passed: boolean }[]
}

// Local storage keys
const STYLES_KEY = 'ib_styles'
const DRAFTS_KEY = 'ib_drafts'

// Style profiles stored locally (from MCP tool results)
export function getSavedStyles(): StyleProfile[] {
  try {
    return JSON.parse(localStorage.getItem(STYLES_KEY) || '[]')
  } catch { return [] }
}

export function saveStyle(style: StyleProfile) {
  const styles = getSavedStyles().filter(s => s.xUsername !== style.xUsername)
  styles.unshift(style)
  localStorage.setItem(STYLES_KEY, JSON.stringify(styles))
}

export function deleteStyle(username: string) {
  const styles = getSavedStyles().filter(s => s.xUsername !== username)
  localStorage.setItem(STYLES_KEY, JSON.stringify(styles))
}

export function getStyle(username: string): StyleProfile | null {
  return getSavedStyles().find(s => s.xUsername === username) || null
}

// Draft management
export interface Draft {
  id: string
  text: string
  topic: string
  styleUsername: string
  score?: number
  scoreChecklist?: { factor: string; passed: boolean }[]
  createdAt: string
}

export function getSavedDrafts(): Draft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]')
  } catch { return [] }
}

export function saveDraft(draft: Draft) {
  const drafts = getSavedDrafts()
  drafts.unshift(draft)
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 50)))
}

export function deleteDraft(id: string) {
  const drafts = getSavedDrafts().filter(d => d.id !== id)
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
}
