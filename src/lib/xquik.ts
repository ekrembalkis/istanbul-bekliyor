// All calls go through /api/xquik proxy (keeps API key server-side)
const PROXY_BASE = '/api/xquik'

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

export interface ScoreResult {
  passed: boolean
  passedCount: number
  totalChecks: number
  topSuggestion: string
  intentUrl: string
  checklist: { factor: string; passed: boolean }[]
}

export interface ComposeRefineResult {
  compositionGuidance: string[]
  examplePatterns: { pattern: string; description: string }[]
  intentUrl: string
  nextStep: string
}

// ── Core API Caller ──
async function api<T = unknown>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const method = options?.method || 'GET'

  // Always proxy through server-side — API key stays on server
  const url = `${PROXY_BASE}?path=${encodeURIComponent(path)}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    // Include both error code and message so callers can match on either
    const code = err.error || ''
    const message = err.message || res.statusText
    throw new Error(code ? `[${code}] ${message}` : message)
  }

  if (res.status === 204) return {} as T
  return res.json()
}

// ── Style Operations ──

/** Analyze a user's writing style from their recent tweets */
export async function analyzeStyle(username: string): Promise<StyleProfile> {
  return api<StyleProfile>('/styles', {
    method: 'POST',
    body: { username: username.replace('@', '') }
  })
}

/** Get a cached style profile */
export async function getStyleFromAPI(username: string): Promise<StyleProfile> {
  return api<StyleProfile>(`/styles/${encodeURIComponent(username.replace('@', ''))}`)
}

/** List all cached styles */
export async function listStyles(): Promise<{ styles: StyleProfile[] }> {
  return api<{ styles: StyleProfile[] }>('/styles')
}

/** Save custom tweets as a style (FREE) */
export async function saveCustomStyle(username: string, label: string, tweets: string[]): Promise<StyleProfile> {
  return api<StyleProfile>(`/styles/${encodeURIComponent(username.replace('@', ''))}`, {
    method: 'PUT',
    body: {
      label,
      tweets: tweets.map(text => ({ text }))
    }
  })
}

/** Delete a cached style */
export async function deleteStyleFromAPI(username: string): Promise<void> {
  await api(`/styles/${encodeURIComponent(username.replace('@', ''))}`, { method: 'DELETE' })
}

// ── Compose Operations ──

/** Step 1: Get composition guidance with style matching */
export async function composeRefine(opts: {
  topic: string
  tone: string
  goal: string
  styleUsername?: string
  mediaType?: string
}): Promise<ComposeRefineResult> {
  return api<ComposeRefineResult>('/compose', {
    method: 'POST',
    body: {
      step: 'refine',
      topic: opts.topic,
      tone: opts.tone,
      goal: opts.goal,
      styleUsername: opts.styleUsername?.replace('@', ''),
      mediaType: opts.mediaType || 'photo',
    }
  })
}

/** Step 2: Score a draft tweet against 11 algorithm checks */
export async function scoreDraft(draft: string, hasMedia = true): Promise<ScoreResult> {
  return api<ScoreResult>('/compose', {
    method: 'POST',
    body: {
      step: 'score',
      draft,
      hasMedia,
      hasLink: false,
    }
  })
}

// ── Tweet Search ──
export async function searchTweets(query: string, limit = 50): Promise<{ tweets: StyleTweet[] }> {
  return api<{ tweets: StyleTweet[] }>(`/x/tweets/search?q=${encodeURIComponent(query)}&limit=${limit}`)
}

// ── User Lookup ──
export interface XUser {
  id: string
  username: string
  name: string
  followers?: number
  following?: number
  verified?: boolean
  description?: string
  profilePicture?: string
  statusesCount?: number
}

export async function lookupUser(username: string): Promise<XUser> {
  return api<XUser>(`/x/users/${encodeURIComponent(username.replace('@', ''))}`)
}

// ── Deep Style Analysis (Extraction API) ──

export interface ExtractionJob {
  id: string
  status: 'running' | 'completed' | 'failed'
  totalResults?: number
}

export interface ExtractionTweet {
  tweetId: string
  tweetText: string
  tweetCreatedAt: string
  xUsername: string
  xDisplayName: string
  xProfileImageUrl: string
  xFollowersCount: number
}

/** Start deep extraction for a user's best tweets */
export async function startDeepAnalysis(username: string, opts?: {
  minFaves?: number
  language?: string
  resultsLimit?: number
}): Promise<ExtractionJob> {
  const clean = username.replace('@', '')
  return api<ExtractionJob>('/extractions', {
    method: 'POST',
    body: {
      toolType: 'tweet_search_extractor',
      searchQuery: `from:${clean}`,
      fromUser: clean,
      resultsLimit: opts?.resultsLimit ?? 200,
      replies: 'exclude',
      retweets: 'exclude',
      minFaves: opts?.minFaves ?? 50,
      language: opts?.language,
    }
  })
}

/** Poll extraction job status */
export async function getExtractionJob(jobId: string): Promise<{ job: ExtractionJob; results: ExtractionTweet[]; hasMore: boolean; nextCursor?: string }> {
  return api(`/extractions/${jobId}`, { method: 'GET' })
}

/** Get all extraction results with pagination */
export async function getAllExtractionResults(jobId: string): Promise<ExtractionTweet[]> {
  const all: ExtractionTweet[] = []
  let cursor: string | undefined
  for (let page = 0; page < 10; page++) {
    const path = cursor
      ? `/extractions/${jobId}?limit=50&after=${cursor}`
      : `/extractions/${jobId}?limit=50`
    const res = await api<{ results: ExtractionTweet[]; hasMore: boolean; nextCursor?: string }>(path)
    all.push(...(res.results || []))
    if (!res.hasMore || !res.nextCursor) break
    cursor = res.nextCursor
  }
  return all
}

/** Filter extraction results and save as curated style (overwrites existing) */
export async function saveCuratedStyle(username: string, tweets: ExtractionTweet[]): Promise<StyleProfile> {
  const clean = username.replace('@', '')
  // Filter: no replies, min 30 chars
  const curated = tweets
    .filter(t => !t.tweetText.startsWith('@') && t.tweetText.length > 30)
    .map(t => ({ text: t.tweetText }))

  // First do basic POST /styles to register the username, then overwrite with curated data
  try { await api('/styles', { method: 'POST', body: { username: clean } }) } catch { /* may fail, ok */ }

  return api<StyleProfile>(`/styles/${encodeURIComponent(clean)}`, {
    method: 'PUT',
    body: { label: clean, tweets: curated }
  })
}

// ── Monitor & Webhook (Live Updates) ──

export interface Monitor {
  id: string
  username: string
  xUsername?: string
  eventTypes: string[]
  isActive: boolean
  createdAt: string
}

export interface Webhook {
  id: string
  url: string
  eventTypes: string[]
  isActive: boolean
  secret?: string
}

/** Create a monitor for new tweets from a user */
export async function createMonitor(username: string): Promise<Monitor> {
  return api<Monitor>('/monitors', {
    method: 'POST',
    body: {
      username: username.replace('@', ''),
      eventTypes: ['tweet.new'],
    }
  })
}

/** List active monitors */
export async function listMonitors(): Promise<{ monitors: Monitor[] }> {
  return api<{ monitors: Monitor[] }>('/monitors')
}

/** Delete a monitor */
export async function deleteMonitor(id: string): Promise<void> {
  await api(`/monitors/${id}`, { method: 'DELETE' })
}

/** Create webhook for style auto-update */
export async function createWebhook(callbackUrl: string): Promise<Webhook> {
  return api<Webhook>('/webhooks', {
    method: 'POST',
    body: {
      url: callbackUrl,
      eventTypes: ['tweet.new'],
    }
  })
}

/** List webhooks */
export async function listWebhooks(): Promise<{ webhooks: Webhook[] }> {
  return api<{ webhooks: Webhook[] }>('/webhooks')
}

/** Delete webhook */
export async function deleteWebhook(id: string): Promise<void> {
  await api(`/webhooks/${id}`, { method: 'DELETE' })
}

// ── Auto Tweet Generation ──

export interface GeneratedTweet {
  tweet: string
  score: { passed: boolean; count: number; total: number; checklist?: { factor: string; passed: boolean }[] } | null
  attempts: number
  styleOverrides?: string[]
  styleMatch?: number | null
}

export interface GenerateResult {
  style: string
  topic: string
  tone: string
  goal: string
  tweets: GeneratedTweet[]
  geminiUsage?: { promptTokens: number; completionTokens: number; totalTokens: number; calls: number }
  dataQuality?: 'high' | 'medium' | 'low'
  tweetCount?: number
  warnings?: string[]
}

/** Generate tweets in a given style using Gemini + score loop */
export async function generateTweet(opts: {
  styleUsername: string
  topic?: string
  tone?: string
  goal?: string
  count?: number
  cloneMode?: boolean
  topicContext?: string
  mode?: 'tweet' | 'quote' | 'reply' | 'thread'
  quoteTweetText?: string
  quoteTweetAuthor?: string
  lengthHint?: string
  personalityDNA?: PersonalityDNA
  styleSummary?: string
  fingerprint?: import('./styleFingerprint').StyleFingerprint
  previousTweets?: string[]
}): Promise<GenerateResult> {
  const res = await fetch('/api/generate-tweet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      styleUsername: opts.styleUsername.replace('@', ''),
      topic: opts.topic || '',
      tone: opts.tone || 'sarkastik, samimi',
      goal: opts.goal || 'engagement',
      count: opts.count || 3,
      cloneMode: opts.cloneMode ?? true,
      topicContext: opts.topicContext,
      mode: opts.mode || 'tweet',
      quoteTweetText: opts.quoteTweetText,
      quoteTweetAuthor: opts.quoteTweetAuthor,
      lengthHint: opts.lengthHint,
      personalityDNA: opts.personalityDNA,
      styleSummary: opts.styleSummary,
      fingerprint: opts.fingerprint,
      previousTweets: opts.previousTweets || [],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Generate failed: ${res.status}`)
  }

  return res.json()
}

