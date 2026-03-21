import { useState, useEffect } from 'react'
import { CopyBtn } from '../components/CopyBtn'
import {
  hasApiKey, analyzeStyle, listStyles, getStyleFromAPI, deleteStyleFromAPI, saveCustomStyle,
  composeRefine, scoreDraft, lookupUser, isValidXUsername, proxyImageUrl,
  getSavedDrafts, saveDraft, deleteDraft,
  startDeepAnalysis, getExtractionJob, getAllExtractionResults, saveCuratedStyle,
  createMonitor, listMonitors, deleteMonitor, createWebhook, listWebhooks,
  generateTweet, getRadarTopics, lookupTweet,
} from '../lib/xquik'
import type { StyleProfile, XUser, Draft, ScoreResult, ComposeRefineResult, Monitor, GeneratedTweet } from '../lib/xquik'
import { getLibrary, saveEntry, togglePin, incrementGenerated, addTopic, CATEGORIES } from '../lib/styleLibrary'
import type { StyleLibraryEntry } from '../lib/styleLibrary'
import { getTopicSuggestions } from '../lib/topicSuggestor'
import type { TopicSuggestion } from '../lib/topicSuggestor'

type Tab = 'analyze' | 'compose' | 'drafts'

export default function StyleClone() {
  const [tab, setTab] = useState<Tab>('analyze')
  const apiReady = hasApiKey()

  // ── Analyze ──
  const [username, setUsername] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentStyle, setCurrentStyle] = useState<StyleProfile | null>(null)
  const [userInfo, setUserInfo] = useState<XUser | null>(null)
  const [styles, setStyles] = useState<StyleProfile[]>([])
  const [userCache, setUserCache] = useState<Record<string, XUser>>({})
  const [error, setError] = useState('')

  // ── Deep Analysis ──
  const [deepProgress, setDeepProgress] = useState<string | null>(null)
  const [monitors, setMonitors] = useState<Monitor[]>([])

  // ── Library ──
  const [library, setLibrary] = useState<StyleLibraryEntry[]>([])

  // ── Auto Generation ──
  const [generating, setGenerating] = useState(false)
  const [generatedTweets, setGeneratedTweets] = useState<GeneratedTweet[]>([])

  // ── Topic Suggestions ──
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([])
  const [topicContext, setTopicContext] = useState('')
  const [loadingTopics, setLoadingTopics] = useState(false)

  // ── Manual ──
  const [manualTweets, setManualTweets] = useState('')
  const [showManual, setShowManual] = useState(false)

  // ── Compose ──
  const [composeTopic, setComposeTopic] = useState('')
  const [composeStyle, setComposeStyle] = useState('')
  const [composeTone, setComposeTone] = useState('duygusal, umut dolu')
  const [composeGoal, setComposeGoal] = useState('engagement')
  const [composeDraft, setComposeDraft] = useState('')
  const [cloneMode, setCloneMode] = useState(true)
  const [composeMode, setComposeMode] = useState<'tweet' | 'quote' | 'reply' | 'thread'>('tweet')
  const [quoteTweetUrl, setQuoteTweetUrl] = useState('')
  const [quoteTweetText, setQuoteTweetText] = useState('')
  const [quoteTweetAuthor, setQuoteTweetAuthor] = useState('')
  const [tweetCount, setTweetCount] = useState(3)
  const [lengthHint, setLengthHint] = useState('')
  const [guidance, setGuidance] = useState<ComposeRefineResult | null>(null)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState(false)

  // ── Drafts ──
  const [drafts, setDrafts] = useState<Draft[]>([])

  // Load styles, drafts, monitors, and library on mount
  useEffect(() => {
    setDrafts(getSavedDrafts())
    setLibrary(getLibrary())
    if (apiReady) {
      listStyles().then(res => {
        const s = res.styles || []
        setStyles(s)
        // Fetch profile pictures only for valid X usernames
        s.filter(style => isValidXUsername(style.xUsername)).forEach(style => {
          lookupUser(style.xUsername)
            .then(user => setUserCache(prev => ({ ...prev, [style.xUsername]: user })))
            .catch(() => {})
        })
      }).catch(() => {})
      listMonitors().then(res => setMonitors(res.monitors || [])).catch(() => {})
    }
  }, [])

  // ── Deep Analysis (Extraction → Filter → PUT → Monitor) ──
  const handleAnalyze = async () => {
    if (!username.trim()) return
    const clean = username.replace('@', '')
    setAnalyzing(true)
    setError('')
    setUserInfo(null)
    setCurrentStyle(null)
    setDeepProgress('Kullanici bilgisi aliniyor...')

    // 1. Fetch user info first (free call)
    try {
      const user = await lookupUser(clean)
      setUserInfo(user)
      setUserCache(prev => ({ ...prev, [clean]: user }))
    } catch { /* user info optional */ }

    // 2. Start extraction job
    setDeepProgress('Derin analiz baslatiliyor (en iyi tweetler cekilecek)...')
    try {
      const job = await startDeepAnalysis(clean, { minFaves: 50, language: 'tr', resultsLimit: 200 })
      setDeepProgress(`Extraction calisiyor (job: ${job.id})...`)

      // 3. Poll until complete
      let status = 'running'
      let attempts = 0
      while (status === 'running' && attempts < 30) {
        await new Promise(r => setTimeout(r, 2000))
        const check = await getExtractionJob(job.id)
        status = check.job.status
        if (status === 'completed') {
          setDeepProgress(`${check.job.totalResults} tweet bulundu, filtreleniyor...`)
        } else if (status === 'failed') {
          throw new Error('Extraction basarisiz oldu')
        }
        attempts++
      }

      if (status !== 'completed') throw new Error('Extraction zaman asimina ugradi')

      // 4. Get all results and save as curated style
      const allTweets = await getAllExtractionResults(job.id)
      const filtered = allTweets.filter(t => !t.tweetText.startsWith('@') && t.tweetText.length > 30)
      setDeepProgress(`${filtered.length} kaliteli tweet filtrelendi, stil kaydediliyor...`)

      const style = await saveCuratedStyle(clean, allTweets)
      setCurrentStyle(style)
      ensureLibraryEntry(clean)

      // 5. Refresh styles list
      listStyles().then(res => setStyles(res.styles || [])).catch(() => {})

      // 6. Auto-setup monitor if not exists
      const hasMonitor = monitors.some(m => m.xUsername === clean)
      if (!hasMonitor) {
        setDeepProgress('Canli takip (monitor) ayarlaniyor...')
        try {
          const monitor = await createMonitor(clean)
          setMonitors(prev => [...prev, monitor])

          // Setup webhook if none exists
          const { webhooks } = await listWebhooks()
          const webhookUrl = `${window.location.origin}/api/style-webhook`
          const hasWebhook = webhooks.some(w => w.url === webhookUrl && w.isActive)
          if (!hasWebhook) {
            await createWebhook(webhookUrl)
          }
        } catch (e: any) {
          // Monitor setup is optional, don't block on failure
          console.warn('Monitor setup failed:', e.message)
        }
      }

      setDeepProgress(null)
    } catch (e: any) {
      // Fallback: try basic analysis if extraction fails (e.g. no subscription)
      setDeepProgress('Extraction kullanilamadi, basit analiz deneniyor...')
      try {
        const style = await analyzeStyle(clean)
        setCurrentStyle(style)
        listStyles().then(res => setStyles(res.styles || [])).catch(() => {})
      } catch (e2: any) {
        setError(e2.message || e.message || 'Analiz basarisiz')
      }
      setDeepProgress(null)
    }
    setAnalyzing(false)
  }

  // ── Toggle monitor for a username ──
  const toggleMonitor = async (uname: string) => {
    const existing = monitors.find(m => m.xUsername === uname)
    if (existing) {
      try {
        await deleteMonitor(existing.id)
        setMonitors(prev => prev.filter(m => m.id !== existing.id))
      } catch (e: any) { setError(e.message) }
    } else {
      try {
        const monitor = await createMonitor(uname)
        setMonitors(prev => [...prev, monitor])
        // Ensure webhook exists
        const { webhooks } = await listWebhooks()
        const webhookUrl = `${window.location.origin}/api/style-webhook`
        if (!webhooks.some(w => w.url === webhookUrl && w.isActive)) {
          await createWebhook(webhookUrl)
        }
      } catch (e: any) { setError(e.message) }
    }
  }

  // ── Fetch quote/reply target tweet ──
  const handleFetchQuoteTweet = async () => {
    if (!quoteTweetUrl.trim()) return
    try {
      const tweet = await lookupTweet(quoteTweetUrl)
      setQuoteTweetText(tweet.text || '')
      setQuoteTweetAuthor(tweet.author?.username || '')
    } catch (e: any) {
      setError('Tweet bulunamadi: ' + e.message)
    }
  }

  // ── Auto Generate Tweet ──
  const handleAutoGenerate = async () => {
    if (!composeStyle) return
    if (composeMode === 'tweet' && !composeTopic.trim()) return
    if ((composeMode === 'quote' || composeMode === 'reply') && !quoteTweetText) return
    if (composeMode === 'thread' && !composeTopic.trim()) return

    setGenerating(true)
    setError('')
    setGeneratedTweets([])

    try {
      const result = await generateTweet({
        styleUsername: composeStyle,
        topic: composeTopic,
        tone: composeTone,
        goal: composeGoal,
        count: composeMode === 'thread' ? 1 : tweetCount,
        cloneMode,
        topicContext: topicContext || undefined,
        mode: composeMode,
        quoteTweetText: quoteTweetText || undefined,
        quoteTweetAuthor: quoteTweetAuthor || undefined,
        lengthHint: lengthHint || undefined,
      })
      setGeneratedTweets(result.tweets)
      incrementGenerated(composeStyle)
      addTopic(composeStyle, composeTopic)
      setLibrary(getLibrary())

      // Auto-fill first passing tweet into draft
      const passing = result.tweets.find(t => t.score?.passed)
      if (passing) setComposeDraft(passing.tweet)
    } catch (e: any) {
      setError(e.message || 'Tweet uretimi basarisiz')
    }
    setGenerating(false)
  }

  // ── Load Topic Suggestions ──
  const loadTopicSuggestions = async () => {
    setLoadingTopics(true)
    try {
      const suggestions = await getTopicSuggestions(null, currentStyle)
      setTopicSuggestions(suggestions)
    } catch { /* optional */ }
    setLoadingTopics(false)
  }

  // ── Library: save entry when style is analyzed ──
  const ensureLibraryEntry = (uname: string) => {
    const existing = library.find(e => e.username === uname)
    if (!existing) {
      saveEntry({ username: uname })
      setLibrary(getLibrary())
    }
  }

  // ── Load existing style ──
  const handleLoadStyle = async (uname: string) => {
    try {
      const style = await getStyleFromAPI(uname)
      setCurrentStyle(style)
      setUsername(uname)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Delete style ──
  const handleDeleteStyle = async (uname: string) => {
    try {
      await deleteStyleFromAPI(uname)
      setStyles(prev => prev.filter(s => s.xUsername !== uname))
      if (currentStyle?.xUsername === uname) setCurrentStyle(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Save manual style ──
  const handleSaveManual = async () => {
    const tweets = manualTweets.split('\n---\n').filter(t => t.trim())
    if (tweets.length < 3) { setError('En az 3 tweet örneği gir (--- ile ayır)'); return }
    if (!username.trim()) { setError('Kullanıcı adı gir'); return }

    try {
      const style = await saveCustomStyle(username.replace('@', ''), `${username} stili`, tweets)
      setCurrentStyle(style)
      setManualTweets('')
      setShowManual(false)
      listStyles().then(res => setStyles(res.styles || [])).catch(() => {})
    } catch (e: any) {
      setError(e.message)
    }
  }

  // ── Compose: Get guidance ──
  const handleGetGuidance = async () => {
    if (!composeTopic.trim() || !composeStyle) return
    setLoading(true)
    setError('')
    setScoreResult(null)

    try {
      const result = await composeRefine({
        topic: composeTopic,
        tone: composeTone,
        goal: composeGoal,
        styleUsername: composeStyle,
      })
      setGuidance(result)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ── Compose: Score draft ──
  const handleScore = async () => {
    if (!composeDraft.trim()) return
    setLoading(true)
    setError('')

    try {
      const result = await scoreDraft(composeDraft)
      setScoreResult(result)

      // Auto-save draft
      saveDraft({
        id: `draft_${Date.now()}`,
        text: composeDraft,
        topic: composeTopic,
        styleUsername: composeStyle,
        score: result.passedCount,
        scoreChecklist: result.checklist,
        createdAt: new Date().toISOString()
      })
      setDrafts(getSavedDrafts())
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ═══════════ UI ═══════════
  if (!apiReady) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Stil Klonlama</h1>
        </div>
        <div className="card text-center py-20 px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <div className="text-slate-600 dark:text-slate-300 font-semibold">Xquik API Key Gerekli</div>
          <div className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Stil klonlama için <code className="chip text-brand-red">.env</code> dosyasına Xquik API key ekle.
          </div>
          <div className="mt-6 bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 max-w-sm mx-auto text-left border border-slate-100 dark:border-white/[0.06]">
            <code className="text-xs font-mono text-slate-500 dark:text-slate-400 leading-loose">
              VITE_XQUIK_API_KEY=xq_your_key_here
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header">
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Stil Klonlama</h1>
        <p className="text-sm text-slate-400 mt-1">
          Kullanıcı adı gir → tweetleri otomatik çek → stili kopyala → birebir aynı tonda tweet üret.
        </p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1.5 border-b border-slate-200 dark:border-white/[0.06] pb-0">
        {([
          { key: 'analyze' as Tab, label: 'Profil Analizi', count: styles.length },
          { key: 'compose' as Tab, label: 'Tweet Üret' },
          { key: 'drafts' as Tab, label: 'Taslaklar', count: drafts.length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setError('') }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[1px] ${
              tab === t.key
                ? 'border-brand-red text-brand-red'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-white'
            }`}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 text-[10px] chip py-0 px-1.5">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {error && (
        <div className="card border-l-4 border-l-red-500 p-4 bg-red-50 dark:bg-red-500/5">
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          <button onClick={() => setError('')} className="text-[10px] text-red-400 mt-1 hover:underline">Kapat</button>
        </div>
      )}

      {/* ═══════════ ANALYZE TAB ═══════════ */}
      {tab === 'analyze' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="card p-5">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace('@', ''))}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                  placeholder="kullaniciadi"
                  className="w-full input-field pl-8 pr-3 py-2.5 text-sm text-slate-700 dark:text-slate-200"
                  disabled={analyzing}
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !username.trim()}
                className="btn btn-primary px-6 disabled:opacity-50"
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                    Derin Analiz...
                  </span>
                ) : 'Derin Analiz'}
              </button>
            </div>
            {deepProgress && (
              <div className="mt-3 flex items-center gap-2 text-xs text-blue-500 dark:text-blue-400">
                <svg className="w-3 h-3 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                {deepProgress}
              </div>
            )}
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => setShowManual(!showManual)} className="text-xs text-slate-400 hover:text-brand-red transition-colors">
                {showManual ? '✕ Manuel girişi kapat' : '+ Manuel tweet yapıştır'}
              </button>
            </div>
          </div>

          {/* Manual Input (collapsible) */}
          {showManual && (
            <div className="card p-5 border-l-4 border-l-brand-gold bg-brand-gold-light dark:bg-brand-gold/5">
              <h3 className="text-sm font-bold text-brand-gold mb-3">Manuel Stil Kaydet</h3>
              <textarea
                value={manualTweets}
                onChange={e => setManualTweets(e.target.value)}
                rows={6}
                className="w-full input-field p-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed resize-none"
                placeholder={"Birinci tweet buraya...\n---\nİkinci tweet buraya...\n---\nÜçüncü tweet buraya..."}
              />
              <button onClick={handleSaveManual} className="btn btn-primary mt-3 w-full justify-center">
                Stil Profilini Kaydet ({manualTweets.split('\n---\n').filter(t => t.trim()).length} tweet)
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Style */}
            <div className="space-y-5">
              {currentStyle && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const pic = userInfo?.profilePicture || userCache[currentStyle.xUsername]?.profilePicture
                        return pic ? (
                          <img src={proxyImageUrl(pic)} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red font-bold text-lg">
                            {currentStyle.xUsername[0]?.toUpperCase()}
                          </div>
                        )
                      })()}
                      <div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">@{currentStyle.xUsername}</h3>
                        {(userInfo || userCache[currentStyle.xUsername]) && (
                          <div className="text-xs text-slate-400">
                            {(userInfo || userCache[currentStyle.xUsername])?.name} · {(userInfo || userCache[currentStyle.xUsername])?.followers?.toLocaleString()} takipçi
                          </div>
                        )}
                        {!userInfo && !userCache[currentStyle.xUsername] && <div className="text-xs text-slate-400">{currentStyle.tweetCount} tweet analiz edildi</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => { setComposeStyle(currentStyle.xUsername); setTab('compose') }}
                      className="btn btn-primary text-xs py-1.5"
                    >
                      Bu Stilde Yaz →
                    </button>
                  </div>

                  {userInfo?.description && (
                    <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 mb-4 text-sm text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/[0.06]">
                      {userInfo.description}
                    </div>
                  )}

                  {/* Tweet samples */}
                  {(currentStyle.tweets?.length ?? 0) > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(currentStyle.tweets ?? []).map((tweet, i) => (
                        <div key={tweet.id} className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 border border-slate-100 dark:border-white/[0.06]">
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{tweet.text}</p>
                          <div className="text-[10px] text-slate-400 mt-1.5 font-mono">{tweet.createdAt ? new Date(tweet.createdAt).toLocaleDateString('tr-TR') : ''}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-slate-400">
                      Bu hesabın tweetleri henüz cache'lenmemiş.
                      <br/>
                      <span className="text-xs">Manuel tweet yapıştırarak stil profili oluşturabilirsin.</span>
                    </div>
                  )}

                  {/* Style analysis */}
                  {(currentStyle.tweets?.length ?? 0) > 0 && (
                    <div className="mt-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06]">
                      <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">STİL PROFİLİ</div>
                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">Ort. uzunluk:</span>{' '}
                          {Math.round((currentStyle.tweets ?? []).reduce((s, t) => s + t.text.length, 0) / (currentStyle.tweets?.length ?? 0))} karakter
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">Emoji:</span>{' '}
                          {(currentStyle.tweets ?? []).filter(t => /[\u{1F600}-\u{1F6FF}]/u.test(t.text)).length}/{(currentStyle.tweets?.length ?? 0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">Soru:</span>{' '}
                          {(currentStyle.tweets ?? []).filter(t => t.text.includes('?')).length}/{(currentStyle.tweets?.length ?? 0)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">Satır arası:</span>{' '}
                          Ort. {Math.round((currentStyle.tweets ?? []).reduce((s, t) => s + (t.text.match(/\n/g) || []).length, 0) / (currentStyle.tweets?.length ?? 0))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!currentStyle && !analyzing && (
                <div className="card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-medium">Kullanıcı adı girerek başla</div>
                  <div className="text-slate-400 text-xs mt-1">Xquik otomatik olarak tweetleri çekip stilini analiz edecek.</div>
                </div>
              )}
            </div>

            {/* Saved Styles List */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">
                Kayıtlı Stiller {styles.length > 0 && <span className="text-slate-400">({styles.length})</span>}
              </h3>
              {styles.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  Henüz kayıtlı stil yok.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {styles.map(style => (
                    <div
                      key={style.xUsername}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                        currentStyle?.xUsername === style.xUsername
                          ? 'bg-brand-red/[0.05] dark:bg-brand-red/[0.08] border border-brand-red/15'
                          : 'bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                      }`}
                      onClick={() => handleLoadStyle(style.xUsername)}
                    >
                      <div className="flex items-center gap-3">
                        {userCache[style.xUsername]?.profilePicture ? (
                          <img src={proxyImageUrl(userCache[style.xUsername].profilePicture)} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/[0.08] flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                            {style.xUsername[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">@{style.xUsername}</span>
                            {library.find(e => e.username === style.xUsername)?.isPinned && (
                              <span className="text-[9px] text-brand-gold">*</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {style.tweetCount} tweet
                            {(() => { const le = library.find(e => e.username === style.xUsername); return le?.generatedCount ? ` · ${le.generatedCount} uretim` : '' })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isValidXUsername(style.xUsername) && (
                          <button
                            onClick={e => { e.stopPropagation(); toggleMonitor(style.xUsername) }}
                            className={`btn text-[10px] py-1 px-2 ${
                              monitors.some(m => m.xUsername === style.xUsername)
                                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'
                                : 'text-slate-400'
                            }`}
                            title={monitors.some(m => m.xUsername === style.xUsername) ? 'Canli takip aktif' : 'Canli takibi ac'}
                          >
                            {monitors.some(m => m.xUsername === style.xUsername) ? 'CANLI' : 'Takip'}
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setComposeStyle(style.xUsername); setTab('compose') }}
                          className="btn text-[10px] py-1 px-2"
                        >
                          Yaz
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteStyle(style.xUsername) }}
                          className="btn text-[10px] py-1 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ COMPOSE TAB ═══════════ */}
      {tab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-5">
            {/* Config */}
            <div className="card p-6">
              <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-4">ADIM 01 — YAPILANDIRMA</div>
              <div className="space-y-3">
                {/* Mode tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-lg">
                  {([
                    { key: 'tweet' as const, label: 'Tweet' },
                    { key: 'quote' as const, label: 'Quote' },
                    { key: 'reply' as const, label: 'Reply' },
                    { key: 'thread' as const, label: 'Thread' },
                  ]).map(m => (
                    <button
                      key={m.key}
                      onClick={() => setComposeMode(m.key)}
                      className={`flex-1 text-[10px] py-1.5 rounded-md font-medium transition-all ${
                        composeMode === m.key
                          ? 'bg-white dark:bg-dark-card text-slate-700 dark:text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Style selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">KLONLANACAK STIL</label>
                  <select
                    value={composeStyle}
                    onChange={e => setComposeStyle(e.target.value)}
                    className="w-full input-field px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Stil sec...</option>
                    {styles.map(s => (
                      <option key={s.xUsername} value={s.xUsername}>@{s.xUsername} ({s.tweetCount} tweet)</option>
                    ))}
                  </select>
                </div>

                {/* Quote/Reply: tweet URL input */}
                {(composeMode === 'quote' || composeMode === 'reply') && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">
                      {composeMode === 'quote' ? 'QUOTE EDILECEK TWEET' : 'REPLY YAZILACAK TWEET'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quoteTweetUrl}
                        onChange={e => setQuoteTweetUrl(e.target.value)}
                        placeholder="Tweet URL yapistir..."
                        className="flex-1 input-field px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                      />
                      <button onClick={handleFetchQuoteTweet} className="btn text-xs px-3">Cek</button>
                    </div>
                    {quoteTweetText && (
                      <div className="mt-2 p-3 bg-slate-50 dark:bg-white/[0.03] rounded-lg border border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">@{quoteTweetAuthor}:</span> {quoteTweetText.substring(0, 150)}{quoteTweetText.length > 150 ? '...' : ''}
                      </div>
                    )}
                  </div>
                )}

                {/* Topic (tweet + thread modes) */}
                {(composeMode === 'tweet' || composeMode === 'thread') && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider">KONU</label>
                      <button
                        onClick={loadTopicSuggestions}
                        disabled={loadingTopics}
                        className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        {loadingTopics ? 'Yukleniyor...' : 'Konu oner'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={composeTopic}
                      onChange={e => setComposeTopic(e.target.value)}
                      placeholder="Istanbul bekliyor, ozgurluk, demokrasi..."
                      className="w-full input-field px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                    />
                    {topicSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {topicSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { setComposeTopic(s.title); setTopicContext(s.context || '') }}
                            className={`text-[10px] px-2 py-1 rounded-lg border transition-all hover:scale-105 ${
                              s.source === 'campaign' ? 'bg-brand-red/10 text-brand-red border-brand-red/20' :
                              s.source === 'live' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                              'bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]'
                            }`}
                            title={s.reason}
                          >
                            {s.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Ton + Hedef + Count row */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">TON</label>
                    <select value={composeTone} onChange={e => setComposeTone(e.target.value)}
                      className="w-full input-field px-2 py-2 text-xs text-slate-700 dark:text-slate-200">
                      <option value="duygusal, umut dolu">Umutlu</option>
                      <option value="sarkastik, keskin">Sarkastik</option>
                      <option value="ofkeli, isyankar">Ofkeli</option>
                      <option value="siirsel, duygusal">Siirsel</option>
                      <option value="samimi, sokak agzi">Samimi</option>
                      <option value="ciddi, resmi">Resmi</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">HEDEF</label>
                    <select value={composeGoal} onChange={e => setComposeGoal(e.target.value)}
                      className="w-full input-field px-2 py-2 text-xs text-slate-700 dark:text-slate-200">
                      <option value="engagement">Etkilesim</option>
                      <option value="followers">Takipci</option>
                      <option value="authority">Otorite</option>
                      <option value="conversation">Sohbet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">
                      {composeMode === 'thread' ? 'TWEET' : 'ADET'}
                    </label>
                    {composeMode === 'thread' ? (
                      <div className="input-field px-2 py-2 text-xs text-slate-400 text-center">4-8</div>
                    ) : (
                      <select value={tweetCount} onChange={e => setTweetCount(Number(e.target.value))}
                        className="w-full input-field px-2 py-2 text-xs text-slate-700 dark:text-slate-200">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Format hint (only when no style or campaign mode) */}
                {composeMode === 'tweet' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">UZUNLUK</label>
                    <div className="flex gap-1.5">
                      {[
                        { value: '', label: 'Otomatik' },
                        { value: 'kisa', label: 'Kisa' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'uzun', label: 'Uzun' },
                      ].map(f => (
                        <button
                          key={f.value}
                          onClick={() => setLengthHint(f.value)}
                          className={`flex-1 text-[10px] py-1.5 rounded-md border transition-all ${
                            lengthHint === f.value
                              ? 'bg-brand-red/10 text-brand-red border-brand-red/20 font-bold'
                              : 'text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-600'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider">URETIM MODU</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCloneMode(true)}
                      className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                        cloneMode
                          ? 'bg-brand-red/10 text-brand-red border-brand-red/20 font-bold'
                          : 'text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-600'
                      }`}
                    >
                      Birebir Klon
                    </button>
                    <button
                      onClick={() => setCloneMode(false)}
                      className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                        !cloneMode
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold'
                          : 'text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-600'
                      }`}
                    >
                      Optimize
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleGetGuidance}
                    disabled={loading || !composeTopic.trim() || !composeStyle}
                    className="btn w-full justify-center disabled:opacity-50 text-xs"
                  >
                    {loading ? 'Rehber...' : 'Rehber Al'}
                  </button>
                  <button
                    onClick={handleAutoGenerate}
                    disabled={generating || !composeTopic.trim() || !composeStyle}
                    className="btn btn-primary w-full justify-center disabled:opacity-50 text-xs"
                  >
                    {generating ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                        Uretiyor...
                      </span>
                    ) : 'Otomatik Uret'}
                  </button>
                </div>
              </div>
            </div>

            {/* Guidance + Draft */}
            <div className="card p-6">
              <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-4">ADIM 02 — TASLAK YAZ</div>

              {guidance && (
                <div className="space-y-3 mb-4">
                  {guidance.examplePatterns && guidance.examplePatterns.length > 0 && (
                    <details open className="group">
                      <summary className="text-xs font-semibold text-blue-500 dark:text-blue-400 cursor-pointer">
                        Örnek Kalıplar ({guidance.examplePatterns.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {guidance.examplePatterns.map((p, i) => (
                          <div key={i} className="bg-slate-50 dark:bg-white/[0.03] rounded-lg p-2.5 text-[11px] border border-slate-100 dark:border-white/[0.06]">
                            <div className="font-medium text-slate-600 dark:text-slate-300">{p.description}</div>
                            <div className="text-slate-400 font-mono mt-0.5">{p.pattern}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {guidance.compositionGuidance && (
                    <details className="group">
                      <summary className="text-xs font-semibold text-brand-gold cursor-pointer">
                        Kompozisyon Kuralları ({guidance.compositionGuidance.length})
                      </summary>
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {guidance.compositionGuidance.slice(0, 10).map((g, i) => (
                          <div key={i} className="text-[11px] text-slate-400 flex gap-2">
                            <span className="text-brand-gold flex-shrink-0">•</span><span>{g}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              <textarea
                value={composeDraft}
                onChange={e => setComposeDraft(e.target.value)}
                rows={6}
                className="w-full input-field p-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed resize-none"
                placeholder="Klonlanan stilde tweet taslağını yaz..."
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-mono ${composeDraft.length > 280 ? 'text-red-500' : 'text-slate-400'}`}>
                  {composeDraft.length}/280
                </span>
                <div className="flex gap-2">
                  <CopyBtn text={composeDraft} label="Kopyala" />
                  <button
                    onClick={handleScore}
                    disabled={loading || !composeDraft.trim()}
                    className="btn btn-primary text-xs py-1.5 disabled:opacity-50"
                  >
                    {loading ? 'Kontrol ediliyor...' : '11 Kontrol Testi'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Score + Reference */}
          <div className="space-y-5">
            {scoreResult && (
              <div className={`card rounded-2xl p-6 ${scoreResult.passed
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
              }`}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">ALGORİTMA SKORU</label>
                    <div className="text-xs text-slate-400 mt-1">{scoreResult.topSuggestion}</div>
                  </div>
                  <div className="text-right">
                    <span className={`stat-number text-5xl ${scoreResult.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {scoreResult.passedCount}
                    </span>
                    <span className="text-lg text-slate-400">/{scoreResult.totalChecks}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {scoreResult.checklist.map((check, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={`text-xs font-bold ${check.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                        {check.passed ? '✓' : '✕'}
                      </span>
                      <span className={check.passed ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}>
                        {check.factor}
                      </span>
                    </div>
                  ))}
                </div>
                {scoreResult.passed && scoreResult.intentUrl && (
                  <a href={scoreResult.intentUrl} target="_blank" rel="noopener noreferrer"
                    className="btn btn-primary w-full justify-center mt-4">
                    X'te Paylaş →
                  </a>
                )}
              </div>
            )}

            {/* Generated Tweets */}
            {generatedTweets.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold text-slate-400 tracking-widest">URETILEN TWEETLER</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg ${
                    cloneMode
                      ? 'bg-brand-red/10 text-brand-red'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    {cloneMode ? 'Birebir Klon' : 'Optimize'}
                  </span>
                </div>
                <div className="space-y-3">
                  {generatedTweets.map((gt, i) => {
                    // In clone mode: if only CTA failed, treat as "style pass"
                    const hasStyleOverride = (gt.styleOverrides?.length ?? 0) > 0
                    const isStylePass = hasStyleOverride && !gt.score?.passed && gt.score
                      ? gt.score.checklist?.filter(c => !c.passed).every(c => c.factor.includes('CTA'))
                      : false
                    const displayPassed = gt.score?.passed || isStylePass

                    return (
                      <div key={i} className={`p-4 rounded-xl border ${
                        displayPassed
                          ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-slate-50 dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.06]'
                      }`}>
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">{gt.tweet}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {gt.score && (
                              <span className={`text-[10px] font-bold ${displayPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {gt.score.count}/{gt.score.total}
                              </span>
                            )}
                            {isStylePass && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-400">
                                stil uyumu
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">{gt.tweet.length} chr</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CopyBtn text={gt.tweet} />
                            <button
                              onClick={() => setComposeDraft(gt.tweet)}
                              className="btn text-[10px] py-1 px-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            >
                              Duzenle
                            </button>
                          </div>
                        </div>
                        {hasStyleOverride && (
                          <div className="mt-2 text-[10px] text-slate-400 italic">
                            {gt.styleOverrides?.join(' · ')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Style reference */}
            {composeStyle && (
              <div className="card p-6">
                <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">REFERANS: @{composeStyle}</div>
                <StyleReference username={composeStyle} styles={styles} />
              </div>
            )}

            {/* How it works */}
            <div className="card p-6">
              <div className="section-header">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">Akış</h3>
              </div>
              <div className="space-y-2 mt-3">
                {[
                  { n: '01', t: 'Kullanıcı adı gir', d: 'Xquik otomatik tweetleri çeker' },
                  { n: '02', t: 'Stil profili oluşur', d: 'Uzunluk, ton, kalıp analizi' },
                  { n: '03', t: 'Konu + ton seç', d: 'Rehber ve kalıpları al' },
                  { n: '04', t: 'Taslak yaz', d: 'Klonlanan stilde oluştur' },
                  { n: '05', t: '11 kontrol testi', d: 'Tüm geçerse X\'te paylaş' },
                ].map(s => (
                  <div key={s.n} className="flex gap-3 items-start p-2">
                    <span className="w-6 h-6 rounded-md bg-brand-red/10 text-brand-red text-[10px] font-bold flex items-center justify-center flex-shrink-0">{s.n}</span>
                    <div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{s.t}</div>
                      <div className="text-[10px] text-slate-400">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ DRAFTS TAB ═══════════ */}
      {tab === 'drafts' && (
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <div className="card text-center py-20">
              <div className="text-slate-500 dark:text-slate-400 font-medium">Henüz taslak yok.</div>
              <div className="text-slate-400 text-sm mt-1">Tweet üretip skor kontrolünden geçirdiğinde otomatik kaydedilir.</div>
            </div>
          ) : (
            drafts.map(draft => (
              <div key={draft.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="chip bg-brand-red/10 text-brand-red border-brand-red/20 text-[10px]">@{draft.styleUsername}</span>
                    {draft.topic && <span className="text-xs text-slate-400">{draft.topic}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {draft.score !== undefined && (
                      <span className={`chip text-[10px] ${
                        draft.score === 11 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                      }`}>{draft.score}/11</span>
                    )}
                    <CopyBtn text={draft.text} />
                    <button
                      onClick={() => { deleteDraft(draft.id); setDrafts(getSavedDrafts()) }}
                      className="btn text-[10px] py-1 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{draft.text}</div>
                <div className="text-[10px] text-slate-400 mt-2">{new Date(draft.createdAt).toLocaleString('tr-TR')}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Style Reference Sub-component ──
function StyleReference({ username, styles }: { username: string; styles: StyleProfile[] }) {
  const style = styles.find(s => s.xUsername === username)
  if (!style || !style.tweets?.length) return <div className="text-xs text-slate-400">Stil verisi yok.</div>

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {style.tweets.slice(0, 5).map((tweet) => (
        <div key={tweet.id} className="bg-slate-50 dark:bg-white/[0.03] rounded-lg p-2.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/[0.06]">
          {tweet.text}
        </div>
      ))}
    </div>
  )
}
