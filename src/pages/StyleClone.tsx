import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CopyBtn } from '../components/CopyBtn'
import {
  hasApiKey, analyzeStyle, listStyles, getStyleFromAPI, deleteStyleFromAPI, saveCustomStyle,
  composeRefine, lookupUser, isValidXUsername, proxyImageUrl,
  getSavedDrafts, saveDraft, deleteDraft,
  startDeepAnalysis, getExtractionJob, getAllExtractionResults, saveCuratedStyle,
  createMonitor, listMonitors, deleteMonitor, createWebhook, listWebhooks,
  generateTweet, getRadarTopics, lookupTweet, analyzePersonality, generateStyleSummary,
  getConnectedAccounts, publishTweet,
} from '../lib/xquik'
import type { StyleProfile, XUser, Draft, ScoreResult, ComposeRefineResult, Monitor, GeneratedTweet, PersonalityDNA, XAccount } from '../lib/xquik'
import { getLibrary, saveEntry, togglePin, incrementGenerated, addTopic, CATEGORIES } from '../lib/styleLibrary'
import type { StyleLibraryEntry } from '../lib/styleLibrary'
import { getTopicSuggestions, TOPIC_CATEGORIES } from '../lib/topicSuggestor'
import type { TopicSuggestion, TopicCategory } from '../lib/topicSuggestor'
import { trackGeminiUsage } from '../lib/costTracker'
import { trackPublished } from '../lib/publishTracker'
import { checkCampaignRules, getScoreColor, getScoreBg, getDayCount } from '../lib/utils'
import { getDayPlan } from '../data/campaign'
import { scoreDraft } from '../lib/xquik'

type Tab = 'analyze' | 'compose' | 'drafts'