// ── Rewrite (user's text → target profile's style) ──

export interface RewriteResult {
  rewrites: string[]
  language: string
  usage?: { inputTokens: number; outputTokens: number }
}

/** Rewrite the user's existing text in the target profile's voice. Meaning preserved, style changed. */
export async function rewriteTweet(opts: {
  styleUsername: string
  userText: string
  count?: number
}): Promise<RewriteResult> {
  const res = await fetch('/api/rewrite-tweet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      styleUsername: opts.styleUsername.replace('@', ''),
      userText: opts.userText,
      count: opts.count ?? 3,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Rewrite failed: ${res.status}`)
  }

  return res.json()
}

// ── Radar (Trending Topics) ──

export interface RadarItem {
  title: string
  source: string
  score: number
  category: string
  region: string
}

/** Fetch trending topics from radar */
export async function getRadarTopics(region = 'TR', hours = 24, limit = 15): Promise<{ items: RadarItem[] }> {
  return api<{ items: RadarItem[] }>(`/radar?region=${region}&hours=${hours}&limit=${limit}`)
}

// ── Tweet Lookup ──

export interface TweetInfo {
  id: string
  text: string
  likeCount?: number
  author?: { username: string; name?: string }
}

/** Full tweet metrics for shadow ban detection */
export interface TweetMetrics {
  id: string
  text: string
  likeCount: number
  retweetCount: number
  replyCount: number
  quoteCount: number
  viewCount: number
  bookmarkCount: number
  createdAt: string
}

/** Fetch a tweet with full engagement metrics */
export async function lookupTweetFull(tweetId: string): Promise<{ tweet: TweetMetrics; author?: XUser }> {
  return api<{ tweet: TweetMetrics; author?: XUser }>(`/x/tweets/${tweetId}`)
}

/** Fetch a tweet by ID or URL */
export async function lookupTweet(tweetIdOrUrl: string): Promise<TweetInfo> {
  // Extract ID from URL if needed
  const idMatch = tweetIdOrUrl.match(/status\/(\d+)/)
  const tweetId = idMatch ? idMatch[1] : tweetIdOrUrl.replace(/\D/g, '')
  if (!tweetId || tweetId.length < 10) throw new Error('Geçersiz tweet URL veya ID')

  const raw = await api<{ tweet: { id: string; text: string; likeCount?: number }; author?: { username: string; name?: string } }>(`/x/tweets/${tweetId}`)

  return {
    id: raw.tweet.id,
    text: raw.tweet.text,
    likeCount: raw.tweet.likeCount,
    author: raw.author,
  }
}

// ── Personality DNA ──

export interface PersonalityDNA {
  language?: string
  identity: {
    archetype: string
    worldview: string
    expertise: string[]
  }
  voice: {
    toneSpectrum: string
    openingStyle: string
    closingStyle: string
    signaturePhrases: string[]
    humorStyle: string
  }
  reactions: {
    toGoodNews: string
    toBadNews: string
    toControversy: string
  }
  boundaries: {
    neverDoes: string[]
    alwaysDoes: string[]
  }
  personalityTraits: {
    formality: number
    humor: number
    controversy: number
    empathy: number
    authenticity: number
  }
  topicProfiles?: {
    topic: string
    tone: string
    behavior: string
    typicalReaction: string
  }[]
  cognitiveFilters?: string[]
  narrativeTechniques?: string[]
  ironyTechniques?: string[]
  slangPatterns?: string[]
  ironyExamples?: string[]
  contextualBehavior?: {
    whenHappy: string
    whenAngry: string
    whenBored: string
  }
  version?: number
  analyzedTweetCount?: number
}

/** Extract personality DNA from tweets via Gemini */
export async function analyzePersonality(tweets: string[]): Promise<{ dna: PersonalityDNA; geminiUsage: { promptTokens: number; completionTokens: number; totalTokens: number; calls: number } }> {
  const res = await fetch('/api/analyze-personality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tweets }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'DNA analizi başarısız')
  }

  return res.json()
}

/** Generate a comprehensive style summary from tweets via Gemini */
export async function generateStyleSummary(tweets: string[], username: string, language?: string): Promise<{ summary: string; geminiUsage: { promptTokens: number; completionTokens: number; totalTokens: number; calls: number } }> {
  const res = await fetch('/api/generate-style-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tweets, username, language }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Stil özeti oluşturulamadı')
  }

  return res.json()
}

// ── Account & Usage ──

export interface XquikAccount {
  plan: string // "active" | "inactive" | etc
  pricingVersion: number
  currentPeriod: {
    start: string
    end: string
    usagePercent: number
  }
  monitorsAllowed: number
  monitorsUsed: number
}

/** Fetch Xquik account info including subscription and usage */
export async function getAccount(): Promise<XquikAccount> {
  return api<XquikAccount>('/account')
}

// ── X Account Connection ──

export interface XAccount {
  id: string
  xUserId: string
  xUsername: string
  status: string
  createdAt?: string
}

/** List connected X accounts */
export async function getConnectedAccounts(): Promise<{ accounts: XAccount[] }> {
  return api<{ accounts: XAccount[] }>('/x/accounts')
}

/** Connect an X account */
export async function connectXAccount(opts: {
  username: string
  email: string
  password: string
  totp_secret?: string
}): Promise<XAccount> {
  return api<XAccount>('/x/accounts', {
    method: 'POST',
    body: {
      username: opts.username.replace('@', ''),
      email: opts.email,
      password: opts.password,
      ...(opts.totp_secret ? { totp_secret: opts.totp_secret } : {}),
    }
  })
}

/** Disconnect an X account */
export async function disconnectXAccount(id: string): Promise<void> {
  await api(`/x/accounts/${id}`, { method: 'DELETE' })
}

// ── Tweet Publishing ──

export interface PublishResult {
  tweetId: string
  success: boolean
}

/** Publish a tweet to X (retries on 503 transient errors) */
export async function publishTweet(account: string, text: string, opts?: {
  reply_to_tweet_id?: string
  media_ids?: string[]
}): Promise<PublishResult> {
  const body = { account: account.replace('@', ''), text, ...opts }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await api<PublishResult>('/x/tweets', { method: 'POST', body })
    } catch (e: any) {
      const isRetryable = e.message?.includes('Temporary') || e.message?.includes('503') || e.message?.includes('transient')
      if (isRetryable && attempt < 2) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)))
        continue
      }
      throw e
    }
  }
  throw new Error('Tweet gönderilemedi — 3 deneme başarısız')
}

/** Delete a published tweet */
export async function deletePublishedTweet(tweetId: string, account: string): Promise<void> {
  await api(`/x/tweets/${tweetId}`, {
    method: 'DELETE',
    body: { account: account.replace('@', '') }
  })
}

// ── Automations ──

export interface AutomationFlow {
  id: string
  name: string
  triggerType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  steps?: AutomationStep[]
  recentRuns?: AutomationRun[]
}

export interface AutomationStep {
  id: string
  stepType: string
  actionType?: string
  branch: string
  position: number
  config?: Record<string, unknown>
}

export interface AutomationRun {
  id: string
  status: string
  startedAt: string
  completedAt?: string
}

/** List automation flows */
export async function listAutomations(): Promise<{ items: AutomationFlow[] }> {
  return api<{ items: AutomationFlow[] }>('/automations')
}

/** Get automation flow details */
export async function getAutomation(id: string): Promise<AutomationFlow> {
  return api<AutomationFlow>(`/automations/${id}`)
}

/** Create automation flow */
export async function createAutomation(opts: {
  name: string
  triggerType: string
  triggerConfig?: Record<string, unknown>
  steps?: Array<{ stepType: string; actionType?: string; branch: string; config?: Record<string, unknown> }>
  xAccountId?: string
}): Promise<AutomationFlow> {
  return api<AutomationFlow>('/automations', { method: 'POST', body: opts })
}

/** Update automation flow (activate/deactivate/rename) */
export async function updateAutomation(id: string, opts: {
  expectedUpdatedAt: string
  isActive?: boolean
  name?: string
  triggerType?: string
  triggerConfig?: Record<string, unknown>
}): Promise<AutomationFlow> {
  return api<AutomationFlow>(`/automations/${id}`, { method: 'PATCH', body: opts })
}

/** Delete automation flow */
export async function deleteAutomation(id: string): Promise<void> {
  await api(`/automations/${id}`, { method: 'DELETE' })
}

/** Add step to automation flow */
export async function addAutomationStep(flowId: string, opts: {
  stepType: string
  actionType?: string
  branch: string
  config?: Record<string, unknown>
}): Promise<{ created: AutomationStep; steps: AutomationStep[] }> {
  return api(`/automations/${flowId}/steps`, { method: 'POST', body: opts })
}

/** Test run automation flow */
export async function testAutomation(id: string): Promise<{ runId: string }> {
  return api<{ runId: string }>(`/automations/${id}/test`, { method: 'POST' })
}

// ── Helpers ──

/** Validate X username format: 1-15 chars, only [A-Za-z0-9_] */
export function isValidXUsername(name: string): boolean {
  return /^[A-Za-z0-9_]{1,15}$/.test(name)
}

/** Proxy Twitter profile images through our server to bypass tracking prevention */
export function proxyImageUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return ''
  // Upgrade to higher resolution
  const upgraded = url.replace('_normal', '_200x200')
  // Always proxy through server to bypass tracking prevention
  return `/api/image-proxy?url=${encodeURIComponent(upgraded)}`
}

// ── Local Storage for Drafts ──
export interface Draft {
  id: string
  text: string
  topic: string
  styleUsername: string
  score?: number
  scoreChecklist?: { factor: string; passed: boolean }[]
  createdAt: string
}

const DRAFTS_KEY = 'ib_drafts'

export function getSavedDrafts(): Draft[] {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]') } catch { return [] }
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

/** Check if API is ready (proxy handles auth server-side) */
export function hasApiKey(): boolean {
  return true // Serverless proxy handles API key
}