export default function StyleClone() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [newsData] = useState(() => {
    const title = searchParams.get('newsTitle')
    return title ? {
      title,
      context: searchParams.get('newsContext') || '',
      url: searchParams.get('newsUrl') || '',
    } : null
  })
  const [tab, setTab] = useState<Tab>(newsData ? 'compose' : 'analyze')
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
  const [generateWarnings, setGenerateWarnings] = useState<string[]>([])
  const [previousTweets, setPreviousTweets] = useState<string[]>([])

  // ── Topic Suggestions ──
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([])
  const [topicContext, setTopicContext] = useState(
    newsData ? `Haber: ${newsData.title}${newsData.context ? '\nDetay: ' + newsData.context : ''}${newsData.url ? '\nKaynak: ' + newsData.url : ''}` : ''
  )
  const [userHint, setUserHint] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null)
  const [topicCategory, setTopicCategory] = useState<TopicCategory>('siyaset')

  // ── Check (inline algorithm checker) ──
  const [checkText, setCheckText] = useState('')
  const [checkResult, setCheckResult] = useState<ScoreResult | null>(null)
  const [checkLoading, setCheckLoading] = useState(false)
  const [checkOpen, setCheckOpen] = useState(false)

  // ── Viral tweet discovery (quote mode) ──
  const [viralTweets, setViralTweets] = useState<{ id: string; text: string; author: string; likeCount: number; retweetCount: number }[]>([])
  const [viralCategory, setViralCategory] = useState<TopicCategory>('tumu')
  const [viralLoading, setViralLoading] = useState(false)

  // ── Manual ──
  const [manualTweets, setManualTweets] = useState('')
  const [showManual, setShowManual] = useState(false)

  // ── Compose ──
  const [composeTopic, setComposeTopic] = useState(newsData?.title || '')
  const [composeStyle, setComposeStyle] = useState('')
  const [composeTone, setComposeTone] = useState('duygusal, umut dolu')
  const [composeGoal, setComposeGoal] = useState('engagement')
  const [cloneMode, setCloneMode] = useState(true)
  const [composeMode, setComposeMode] = useState<'tweet' | 'quote' | 'reply' | 'thread'>('tweet')
  const [quoteTweetUrl, setQuoteTweetUrl] = useState('')
  const [quoteTweetText, setQuoteTweetText] = useState('')
  const [quoteTweetAuthor, setQuoteTweetAuthor] = useState('')
  const [fetchingQuote, setFetchingQuote] = useState(false)
  const [tweetCount, setTweetCount] = useState(3)
  const [lengthHint, setLengthHint] = useState('')
  const [guidance, setGuidance] = useState<ComposeRefineResult | null>(null)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null)
  const [loading, setLoading] = useState(false)

  // ── Drafts ──
  const [drafts, setDrafts] = useState<Draft[]>([])

  // ── X Publishing ──
  const [xAccounts, setXAccounts] = useState<XAccount[]>([])
  const [publishing, setPublishing] = useState<number | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<Record<number, string>>({})
  const [publishError, setPublishError] = useState('')

  const handlePublish = async (tweetText: string, index: number) => {
    if (xAccounts.length === 0) { setPublishError('Hesap bağlı değil. Ayarlar → Hesap Bağla'); return }
    if (!confirm(`Bu tweet X'e gönderilecek:\n\n"${tweetText.substring(0, 100)}..."\n\nOnayla?`)) return
    setPublishing(index)
    setPublishError('')
    try {
      const account = xAccounts[0].xUsername
      const result = await publishTweet(account, tweetText)
      setPublishSuccess(prev => ({ ...prev, [index]: result.tweetId }))
      trackPublished({
        tweetId: result.tweetId,
        text: tweetText,
        publishedAt: new Date().toISOString(),
        account,
        topic: composeTopic || undefined,
        tone: composeTone || undefined,
        styleUsername: composeStyle || undefined,
        lengthHint: lengthHint || undefined,
      })
    } catch (e: any) {
      setPublishError(e.message || 'Paylaşım başarısız')
    }
    setPublishing(null)
  }

  // ── Trend-to-Tweet (one-click) ──
  const [trendLoading, setTrendLoading] = useState(false)

  const handleTrendGenerate = async () => {
    if (!composeStyle) { setError('Önce bir stil seçin'); return }
    setTrendLoading(true)
    setError('')
    setGeneratedTweets([])
    setPublishSuccess({})
    try {
      const radar = await getRadarTopics('TR', 6, 10)
      const items = radar.items || []
      if (items.length === 0) { setError('Trend bulunamadı'); setTrendLoading(false); return }
      // Pick top trend
      const top = items[0]
      setComposeTopic(top.title)
      setTopicContext(`Trending: ${top.title} (kaynak: ${top.source}, skor: ${top.score})`)

      const styleEntry = library.find(e => e.username === composeStyle)
      const styleDNA = styleEntry?.personalityDNA
      const contextParts: string[] = []
      if (composeStyle === 'istbekliyor') {
        const day = getDayCount()
        const plan = getDayPlan(day)
        contextParts.push(`Kampanya gunü: GÜN ${day}, tema: ${plan.theme}, sahne: ${plan.scene}`)
      }
      contextParts.push(`Trending topic: ${top.title} (source: ${top.source}, category: ${top.category})`)
      if (userHint.trim()) contextParts.push(`Kullanıcı notu: ${userHint.trim()}`)

      const result = await generateTweet({
        styleUsername: composeStyle,
        topic: top.title,
        tone: composeTone,
        goal: composeGoal,
        count: tweetCount,
        cloneMode,
        topicContext: contextParts.join('\n'),
        mode: 'tweet',
        lengthHint: lengthHint || undefined,
        personalityDNA: styleDNA,
        styleSummary: styleEntry?.styleSummary,
        fingerprint: styleEntry?.fingerprint,
        previousTweets,
      })
      setGeneratedTweets(result.tweets)
      setPreviousTweets(prev => [...prev, ...result.tweets.map((t: any) => t.tweet)].slice(-20))
      setGenerateWarnings(result.warnings || [])
      if (result.geminiUsage) trackGeminiUsage(result.geminiUsage)
      incrementGenerated(composeStyle)
      addTopic(composeStyle, top.title)
      setLibrary(getLibrary())
    } catch (e: any) {
      setError(e.message || 'Trend üretim başarısız')
    }
    setTrendLoading(false)
  }

  // Clear news params after initial read
  useEffect(() => {
    if (newsData) setSearchParams({}, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset previousTweets when style changes
  useEffect(() => { setPreviousTweets([]) }, [composeStyle])

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
      getConnectedAccounts().then(res => setXAccounts(res.accounts || [])).catch(() => {})
    }
  }, [])

  // ── Deep Analysis (Extraction → Filter → PUT → Monitor) ──
  const handleAnalyze = async (overrideUsername?: string) => {
    const target = overrideUsername || username
    if (!target.trim()) return
    const clean = target.replace('@', '')
    setAnalyzing(true)
    setError('')
    setUserInfo(null)
    setCurrentStyle(null)
    setDeepProgress('Kullanıcı bilgisi alınıyor...')

    // 1. Fetch user info first (free call)
    try {
      const user = await lookupUser(clean)
      setUserInfo(user)
      setUserCache(prev => ({ ...prev, [clean]: user }))
    } catch { /* user info optional */ }

    // 2. Start extraction job — adaptive minFaves (try high first, fallback to lower)
    setDeepProgress('Derin analiz başlatılıyor (en iyi tweetler çekilecek)...')
    try {
      let allTweets: Awaited<ReturnType<typeof getAllExtractionResults>> = []
      let extractionMinFaves = 50

      // Adaptive extraction: try minFaves 50 → 10 → 0 if too few results
      for (const minFaves of [50, 10, 0]) {
        extractionMinFaves = minFaves
        const job = await startDeepAnalysis(clean, { minFaves, resultsLimit: 200 })
        setDeepProgress(`Extraction çalışıyor (minFaves: ${minFaves})...`)

        let status = 'running'
        let attempts = 0
        while (status === 'running' && attempts < 30) {
          await new Promise(r => setTimeout(r, 2000))
          const check = await getExtractionJob(job.id)
          status = check.job.status
          if (status === 'completed') {
            setDeepProgress(`${check.job.totalResults} tweet bulundu (minFaves: ${minFaves})…`)
          } else if (status === 'failed') {
            break
          }
          attempts++
        }

        if (status === 'completed') {
          allTweets = await getAllExtractionResults(job.id)
          if (allTweets.length >= 20) break // enough data, stop
          if (minFaves === 0) break // lowest tier, accept whatever we got
          setDeepProgress(`Sadece ${allTweets.length} tweet bulundu, daha düşük eşikle deneniyor…`)
        }
      }

      if (allTweets.length === 0) throw new Error('Hiç tweet bulunamadı')

      // 4. Get all results and save as curated style
      const filtered = allTweets.filter(t => !t.tweetText.startsWith('@') && t.tweetText.length > 30)
      const dataQuality = filtered.length >= 50 ? 'high' : filtered.length >= 20 ? 'medium' : 'low'
      setDeepProgress(`${filtered.length} tweet filtrelendi (kalite: ${dataQuality === 'high' ? 'yüksek' : dataQuality === 'medium' ? 'orta' : 'düşük'})…`)

      const style = await saveCuratedStyle(clean, allTweets)
      setCurrentStyle(style)
      ensureLibraryEntry(clean)

      // Save data quality metadata to library
      const libEntry = getLibrary().find(e => e.username === clean)
      if (libEntry) {
        libEntry.extractedTweetCount = filtered.length
        libEntry.dataQuality = dataQuality
        // Detect topic coverage from tweets
        const topicCounts: Record<string, number> = {}
        const catRegex: Record<string, RegExp> = {
          siyaset: /bakan|meclis|chp\b|akp\b|seçim|mahkeme|hükümet|muhalefet|erdoğan|imamoğlu|belediye/i,
          spor: /galatasaray|fenerbah|beşiktaş|maç\b|gol\b|futbol|hakem|derbi/i,
          ekonomi: /dolar|euro|borsa|enflasyon|faiz|ekonomi|zam\b|maaş/i,
          teknoloji: /yapay zeka|teknoloji|yazılım|ai\b|dijital|startup/i,
          kultur: /film\b|dizi\b|müzik|kitap|sinema|sanat|netflix/i,
        }
        for (const t of filtered) {
          const text = t.tweetText?.toLowerCase() || ''
          for (const [cat, rx] of Object.entries(catRegex)) {
            if (rx.test(text)) topicCounts[cat] = (topicCounts[cat] || 0) + 1
          }
        }
        libEntry.topicCoverage = topicCounts
        saveEntry(libEntry)
        setLibrary(getLibrary())
      }

      // 5. Refresh styles list
      listStyles().then(res => setStyles(res.styles || [])).catch(() => {})

      // 6. Auto-setup monitor if not exists
      const hasMonitor = monitors.some(m => m.username === clean)
      if (!hasMonitor) {
        setDeepProgress('Canlı takip (monitor) ayarlanıyor...')
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

      // 7. Auto-extract personality DNA
      setDeepProgress('Kişilik DNA çıkarılıyor...')
      try {
        const tweetTexts = (style.tweets || []).map(t => t.text).filter(t => t.length > 20)
        if (tweetTexts.length >= 5) {
          const { dna, geminiUsage } = await analyzePersonality(tweetTexts)
          if (geminiUsage) trackGeminiUsage(geminiUsage)
          // Save DNA to library
          const lib = getLibrary()
          const entry = lib.find(e => e.username === clean)
          if (entry) {
            entry.personalityDNA = dna
            entry.tweetsSinceDNA = 0

            // 7b. Compute style fingerprint (zero cost)
            setDeepProgress('Stil parmak izi hesaplanıyor...')
            try {
              const { computeFingerprint } = await import('../lib/styleFingerprint')
              entry.fingerprint = computeFingerprint(tweetTexts)
            } catch (fpErr: any) {
              console.warn('Fingerprint computation failed:', fpErr.message)
            }

            // 7c. Generate style summary
            setDeepProgress('Stil özeti oluşturuluyor...')
            try {
              const { summary, geminiUsage: sumUsage } = await generateStyleSummary(tweetTexts, clean, dna?.language)
              if (sumUsage) trackGeminiUsage(sumUsage)
              entry.styleSummary = summary
              entry.tweetsSinceSummary = 0
            } catch (sumErr: any) {
              console.warn('Style summary failed:', sumErr.message)
            }

            saveEntry(entry)
            setLibrary(getLibrary())
          }
        }
      } catch (e: any) {
        console.warn('DNA extraction failed:', e.message)
      }

      setDeepProgress(null)
    } catch (e: any) {
      // Fallback: try basic analysis if extraction fails (e.g. no subscription)
      setDeepProgress('Extraction kullanılamadı, basit analiz deneniyor…')
      try {
        const style = await analyzeStyle(clean)
        setCurrentStyle(style)
        listStyles().then(res => setStyles(res.styles || [])).catch(() => {})
      } catch (e2: any) {
        setError(e2.message || e.message || 'Analiz başarısız')
      }
      setDeepProgress(null)
    }
    setAnalyzing(false)
  }

  // ── Toggle monitor for a username ──
  const toggleMonitor = async (uname: string) => {
    const existing = monitors.find(m => m.username === uname)
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
    setFetchingQuote(true)
    setError('')
    setQuoteTweetText('')
    setQuoteTweetAuthor('')
    try {
      const tweet = await lookupTweet(quoteTweetUrl)
      setQuoteTweetText(tweet.text || '')
      setQuoteTweetAuthor(tweet.author?.username || '')
    } catch (e: any) {
      setError('Tweet bulunamadı: ' + e.message)
    }
    setFetchingQuote(false)
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
      // Get personality DNA + style data from library if available
      const styleEntry = library.find(e => e.username === composeStyle)
      const styleDNA = styleEntry?.personalityDNA

      // Build merged context: campaign day (only for campaign account) + topic suggestions + user hint
      const contextParts: string[] = []
      if (composeStyle === 'istbekliyor') {
        const day = getDayCount()
        const plan = getDayPlan(day)
        contextParts.push(`Kampanya gunü: GÜN ${day}, tema: ${plan.theme}, sahne: ${plan.scene}`)
      }
      if (topicContext) contextParts.push(topicContext)
      if (userHint.trim()) contextParts.push(`Kullanıcı notu: ${userHint.trim()}`)
      const mergedContext = contextParts.join('\n')

      const result = await generateTweet({
        styleUsername: composeStyle,
        topic: composeTopic,
        tone: composeTone,
        goal: composeGoal,
        count: tweetCount,
        cloneMode,
        topicContext: mergedContext || undefined,
        mode: composeMode,
        quoteTweetText: quoteTweetText || undefined,
        quoteTweetAuthor: quoteTweetAuthor || undefined,
        lengthHint: lengthHint || undefined,
        personalityDNA: styleDNA,
        styleSummary: styleEntry?.styleSummary,
        fingerprint: styleEntry?.fingerprint,
        previousTweets,
      })
      setGeneratedTweets(result.tweets)
      setPreviousTweets(prev => [...prev, ...result.tweets.map((t: any) => t.tweet)].slice(-20))
      setGenerateWarnings(result.warnings || [])
      if (result.geminiUsage) trackGeminiUsage(result.geminiUsage)
      incrementGenerated(composeStyle)
      addTopic(composeStyle, composeTopic)
      setLibrary(getLibrary())
    } catch (e: any) {
      setError(e.message || 'Tweet üretimi başarısız')
    }
    setGenerating(false)
  }

  // ── Load Topic Suggestions ──
  const loadTopicSuggestions = async () => {
    setLoadingTopics(true)
    try {
      const suggestions = await getTopicSuggestions(null, currentStyle, topicCategory)
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

  // ── Check: score text inline ──
  const handleCheck = async (text: string) => {
    if (text.trim().length < 10) { setCheckResult(null); return }
    setCheckLoading(true)
    try {
      const result = await scoreDraft(text, true)
      setCheckResult(result)
    } catch { setCheckResult(null) }
    setCheckLoading(false)
  }

  const campaignCheck = checkText.trim() ? checkCampaignRules(checkText) : null

  // ── Viral tweet search ──
  const searchViralTweets = async (cat: TopicCategory) => {
    setViralLoading(true)
    try {
      const res = await fetch(`/api/search-viral?category=${cat}&limit=6`)
      if (res.ok) {
        const data = await res.json()
        setViralTweets(data.tweets || [])
      }
    } catch { /* optional */ }
    setViralLoading(false)
  }

  // ═══════════ UI ═══════════
  if (!apiReady) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div >
          <h1 className="text-2xl font-bold text-[#0A0A0A]">Stil Klonlama</h1>
        </div>
        <div className="card text-center py-20 px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-none bg-[rgba(10,10,10,0.02)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#0A0A0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <div className="text-[#0A0A0A] font-semibold">Xquik API Key Gerekli</div>
          <div className="text-[rgba(10,10,10,0.4)] text-sm mt-2 max-w-md mx-auto">
            Stil klonlama için <code className="chip text-[#E30A17]">.env</code> dosyasına Xquik API key ekle.
          </div>
          <div className="mt-6 bg-[rgba(10,10,10,0.02)] rounded-none p-4 max-w-sm mx-auto text-left border border-[#0A0A0A]">
            <code className="text-xs text-[rgba(10,10,10,0.4)] leading-loose">
              VITE_XQUIK_API_KEY=xq_your_key_here
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div >
        <h1 className="text-2xl font-bold text-[#0A0A0A]">Stil Klonlama</h1>
        <p className="text-sm text-[rgba(10,10,10,0.4)] mt-1">
          Kullanıcı adı gir → tweetleri otomatik çek → stili kopyala → birebir aynı tonda tweet üret.
        </p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1.5 border-b border-[#0A0A0A] pb-0">
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
                ? 'border-[#E30A17] text-[#0A0A0A] font-bold'
                : 'border-transparent text-[rgba(10,10,10,0.4)] hover:bg-[rgba(10,10,10,0.05)]'
            }`}
          >
            {t.label}
            {t.count ? <span className="ml-1.5 text-[10px] chip py-0 px-1.5">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {error && (
        <div className="card border-l-4 border-l-[#E30A17] p-4 bg-[#E30A17]/5">
          <div className="text-sm text-[#E30A17]">{error}</div>
          <button onClick={() => setError('')} className="text-[10px] text-[#E30A17] mt-1 hover:underline">Kapat</button>
        </div>
      )}

      {/* ═══════════ ANALYZE TAB ═══════════ */}
      {tab === 'analyze' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="card p-5">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(10,10,10,0.4)] text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace('@', ''))}
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                  placeholder="kullanıcıadı"
                  className="w-full input-field pl-8 pr-3 py-2.5 text-sm text-[#0A0A0A]"
                  disabled={analyzing}
                />
              </div>
              <button
                onClick={() => handleAnalyze()}
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
              <div className="mt-3 flex items-center gap-2 text-xs text-[#E30A17]">
                <svg className="w-3 h-3 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                {deepProgress}
              </div>
            )}
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => setShowManual(!showManual)} className="text-xs text-[rgba(10,10,10,0.4)] hover:text-[#E30A17] transition-colors">
                {showManual ? '✕ Manuel girişi kapat' : '+ Manuel tweet yapıştır'}
              </button>
            </div>
          </div>

          {/* Manual Input (collapsible) */}
          {showManual && (
            <div className="card p-5 border-l-4 border-l-campaign-gold bg-campaign-gold/5">
              <h3 className="text-sm font-bold text-campaign-gold mb-3">Manuel Stil Kaydet</h3>
              <textarea
                value={manualTweets}
                onChange={e => setManualTweets(e.target.value)}
                rows={6}
                className="w-full input-field p-3 text-sm text-[#0A0A0A] leading-relaxed resize-none"
                placeholder={"Birinci tweet buraya...\n---\nİkinci tweet buraya...\n---\nÜçüncü tweet buraya..."}
              />
              <button onClick={handleSaveManual} className="btn btn-primary mt-3 w-full justify-center">
                Stil Profilini Kaydet ({manualTweets.split('\n---\n').filter(t => t.trim()).length} tweet)
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                          <div className="w-12 h-12 rounded-full bg-[rgba(227,10,23,0.15)] flex items-center justify-center text-[#E30A17] font-bold text-lg">
                            {currentStyle.xUsername[0]?.toUpperCase()}
                          </div>
                        )
                      })()}
                      <div>
                        <h3 className="font-bold text-[#0A0A0A]">@{currentStyle.xUsername}</h3>
                        {(userInfo || userCache[currentStyle.xUsername]) && (
                          <div className="text-xs text-[rgba(10,10,10,0.4)]">
                            {(userInfo || userCache[currentStyle.xUsername])?.name} · {(userInfo || userCache[currentStyle.xUsername])?.followers?.toLocaleString()} takipçi
                          </div>
                        )}
                        {!userInfo && !userCache[currentStyle.xUsername] && <div className="text-xs text-[rgba(10,10,10,0.4)]">{currentStyle.tweetCount} tweet analiz edildi</div>}
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
                    <div className="bg-[rgba(10,10,10,0.02)] rounded-none p-3 mb-4 text-sm text-[rgba(10,10,10,0.4)] border border-[#0A0A0A]">
                      {userInfo.description}
                    </div>
                  )}

                  {/* Tweet samples */}
                  {(currentStyle.tweets?.length ?? 0) > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {(currentStyle.tweets ?? []).map((tweet, i) => (
                        <div key={tweet.id} className="bg-[rgba(10,10,10,0.02)] rounded-none p-3 border border-[#0A0A0A]">
                          <p className="text-sm text-[#0A0A0A] leading-relaxed whitespace-pre-line">{tweet.text}</p>
                          <div className="text-[10px] text-[rgba(10,10,10,0.4)] mt-1.5">{tweet.createdAt ? new Date(tweet.createdAt).toLocaleDateString('tr-TR') : ''}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-[rgba(10,10,10,0.4)]">
                      Bu hesabın tweetleri henüz cache'lenmemiş.
                      <br/>
                      <span className="text-xs">Manuel tweet yapıştırarak stil profili oluşturabilirsin.</span>
                    </div>
                  )}

                  {/* Style analysis */}
                  {(currentStyle.tweets?.length ?? 0) > 0 && (
                    <div className="mt-4 bg-[rgba(10,10,10,0.02)] rounded-none p-4 border border-[#0A0A0A]">
                      <div className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider mb-2">STİL PROFİLİ</div>
                      <div className="grid grid-cols-2 gap-3 text-xs text-[rgba(10,10,10,0.4)]">
                        <div>
                          <span className="font-semibold text-[#0A0A0A]">Ort. uzunluk:</span>{' '}
                          {Math.round((currentStyle.tweets ?? []).reduce((s, t) => s + t.text.length, 0) / (currentStyle.tweets?.length ?? 0))} karakter
                        </div>
                        <div>
                          <span className="font-semibold text-[#0A0A0A]">Emoji:</span>{' '}
                          {(currentStyle.tweets ?? []).filter(t => /[\u{1F600}-\u{1F6FF}]/u.test(t.text)).length}/{(currentStyle.tweets?.length ?? 0)}
                        </div>
                        <div>
                          <span className="font-semibold text-[#0A0A0A]">Soru:</span>{' '}
                          {(currentStyle.tweets ?? []).filter(t => t.text.includes('?')).length}/{(currentStyle.tweets?.length ?? 0)}
                        </div>
                        <div>
                          <span className="font-semibold text-[#0A0A0A]">Satır arası:</span>{' '}
                          Ort. {Math.round((currentStyle.tweets ?? []).reduce((s, t) => s + (t.text.match(/\n/g) || []).length, 0) / (currentStyle.tweets?.length ?? 0))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!currentStyle && !analyzing && (
                <div className="card p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-none bg-[rgba(10,10,10,0.02)] flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#0A0A0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="text-[rgba(10,10,10,0.4)] font-medium">Kullanıcı adı girerek başla</div>
                  <div className="text-[rgba(10,10,10,0.4)] text-xs mt-1">Xquik otomatik olarak tweetleri çekip stilini analiz edecek.</div>
                </div>
              )}
            </div>

            {/* Saved Styles List */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-[#0A0A0A] mb-4">
                Kayıtlı Stiller {styles.length > 0 && <span className="text-[rgba(10,10,10,0.4)]">({styles.length})</span>}
              </h3>
              {styles.length === 0 ? (
                <div className="text-center py-8 text-sm text-[rgba(10,10,10,0.4)]">
                  Henüz kayıtlı stil yok.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {styles.map(style => (
                    <div
                      key={style.xUsername}
                      className={`flex items-center justify-between p-3 rounded-none cursor-pointer transition-all ${
                        currentStyle?.xUsername === style.xUsername
                          ? 'bg-[#E30A17]/[0.08] border border-[#E30A17]/15'
                          : 'bg-[rgba(10,10,10,0.02)] hover:bg-[rgba(10,10,10,0.05)]'
                      }`}
                      onClick={() => handleLoadStyle(style.xUsername)}
                    >
                      <div className="flex items-center gap-3">
                        {userCache[style.xUsername]?.profilePicture ? (
                          <img src={proxyImageUrl(userCache[style.xUsername].profilePicture)} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[rgba(10,10,10,0.06)] flex items-center justify-center text-xs font-bold text-[#0A0A0A]">
                            {style.xUsername[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-[#0A0A0A]">@{style.xUsername}</span>
                            {library.find(e => e.username === style.xUsername)?.isPinned && (
                              <span className="text-[9px] text-campaign-gold">*</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[rgba(10,10,10,0.4)]">
                            {style.tweetCount} tweet
                            {(() => { const le = library.find(e => e.username === style.xUsername); return le?.generatedCount ? ` · ${le.generatedCount} üretim` : '' })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isValidXUsername(style.xUsername) && (
                          <button
                            onClick={e => { e.stopPropagation(); toggleMonitor(style.xUsername) }}
                            className={`btn text-[10px] py-1 px-2 ${
                              monitors.some(m => m.username === style.xUsername)
                                ? 'text-[#0A0A0A] bg-[#0A0A0A]/10'
                                : 'text-[rgba(10,10,10,0.4)]'
                            }`}
                            title={monitors.some(m => m.username === style.xUsername) ? 'Canlı takip aktif' : 'Canlı takibi aç'}
                          >
                            {monitors.some(m => m.username === style.xUsername) ? 'CANLI' : 'Takip'}
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setUsername(style.xUsername); handleAnalyze(style.xUsername) }}
                          disabled={analyzing}
                          className="btn text-[10px] py-1 px-2 text-[#7856FF] hover:bg-[#7856FF]/10 disabled:opacity-50"
                          title="Stili ve DNA'yı yeniden analiz et"
                        >
                          {analyzing && username === style.xUsername ? '...' : 'Restyle'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setComposeStyle(style.xUsername); setTab('compose') }}
                          className="btn text-[10px] py-1 px-2"
                        >
                          Yaz
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteStyle(style.xUsername) }}
                          className="btn text-[10px] py-1 px-2 text-[#E30A17] hover:bg-[#E30A17]/10"
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
        <div className="space-y-6">

        {/* News context banner when coming from Haber Servisi */}
        {newsData && (
          <div className="card p-4 border-l-4 border-l-brand-red bg-[rgba(227,10,23,0.03)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-[#E30A17] tracking-wider mb-1">HABERDEN TWEET ÜRET</div>
                <p className="text-sm font-medium text-[#0A0A0A] leading-snug">{newsData.title}</p>
                {newsData.context && (
                  <p className="text-xs text-[rgba(10,10,10,0.4)] mt-1 line-clamp-2">{newsData.context}</p>
                )}
              </div>
              {newsData.url && (
                <a href={newsData.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 ml-4 px-3 py-1.5 text-[10px] font-medium text-[#E30A17] bg-[rgba(227,10,23,0.06)] hover:bg-[rgba(227,10,23,0.12)] rounded-none transition-colors">
                  Kaynağa Git
                </a>
              )}
            </div>
            <p className="text-[10px] text-[rgba(10,10,10,0.4)] mt-2">Aşağıdan stil seç, ayarları yap ve "Üret" butonuna bas.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-5">
            {/* Config */}
            <div className="card p-6">
              <div className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-widest mb-4">ADIM 01 — YAPILANDIRMA</div>
              <div className="space-y-3">
                {/* Mode tabs */}
                <div className="flex gap-1 p-1 bg-[rgba(10,10,10,0.02)] rounded-none">
                  {([
                    { key: 'tweet' as const, label: 'Tweet' },
                    { key: 'quote' as const, label: 'Quote' },
                    { key: 'reply' as const, label: 'Reply' },
                    { key: 'thread' as const, label: 'Thread' },
                  ]).map(m => (
                    <button
                      key={m.key}
                      onClick={() => setComposeMode(m.key)}
                      className={`flex-1 text-[10px] py-1.5 rounded-none font-medium transition-all ${
                        composeMode === m.key
                          ? 'bg-[#FFFFFF] text-[#0A0A0A]'
                          : 'text-[rgba(10,10,10,0.4)] hover:text-[#0A0A0A]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Style selector with profile pics */}
                <div>
                  <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-1.5">KLONLANACAK STİL</label>
                  {styles.length === 0 ? (
                    <div className="input-field px-3 py-2.5 text-sm text-[rgba(10,10,10,0.4)]">Önce bir profil analiz et</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {styles.filter(s => isValidXUsername(s.xUsername)).map(s => {
                        const pic = userCache[s.xUsername]?.profilePicture
                        const isSelected = composeStyle === s.xUsername
                        return (
                          <button
                            key={s.xUsername}
                            onClick={() => setComposeStyle(isSelected ? '' : s.xUsername)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-none border transition-all ${
                              isSelected
                                ? 'bg-[rgba(227,10,23,0.15)] border-[#E30A17]/30 ring-2 ring-brand-red/20'
                                : 'bg-[rgba(10,10,10,0.02)] border-[#0A0A0A] hover:border-[#0A0A0A]'
                            }`}
                          >
                            {pic ? (
                              <img src={proxyImageUrl(pic)} alt="" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-[rgba(10,10,10,0.06)] flex items-center justify-center text-[10px] font-bold text-[rgba(10,10,10,0.4)]">
                                {s.xUsername[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="text-left">
                              <div className="flex items-center gap-1">
                                <span className={`text-xs font-semibold ${isSelected ? 'text-[#E30A17]' : 'text-[#0A0A0A]'}`}>@{s.xUsername}</span>
                                {library.find(e => e.username === s.xUsername)?.personalityDNA && (
                                  <span className="text-[8px] px-1 py-0.5 rounded bg-[#7856FF]/10 text-[#7856FF] border border-[#7856FF]/20 font-bold">DNA</span>
                                )}
                              </div>
                              <div className="text-[10px] text-[rgba(10,10,10,0.4)]">{s.tweetCount} tweet</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Quote/Reply: tweet URL input */}
                {(composeMode === 'quote' || composeMode === 'reply') && (
                  <div>
                    <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-1.5">
                      {composeMode === 'quote' ? 'QUOTE EDILECEK TWEET' : 'REPLY YAZILACAK TWEET'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quoteTweetUrl}
                        onChange={e => setQuoteTweetUrl(e.target.value)}
                        placeholder="Tweet URL yapıştır..."
                        className="flex-1 input-field px-3 py-2 text-sm text-[#0A0A0A]"
                      />
                      <button onClick={handleFetchQuoteTweet} disabled={fetchingQuote} className="btn text-xs px-3 disabled:opacity-50">
                        {fetchingQuote ? '...' : 'Çek'}
                      </button>
                    </div>
                    {quoteTweetText && (
                      <div className="mt-2 p-3 bg-[rgba(10,10,10,0.02)] rounded-none border border-[#0A0A0A] text-xs text-[rgba(10,10,10,0.4)]">
                        <span className="font-semibold text-[#0A0A0A]">@{quoteTweetAuthor}:</span> {quoteTweetText.substring(0, 150)}{quoteTweetText.length > 150 ? '...' : ''}
                      </div>
                    )}

                    {/* Viral tweet discovery */}
                    <div className="mt-3 pt-3 border-t border-[#0A0A0A]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">VIRAL TWEET BUL</span>
                        <button
                          onClick={() => searchViralTweets(viralCategory)}
                          disabled={viralLoading}
                          className="text-[10px] text-[#E30A17] hover:text-[#E30A17] transition-colors"
                        >
                          {viralLoading ? 'Arıyor...' : 'Ara'}
                        </button>
                      </div>
                      <div className="flex gap-0.5 bg-[rgba(10,10,10,0.02)] rounded-none p-0.5 mb-2">
                        {TOPIC_CATEGORIES.map(cat => (
                          <button
                            key={cat.key}
                            onClick={() => { setViralCategory(cat.key); setViralTweets([]) }}
                            className={`flex-1 text-[9px] py-1 rounded transition-all ${
                              viralCategory === cat.key
                                ? 'bg-[#FFFFFF] text-[#0A0A0A] font-medium'
                                : 'text-[rgba(10,10,10,0.4)] hover:text-[#0A0A0A]'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                      {viralLoading && (
                        <div className="flex items-center justify-center py-4 text-[rgba(10,10,10,0.4)]">
                          <svg className="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                          <span className="text-[10px]">Viral tweet'ler aranıyor...</span>
                        </div>
                      )}
                      {viralTweets.length > 0 && (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {viralTweets.map(vt => (
                            <div key={vt.id} className="bg-[#FFFFFF] rounded-none p-2.5 border border-[#0A0A0A] hover:border-[#E30A17]/20 transition-colors group">
                              <p className="text-[11px] text-[#0A0A0A] leading-relaxed line-clamp-3">{vt.text}</p>
                              <div className="flex items-center justify-between mt-1.5">
                                <div className="flex items-center gap-3 text-[10px] text-[rgba(10,10,10,0.4)]">
                                  <span className="font-medium">@{vt.author}</span>
                                  <span>♥ {vt.likeCount.toLocaleString()}</span>
                                  {vt.retweetCount > 0 && <span>↻ {vt.retweetCount.toLocaleString()}</span>}
                                </div>
                                <button
                                  onClick={() => {
                                    setQuoteTweetText(vt.text)
                                    setQuoteTweetAuthor(vt.author)
                                  }}
                                  className="text-[10px] text-[#E30A17] hover:text-[#E30A17] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Quote Et
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Topic (tweet + thread modes) */}
                {(composeMode === 'tweet' || composeMode === 'thread') && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">KONU</label>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5 bg-[rgba(10,10,10,0.02)] rounded-none p-0.5">
                          {TOPIC_CATEGORIES.map(cat => (
                            <button
                              key={cat.key}
                              onClick={() => { setTopicCategory(cat.key); setTopicSuggestions([]); setExpandedTopic(null) }}
                              className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${
                                topicCategory === cat.key
                                  ? 'bg-[#FFFFFF] text-[#0A0A0A] font-medium'
                                  : 'text-[rgba(10,10,10,0.4)] hover:text-[#0A0A0A]'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={loadTopicSuggestions}
                          disabled={loadingTopics}
                          className="text-[10px] text-[#E30A17] hover:text-[#E30A17] transition-colors"
                        >
                          {loadingTopics ? 'Yükleniyor...' : 'Öner'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={composeTopic}
                      onChange={e => setComposeTopic(e.target.value)}
                      placeholder="Istanbul bekliyor, ozgurluk, demokrasi..."
                      className="w-full input-field px-3 py-2 text-sm text-[#0A0A0A]"
                    />
                    {topicSuggestions.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {topicSuggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => { setComposeTopic(s.title); setTopicContext(s.context || ''); setExpandedTopic(null) }}
                              className={`text-[10px] px-2 py-1 rounded-none border transition-all hover:scale-105 ${
                                composeTopic === s.title ? 'ring-2 ring-offset-1 ' : ''
                              }${
                                s.source === 'campaign' ? 'bg-[rgba(227,10,23,0.15)] text-[#E30A17] border-[#E30A17]/20' :
                                s.source === 'live' ? 'bg-[#0A0A0A]/10 text-[#0A0A0A] border-[#0A0A0A]/20' :
                                'bg-[rgba(10,10,10,0.02)] text-[rgba(10,10,10,0.4)] border-[#0A0A0A]'
                              }`}
                              title={s.reason}
                            >
                              {s.title}
                              {s.tweets && s.tweets.length > 0 && (
                                <span
                                  className="ml-1 opacity-60 hover:opacity-100"
                                  onClick={(e) => { e.stopPropagation(); setExpandedTopic(expandedTopic === i ? null : i) }}
                                >
                                  ▾
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        {/* Expanded topic tweet cards */}
                        {expandedTopic !== null && topicSuggestions[expandedTopic]?.tweets && topicSuggestions[expandedTopic].tweets!.length > 0 && (
                          <div className="bg-[rgba(10,10,10,0.01)] rounded-none border border-[#0A0A0A] p-3 space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">
                                {topicSuggestions[expandedTopic].title}
                              </span>
                              <button onClick={() => setExpandedTopic(null)} className="text-[rgba(10,10,10,0.4)] hover:text-[#0A0A0A] text-xs">✕</button>
                            </div>
                            {topicSuggestions[expandedTopic].tweets!.map((tw, ti) => (
                              <div key={ti} className="bg-[#FFFFFF] rounded-none p-3 border border-[#0A0A0A]">
                                <p className="text-[11px] text-[#0A0A0A] leading-relaxed">{tw.text}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[rgba(10,10,10,0.4)]">
                                  {tw.author && <span className="font-medium">@{tw.author}</span>}
                                  <span className="flex items-center gap-0.5">♥ {tw.likeCount.toLocaleString()}</span>
                                  {tw.retweetCount > 0 && <span className="flex items-center gap-0.5">↻ {tw.retweetCount.toLocaleString()}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* User hint — optional context/direction for generation */}
                    <div className="mt-2">
                      <button
                        onClick={() => setShowHint(!showHint)}
                        className="text-[10px] text-[rgba(10,10,10,0.4)] hover:text-[#0A0A0A] transition-colors flex items-center gap-1"
                      >
                        <span className={`transition-transform ${showHint ? 'rotate-90' : ''}`}>▸</span>
                        {showHint ? 'İpucu gizle' : 'İpucu ekle (opsiyonel)'}
                        {userHint.trim() && !showHint && <span className="w-1.5 h-1.5 rounded-full bg-[#E30A17]" />}
                      </button>
                      {showHint && (
                        <textarea
                          value={userHint}
                          onChange={e => setUserHint(e.target.value)}
                          placeholder="Tweet'in konusuna dair detay yaz... Örn: 'yağmurlu bir akşam, vapurda eve dönüş, camdan dışarı bakmak'"
                          rows={2}
                          maxLength={280}
                          className="w-full input-field px-3 py-2 text-xs text-[#0A0A0A] mt-1.5 resize-none"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Ton + Hedef + Count row */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-1.5">TON</label>
                    <select value={composeTone} onChange={e => setComposeTone(e.target.value)}
                      className="w-full input-field px-2 py-2 text-xs text-[#0A0A0A]">
                      <option value="duygusal, umut dolu">Umutlu</option>
                      <option value="sarkastik, keskin">Sarkastik</option>
                      <option value="ofkeli, isyankar">Öfkeli</option>
                      <option value="siirsel, duygusal">Şiirsel</option>
                      <option value="samimi, sokak agzi">Samimi</option>
                      <option value="ciddi, resmi">Resmi</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-1.5">HEDEF</label>
                    <select value={composeGoal} onChange={e => setComposeGoal(e.target.value)}
                      className="w-full input-field px-2 py-2 text-xs text-[#0A0A0A]">
                      <option value="engagement">Etkileşim</option>
                      <option value="followers">Takipçi</option>
                      <option value="authority">Otorite</option>
                      <option value="conversation">Sohbet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-1.5">
                      {composeMode === 'thread' ? 'TWEET' : 'ADET'}
                    </label>
                    {composeMode === 'thread' ? (
                      <div className="input-field px-2 py-2 text-xs text-[rgba(10,10,10,0.4)] text-center">4-8</div>
                    ) : (
                      <select value={tweetCount} onChange={e => setTweetCount(Number(e.target.value))}
                        className="w-full input-field px-2 py-2 text-xs text-[#0A0A0A]">
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
                    <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-1.5">UZUNLUK</label>
                    <div className="flex gap-1.5">
                      {[
                        { value: '', label: 'Otomatik' },
                        { value: 'kisa', label: 'Kısa' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'uzun', label: 'Uzun' },
                      ].map(f => (
                        <button
                          key={f.value}
                          onClick={() => setLengthHint(f.value)}
                          className={`flex-1 text-[10px] py-1.5 rounded-none border transition-all ${
                            lengthHint === f.value
                              ? 'bg-[rgba(227,10,23,0.15)] text-[#E30A17] border-[#E30A17]/20 font-bold'
                              : 'text-[rgba(10,10,10,0.4)] border-[#0A0A0A] hover:text-[#0A0A0A]'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">ÜRETİM MODU</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCloneMode(true)}
                      className={`text-[10px] px-3 py-1.5 rounded-none border transition-all ${
                        cloneMode
                          ? 'bg-[rgba(227,10,23,0.15)] text-[#E30A17] border-[#E30A17]/20 font-bold'
                          : 'text-[rgba(10,10,10,0.4)] border-[#0A0A0A] hover:text-[#0A0A0A]'
                      }`}
                    >
                      Birebir Klon
                    </button>
                    <button
                      onClick={() => setCloneMode(false)}
                      className={`text-[10px] px-3 py-1.5 rounded-none border transition-all ${
                        !cloneMode
                          ? 'bg-[#E30A17]/10 text-[#E30A17] border-[#E30A17]/20 font-bold'
                          : 'text-[rgba(10,10,10,0.4)] border-[#0A0A0A] hover:text-[#0A0A0A]'
                      }`}
                    >
                      Optimize
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleGetGuidance}
                    disabled={loading || !composeTopic.trim() || !composeStyle || composeMode === 'quote' || composeMode === 'reply'}
                    className="btn w-full justify-center disabled:opacity-50 text-xs"
                  >
                    {loading ? 'Rehber...' : 'Rehber al'}
                  </button>
                  <button
                    onClick={handleAutoGenerate}
                    disabled={generating || !composeStyle || (
                      (composeMode === 'tweet' || composeMode === 'thread') ? !composeTopic.trim() :
                      !quoteTweetText
                    )}
                    className="btn btn-primary w-full justify-center disabled:opacity-50 text-xs"
                  >
                    {generating ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                        Üretiyor...
                      </span>
                    ) : 'Otomatik Üret'}
                  </button>
                  {composeMode === 'tweet' && (
                    <button
                      onClick={handleTrendGenerate}
                      disabled={trendLoading || !composeStyle}
                      className="btn w-full justify-center disabled:opacity-50 text-xs bg-[#0A0A0A]/10 text-[#0A0A0A] border-[#0A0A0A]/20 hover:bg-[#0A0A0A]/20"
                    >
                      {trendLoading ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                          Trend...
                        </span>
                      ) : 'Trend\'den Üret'}
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right: Score + Reference */}
          <div className="space-y-5">
            {scoreResult && (
              <div className={`card rounded-none p-6 ${scoreResult.passed
                ? 'bg-[#0A0A0A]/10 border border-[#0A0A0A]/20'
                : 'bg-[#E30A17]/10 border border-[#E30A17]/20'
              }`}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">ALGORİTMA SKORU</label>
                    <div className="text-xs text-[rgba(10,10,10,0.4)] mt-1">{scoreResult.topSuggestion}</div>
                  </div>
                  <div className="text-right">
                    <span className={`stat-number text-5xl ${scoreResult.passed ? 'text-[#0A0A0A]' : 'text-[#E30A17]'}`}>
                      {scoreResult.passedCount}
                    </span>
                    <span className="text-lg text-[rgba(10,10,10,0.4)]">/{scoreResult.totalChecks}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {scoreResult.checklist.map((check, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={`text-xs font-bold ${check.passed ? 'text-[#0A0A0A]' : 'text-[#E30A17]'}`}>
                        {check.passed ? '✓' : '✕'}
                      </span>
                      <span className={check.passed ? 'text-[rgba(10,10,10,0.4)]' : 'text-[#0A0A0A] font-medium'}>
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
            {publishError && (
              <div className="bg-[#E30A17]/10 rounded-none p-3 border border-[#E30A17]/20">
                <div className="text-xs text-[#E30A17]">{publishError}</div>
              </div>
            )}
            {generatedTweets.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-widest">
                    {composeMode === 'thread' ? `THREAD — ${generatedTweets.length} TWEET` : 'ÜRETİLEN TWEETLER'}
                  </div>
                  <div className="flex items-center gap-2">
                    {composeMode === 'thread' && generatedTweets.length > 1 && (
                      <CopyBtn
                        text={generatedTweets.map((gt, i) => `${i + 1}/ ${gt.tweet}`).join('\n\n')}
                        label="Tümünü Kopyala"
                      />
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-none ${
                      cloneMode
                        ? 'bg-[rgba(227,10,23,0.15)] text-[#E30A17]'
                        : 'bg-[#E30A17]/10 text-[#E30A17]'
                    }`}>
                      {cloneMode ? 'Birebir Klon' : 'Optimize'}
                    </span>
                  </div>
                </div>

                {/* Thread mode: connected chain visual */}
                {composeMode === 'thread' && (
                  <div className="text-[10px] text-[rgba(10,10,10,0.4)] mb-3 flex items-center gap-1.5">
                    <span>↳</span> Her tweet öncekine reply olarak atılır (self-reply zinciri)
                  </div>
                )}

                {generateWarnings.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {generateWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-none bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] text-[11px]">
                        <span className="mt-0.5 shrink-0">&#9888;</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className={composeMode === 'thread' ? 'space-y-0' : 'space-y-3'}>
                  {generatedTweets.map((gt, i) => {
                    // In clone mode: if only CTA failed, treat as "style pass"
                    const hasStyleOverride = (gt.styleOverrides?.length ?? 0) > 0
                    const isStylePass = hasStyleOverride && !gt.score?.passed && gt.score
                      ? gt.score.checklist?.filter(c => !c.passed).every(c => c.factor.includes('CTA'))
                      : false
                    const displayPassed = gt.score?.passed || isStylePass
                    const isThread = composeMode === 'thread'

                    return (
                      <div key={i} className={`relative ${isThread ? 'pl-8' : ''}`}>
                        {/* Thread chain line + number */}
                        {isThread && (
                          <>
                            <div className="absolute left-3 top-0 bottom-0 w-px bg-[rgba(10,10,10,0.06)]" />
                            <div className={`absolute left-0 top-4 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 ${
                              i === 0
                                ? 'bg-[#E30A17] text-white'
                                : displayPassed
                                  ? 'bg-[#0A0A0A]/20 text-[#0A0A0A] border border-[#0A0A0A]/30'
                                  : 'bg-[rgba(10,10,10,0.04)] text-[rgba(10,10,10,0.4)] border border-[#0A0A0A]'
                            }`}>
                              {i + 1}
                            </div>
                          </>
                        )}
                        <div className={`${isThread ? 'py-3' : ''} ${!isThread ? `p-4 rounded-none border ${
                          displayPassed
                            ? 'bg-[#0A0A0A] border-[#0A0A0A]/20'
                            : 'bg-[rgba(10,10,10,0.02)] border-[#0A0A0A]'
                        }` : ''}`}>
                          <p className="text-sm text-[#0A0A0A] leading-relaxed whitespace-pre-line">{gt.tweet}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {gt.score && (
                                <span className={`text-[10px] font-bold ${displayPassed ? 'text-[#0A0A0A]' : 'text-[#D4A843]'}`}>
                                  {gt.score.count}/{gt.score.total}
                                </span>
                              )}
                              {isStylePass && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(10,10,10,0.04)] text-[rgba(10,10,10,0.4)]">
                                  stil uyumu
                                </span>
                              )}
                              <span className="text-[10px] text-[rgba(10,10,10,0.4)]">{gt.tweet.length} chr</span>
                              {gt.styleMatch != null && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${gt.styleMatch >= 80 ? 'bg-[#0A0A0A]/10 text-[#0A0A0A]' : gt.styleMatch >= 60 ? 'bg-[#D4A843]/10 text-[#D4A843]' : 'bg-[#E30A17]/10 text-[#E30A17]'}`}>
                                  stil {gt.styleMatch}%
                                </span>
                              )}
                              {isThread && i === 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(227,10,23,0.15)] text-[#E30A17] font-medium">
                                  hook
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CopyBtn text={gt.tweet} />
                              {xAccounts.length > 0 && !publishSuccess[i] && (
                                <button
                                  onClick={() => handlePublish(gt.tweet, i)}
                                  disabled={publishing === i}
                                  className="text-[10px] px-2 py-1 rounded-none border border-[#E30A17]/20 text-[#E30A17] hover:bg-[rgba(227,10,23,0.15)] transition-all disabled:opacity-50"
                                >
                                  {publishing === i ? 'Gönderiliyor...' : 'Paylaş'}
                                </button>
                              )}
                              {publishSuccess[i] && (
                                <span className="text-[10px] text-[#0A0A0A] font-bold">
                                  Paylaşıldı
                                </span>
                              )}
                            </div>
                          </div>
                          {hasStyleOverride && (
                            <div className="mt-1.5 text-[10px] text-[rgba(10,10,10,0.4)] italic">
                              {gt.styleOverrides?.join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Style reference */}
            {composeStyle && (
              <div className="card p-6">
                <div className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider mb-3">REFERANS: @{composeStyle}</div>
                <StyleReference username={composeStyle} styles={styles} />
              </div>
            )}

            {/* How it works */}
            <div className="card p-6">
              <div >
                <h3 className="text-sm font-bold text-[#0A0A0A]">Akış</h3>
              </div>
              <div className="space-y-2 mt-3">
                {[
                  { n: '01', t: 'Kullanıcı adı gir', d: 'Xquik otomatik tweetleri çeker' },
                  { n: '02', t: 'Stil profili oluşur', d: 'Uzunluk, ton, kalıp analizi' },
                  { n: '03', t: 'Konu + ton seç', d: 'Rehber ve kalıpları al' },
                  { n: '04', t: 'Otomatik üret', d: '11 kontrol testi ile skorlanmış tweetler' },
                ].map(s => (
                  <div key={s.n} className="flex gap-3 items-start p-2">
                    <span className="w-6 h-6 rounded-none bg-[rgba(227,10,23,0.15)] text-[#E30A17] text-[10px] font-bold flex items-center justify-center flex-shrink-0">{s.n}</span>
                    <div>
                      <div className="text-xs font-medium text-[#0A0A0A]">{s.t}</div>
                      <div className="text-[10px] text-[rgba(10,10,10,0.4)]">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Inline Algorithm Check Card ── */}
        <div className="mt-6">
          <button
            onClick={() => setCheckOpen(!checkOpen)}
            className="flex items-center gap-2 text-[11px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider hover:text-[#0A0A0A] transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${checkOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2"><path d="M4 2l4 4-4 4"/></svg>
            TWEET KONTROL
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${checkOpen ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <div className="card p-5">
              <textarea
                value={checkText}
                onChange={e => setCheckText(e.target.value)}
                rows={4}
                className="w-full input-field p-3 text-sm text-[#0A0A0A] leading-relaxed resize-none"
                placeholder="Tweet metnini yapıştır, algoritma + kampanya kontrolü yap..."
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[10px] ${checkText.length > 280 ? 'text-[#E30A17]' : 'text-[rgba(10,10,10,0.4)]'}`}>
                  {checkText.length}/280
                </span>
                <div className="flex gap-2">
                  {checkText.trim() && <CopyBtn text={checkText} />}
                  <button
                    onClick={() => handleCheck(checkText)}
                    disabled={checkLoading || checkText.trim().length < 10}
                    className="btn btn-primary text-[10px] py-1.5 px-3 disabled:opacity-50"
                  >
                    {checkLoading ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                    ) : 'Kontrol Et'}
                  </button>
                </div>
              </div>

              {/* Results */}
              {(checkResult || campaignCheck) && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Xquik 11 check */}
                  {checkResult && (
                    <div className={`rounded-none p-3 ${checkResult.passed ? getScoreBg(100) : getScoreBg(Math.round((checkResult.passedCount / checkResult.totalChecks) * 100))}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">ALGORİTMA</span>
                        <span className={`text-lg font-bold ${checkResult.passed ? 'text-[#0A0A0A]' : getScoreColor(Math.round((checkResult.passedCount / checkResult.totalChecks) * 100))}`}>
                          {checkResult.passedCount}/{checkResult.totalChecks}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {checkResult.checklist.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px]">
                            <span className={c.passed ? 'text-[#0A0A0A]' : 'text-[#E30A17]'}>{c.passed ? '✓' : '✕'}</span>
                            <span className={c.passed ? 'text-[rgba(10,10,10,0.4)]' : 'text-[#0A0A0A]'}>{c.factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campaign 3 check */}
                  {campaignCheck && (
                    <div className={`rounded-none p-3 ${getScoreBg(campaignCheck.score)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">KAMPANYA</span>
                        <span className={`text-lg font-bold ${getScoreColor(campaignCheck.score)}`}>
                          {campaignCheck.checks.filter(c => c.passed).length}/{campaignCheck.checks.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {campaignCheck.checks.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px]">
                            <span className={c.passed ? 'text-[#0A0A0A]' : 'text-[#E30A17]'}>{c.passed ? '✓' : '✕'}</span>
                            <span className={c.passed ? 'text-[rgba(10,10,10,0.4)]' : 'text-[#0A0A0A]'}>{c.rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
              <div className="text-[rgba(10,10,10,0.4)] font-medium">Henüz taslak yok.</div>
              <div className="text-[rgba(10,10,10,0.4)] text-sm mt-1">Tweet üretip skor kontrolünden geçirdiğinde otomatik kaydedilir.</div>
            </div>
          ) : (
            drafts.map(draft => (
              <div key={draft.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="chip bg-[rgba(227,10,23,0.15)] text-[#E30A17] border-[#E30A17]/20 text-[10px]">@{draft.styleUsername}</span>
                    {draft.topic && <span className="text-xs text-[rgba(10,10,10,0.4)]">{draft.topic}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {draft.score !== undefined && (
                      <span className={`chip text-[10px] ${
                        draft.score === 11 ? 'bg-[#0A0A0A]/10 text-[#0A0A0A] border-[#0A0A0A]/20'
                        : 'bg-[#D4A843]/10 text-[#D4A843] border-[#D4A843]/20'
                      }`}>{draft.score}/11</span>
                    )}
                    <CopyBtn text={draft.text} />
                    <button
                      onClick={() => { deleteDraft(draft.id); setDrafts(getSavedDrafts()) }}
                      className="btn text-[10px] py-1 px-2 text-[#E30A17] hover:bg-[#E30A17]/10"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <div className="text-sm text-[#0A0A0A] whitespace-pre-line leading-relaxed">{draft.text}</div>
                <div className="text-[10px] text-[rgba(10,10,10,0.4)] mt-2">{new Date(draft.createdAt).toLocaleString('tr-TR')}</div>
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
  if (!style || !style.tweets?.length) return <div className="text-xs text-[rgba(10,10,10,0.4)]">Stil verisi yok.</div>

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {style.tweets.slice(0, 5).map((tweet) => (
        <div key={tweet.id} className="bg-[rgba(10,10,10,0.02)] rounded-none p-2.5 text-xs text-[rgba(10,10,10,0.4)] border border-[#0A0A0A]">
          {tweet.text}
        </div>
      ))}
    </div>
  )
}
