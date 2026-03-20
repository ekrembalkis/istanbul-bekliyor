import { useState, useEffect } from 'react'
import { CopyBtn } from '../components/CopyBtn'
import { getSavedStyles, saveStyle, deleteStyle, getStyle, saveDraft, getSavedDrafts, deleteDraft } from '../lib/xquik'
import type { StyleProfile, Draft } from '../lib/xquik'

type Tab = 'analyze' | 'compose' | 'drafts'

export default function StyleClone() {
  const [tab, setTab] = useState<Tab>('analyze')

  // ── Analyze State ──
  const [username, setUsername] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentStyle, setCurrentStyle] = useState<StyleProfile | null>(null)
  const [savedStyles, setSavedStyles] = useState<StyleProfile[]>([])
  const [manualTweets, setManualTweets] = useState('')
  const [styleLabel, setStyleLabel] = useState('')
  const [error, setError] = useState('')

  // ── Compose State ──
  const [composeTopic, setComposeTopic] = useState('')
  const [composeStyle, setComposeStyle] = useState('')
  const [composeTone, setComposeTone] = useState('duygusal, umut dolu')
  const [composeGoal, setComposeGoal] = useState('engagement')
  const [composeDraft, setComposeDraft] = useState('')
  const [composeStep, setComposeStep] = useState<'idle' | 'guidance' | 'scoring' | 'done'>('idle')
  const [guidance, setGuidance] = useState<string[]>([])
  const [patterns, setPatterns] = useState<{ pattern: string; description: string }[]>([])
  const [scoreResult, setScoreResult] = useState<{
    passed: boolean; passedCount: number; totalChecks: number;
    topSuggestion: string; intentUrl: string;
    checklist: { factor: string; passed: boolean }[]
  } | null>(null)
  const [composing, setComposing] = useState(false)

  // ── Drafts ──
  const [drafts, setDrafts] = useState<Draft[]>([])

  useEffect(() => {
    setSavedStyles(getSavedStyles())
    setDrafts(getSavedDrafts())
  }, [])

  // ── API INFO BANNER ──
  const ApiBanner = () => (
    <div className="card border-l-4 border-l-brand-red p-5 bg-brand-red-light dark:bg-brand-red/5">
      <div className="text-xs font-bold text-brand-red mb-2 tracking-wider">XQUIK API ENTEGRASYONu</div>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        Bu sayfa <strong>Xquik MCP</strong> araçlarını kullanır. Stil analizi, tweet kompozisyonu ve skor kontrolü
        Claude Code panelinden çalıştırılır ve sonuçlar buraya aktarılır.
        Aşağıdaki <strong>"Manuel Stil Kaydet"</strong> ile tweet örneklerini yapıştırarak ücretsiz stil profili oluşturabilirsin.
      </p>
    </div>
  )

  // ── ANALYZE TAB ──
  const handleSaveManualStyle = () => {
    if (!username.trim()) { setError('Kullanıcı adı gir'); return }
    const tweets = manualTweets.split('\n---\n').filter(t => t.trim())
    if (tweets.length < 3) { setError('En az 3 tweet örneği gir (--- ile ayır)'); return }

    const style: StyleProfile = {
      xUsername: username.trim().replace('@', ''),
      tweetCount: tweets.length,
      isOwnAccount: false,
      fetchedAt: new Date().toISOString(),
      tweets: tweets.map((text, i) => ({
        id: `manual_${Date.now()}_${i}`,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        authorUsername: username.trim().replace('@', '')
      }))
    }

    saveStyle(style)
    setSavedStyles(getSavedStyles())
    setCurrentStyle(style)
    setManualTweets('')
    setStyleLabel('')
    setError('')
  }

  const handleLoadStyle = (uname: string) => {
    const style = getStyle(uname)
    if (style) {
      setCurrentStyle(style)
      setUsername(uname)
    }
  }

  const handleDeleteStyle = (uname: string) => {
    deleteStyle(uname)
    setSavedStyles(getSavedStyles())
    if (currentStyle?.xUsername === uname) setCurrentStyle(null)
  }

  // ── Paste from Xquik MCP result ──
  const [importJson, setImportJson] = useState('')
  const handleImportStyle = () => {
    try {
      const data = JSON.parse(importJson)
      if (data.xUsername && data.tweets) {
        saveStyle(data as StyleProfile)
        setSavedStyles(getSavedStyles())
        setCurrentStyle(data as StyleProfile)
        setImportJson('')
        setError('')
      } else {
        setError('Geçersiz stil verisi. xUsername ve tweets alanları gerekli.')
      }
    } catch {
      setError('Geçersiz JSON formatı.')
    }
  }

  // ── COMPOSE TAB ──
  const handleImportGuidance = (json: string) => {
    try {
      const data = JSON.parse(json)
      if (data.compositionGuidance) {
        setGuidance(data.compositionGuidance)
        setPatterns(data.examplePatterns || [])
        setComposeStep('guidance')
      }
    } catch { setError('Geçersiz rehber verisi.') }
  }

  const handleImportScore = (json: string) => {
    try {
      const data = JSON.parse(json)
      if (data.checklist) {
        setScoreResult(data)
        setComposeStep('done')

        // Auto-save draft
        if (composeDraft.trim()) {
          saveDraft({
            id: `draft_${Date.now()}`,
            text: composeDraft,
            topic: composeTopic,
            styleUsername: composeStyle,
            score: data.passedCount,
            scoreChecklist: data.checklist,
            createdAt: new Date().toISOString()
          })
          setDrafts(getSavedDrafts())
        }
      }
    } catch { setError('Geçersiz skor verisi.') }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header">
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Stil Klonlama</h1>
        <p className="text-sm text-slate-400 mt-1">
          X profillerini analiz et, yazım stilini kopyala, birebir aynı tonda tweet üret.
        </p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1.5 border-b border-slate-200 dark:border-white/[0.06] pb-0">
        {([
          { key: 'analyze' as Tab, label: 'Profil Analizi', count: savedStyles.length },
          { key: 'compose' as Tab, label: 'Tweet Üret', count: 0 },
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
            {t.count > 0 && <span className="ml-1.5 text-[10px] chip py-0 px-1.5">{t.count}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="card border-l-4 border-l-red-500 p-4 bg-red-50 dark:bg-red-500/5">
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        </div>
      )}

      {/* ═══════════ ANALYZE TAB ═══════════ */}
      {tab === 'analyze' && (
        <div className="space-y-6">
          <ApiBanner />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input */}
            <div className="space-y-5">
              {/* Manuel Stil Kaydetme */}
              <div className="card p-6">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">Manuel Stil Kaydet</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">KULLANICI ADI</label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="@kullaniciadi"
                      className="w-full input-field px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">
                      TWEET ÖRNEKLERİ <span className="text-slate-300 dark:text-slate-600">(--- ile ayır, min 3 tweet)</span>
                    </label>
                    <textarea
                      value={manualTweets}
                      onChange={e => setManualTweets(e.target.value)}
                      rows={8}
                      className="w-full input-field p-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed resize-none"
                      placeholder={"İlk tweet örneği buraya...\n---\nİkinci tweet örneği buraya...\n---\nÜçüncü tweet örneği buraya..."}
                    />
                  </div>
                  <button onClick={handleSaveManualStyle} className="btn btn-primary w-full justify-center">
                    Stil Profilini Kaydet
                  </button>
                </div>
              </div>

              {/* Xquik JSON Import */}
              <div className="card p-6">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">Xquik API Sonucu İçe Aktar</h3>
                <p className="text-xs text-slate-400 mb-3">
                  Claude Code'dan Xquik stil analizi sonucunu (JSON) buraya yapıştır.
                </p>
                <textarea
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  rows={4}
                  className="w-full input-field p-3 text-xs font-mono text-slate-500 dark:text-slate-400 resize-none"
                  placeholder='{"xUsername": "...", "tweets": [...], "tweetCount": ..., ...}'
                />
                <button
                  onClick={handleImportStyle}
                  disabled={!importJson.trim()}
                  className="btn w-full justify-center mt-3 disabled:opacity-40"
                >
                  JSON'dan İçe Aktar
                </button>
              </div>
            </div>

            {/* Right: Current Style + Saved */}
            <div className="space-y-5">
              {/* Current Style Display */}
              {currentStyle && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-700 dark:text-slate-200">@{currentStyle.xUsername}</h3>
                      <div className="text-xs text-slate-400 mt-0.5">{currentStyle.tweetCount} tweet · {new Date(currentStyle.fetchedAt).toLocaleDateString('tr-TR')}</div>
                    </div>
                    <div className="chip bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
                      AKTİF
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {currentStyle.tweets.map((tweet, i) => (
                      <div key={tweet.id} className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 border border-slate-100 dark:border-white/[0.06]">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5 flex-shrink-0">{i + 1}</span>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{tweet.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Style Analysis Summary */}
                  <div className="mt-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06]">
                    <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">STİL ANALİZİ</div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Ort. uzunluk:</span>{' '}
                        {Math.round(currentStyle.tweets.reduce((sum, t) => sum + t.text.length, 0) / (currentStyle.tweets.length || 1))} karakter
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Emoji kullanımı:</span>{' '}
                        {currentStyle.tweets.filter(t => /[\u{1F600}-\u{1F6FF}]/u.test(t.text)).length}/{currentStyle.tweets.length}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Soru içeren:</span>{' '}
                        {currentStyle.tweets.filter(t => t.text.includes('?')).length}/{currentStyle.tweets.length}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Link içeren:</span>{' '}
                        {currentStyle.tweets.filter(t => /https?:\/\//.test(t.text)).length}/{currentStyle.tweets.length}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Saved Styles List */}
              <div className="card p-6">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4">
                  Kayıtlı Stiller {savedStyles.length > 0 && <span className="text-slate-400">({savedStyles.length})</span>}
                </h3>
                {savedStyles.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-slate-400 text-sm">Henüz kayıtlı stil yok.</div>
                    <div className="text-slate-300 dark:text-slate-600 text-xs mt-1">Tweet örnekleri yapıştırarak başla.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedStyles.map(style => (
                      <div
                        key={style.xUsername}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                          currentStyle?.xUsername === style.xUsername
                            ? 'bg-brand-red/[0.05] dark:bg-brand-red/[0.08] border border-brand-red/15'
                            : 'bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                        }`}
                        onClick={() => handleLoadStyle(style.xUsername)}
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">@{style.xUsername}</div>
                          <div className="text-[10px] text-slate-400">{style.tweetCount} tweet</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); setComposeStyle(style.xUsername); setTab('compose') }}
                            className="btn text-[10px] py-1 px-2"
                          >
                            Kullan
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteStyle(style.xUsername) }}
                            className="btn text-[10px] py-1 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ COMPOSE TAB ═══════════ */}
      {tab === 'compose' && (
        <div className="space-y-6">
          <ApiBanner />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Compose Controls */}
            <div className="space-y-5">
              {/* Step 1: Config */}
              <div className="card p-6">
                <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-4">ADIM 01 — YAPILANDIRMA</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">KLONLANACAK STİL</label>
                    <select
                      value={composeStyle}
                      onChange={e => setComposeStyle(e.target.value)}
                      className="w-full input-field px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                    >
                      <option value="">Stil seç...</option>
                      {savedStyles.map(s => (
                        <option key={s.xUsername} value={s.xUsername}>@{s.xUsername} ({s.tweetCount} tweet)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">KONU</label>
                    <input
                      type="text"
                      value={composeTopic}
                      onChange={e => setComposeTopic(e.target.value)}
                      placeholder="İstanbul bekliyor, özgürlük, demokrasi..."
                      className="w-full input-field px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">TON</label>
                      <input
                        type="text"
                        value={composeTone}
                        onChange={e => setComposeTone(e.target.value)}
                        placeholder="duygusal, umut dolu"
                        className="w-full input-field px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">HEDEF</label>
                      <select
                        value={composeGoal}
                        onChange={e => setComposeGoal(e.target.value)}
                        className="w-full input-field px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <option value="engagement">Etkileşim</option>
                        <option value="followers">Takipçi</option>
                        <option value="authority">Otorite</option>
                        <option value="conversation">Sohbet</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Command hint */}
                <div className="mt-4 bg-slate-50 dark:bg-white/[0.03] rounded-lg p-3 border border-slate-100 dark:border-white/[0.06]">
                  <div className="text-[10px] font-bold text-brand-red mb-1">CLAUDE CODE KOMUTU</div>
                  <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed block">
                    Xquik compose → step: "refine", topic: "{composeTopic || '...'}",
                    tone: "{composeTone}", goal: "{composeGoal}",
                    styleUsername: "{composeStyle || '...'}"
                  </code>
                </div>
              </div>

              {/* Step 2: Import guidance or write draft */}
              <div className="card p-6">
                <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-4">ADIM 02 — REHBER & TASLAK</div>
                {composeStep === 'idle' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">Claude Code'dan kompozisyon rehberini (JSON) yapıştır:</p>
                    <textarea
                      rows={4}
                      className="w-full input-field p-3 text-xs font-mono text-slate-500 dark:text-slate-400 resize-none"
                      placeholder='{"compositionGuidance": [...], "examplePatterns": [...]}'
                      onKeyDown={e => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleImportGuidance((e.target as HTMLTextAreaElement).value)
                        }
                      }}
                      onChange={e => {
                        const val = e.target.value.trim()
                        if (val.endsWith('}')) {
                          try { JSON.parse(val); handleImportGuidance(val) } catch {}
                        }
                      }}
                    />
                    <p className="text-[10px] text-slate-400">Veya rehber olmadan doğrudan taslak yaz:</p>
                    <button onClick={() => setComposeStep('guidance')} className="btn w-full justify-center">
                      Doğrudan Taslak Yaz →
                    </button>
                  </div>
                )}

                {(composeStep === 'guidance' || composeStep === 'scoring' || composeStep === 'done') && (
                  <div className="space-y-4">
                    {/* Show guidance if available */}
                    {guidance.length > 0 && (
                      <details className="group">
                        <summary className="text-xs font-semibold text-brand-gold cursor-pointer">
                          Kompozisyon Rehberi ({guidance.length} kural)
                        </summary>
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                          {guidance.slice(0, 8).map((g, i) => (
                            <div key={i} className="text-[11px] text-slate-400 flex gap-2">
                              <span className="text-brand-gold flex-shrink-0">•</span>
                              <span>{g}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {patterns.length > 0 && (
                      <details className="group">
                        <summary className="text-xs font-semibold text-blue-500 cursor-pointer">
                          Örnek Kalıplar ({patterns.length})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {patterns.map((p, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-white/[0.03] rounded-lg p-2 text-[11px]">
                              <div className="font-medium text-slate-600 dark:text-slate-300">{p.description}</div>
                              <div className="text-slate-400 font-mono mt-0.5">{p.pattern}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Draft Editor */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">TWEET TASLAĞI</label>
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
                        <CopyBtn text={composeDraft} label="Kopyala" />
                      </div>
                    </div>

                    {/* Score command hint */}
                    <div className="bg-slate-50 dark:bg-white/[0.03] rounded-lg p-3 border border-slate-100 dark:border-white/[0.06]">
                      <div className="text-[10px] font-bold text-brand-red mb-1">SKOR KONTROLÜ İÇİN</div>
                      <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed block">
                        Xquik compose → step: "score", draft: "...", hasMedia: true
                      </code>
                    </div>

                    {/* Score Import */}
                    {composeStep !== 'done' && (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Skor sonucunu (JSON) yapıştır:</p>
                        <textarea
                          rows={3}
                          className="w-full input-field p-3 text-xs font-mono text-slate-500 dark:text-slate-400 resize-none"
                          placeholder='{"passed": true, "passedCount": 11, "checklist": [...]}'
                          onChange={e => {
                            const val = e.target.value.trim()
                            if (val.endsWith('}')) {
                              try { JSON.parse(val); handleImportScore(val) } catch {}
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Score Results + Style Reference */}
            <div className="space-y-5">
              {/* Score Result */}
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
                    <a
                      href={scoreResult.intentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary w-full justify-center mt-4"
                    >
                      X'te Paylaş →
                    </a>
                  )}
                </div>
              )}

              {/* Style reference panel */}
              {composeStyle && (
                <div className="card p-6">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">REFERANS STİL: @{composeStyle}</div>
                  {(() => {
                    const style = getStyle(composeStyle)
                    if (!style) return <div className="text-xs text-slate-400">Stil bulunamadı.</div>
                    return (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {style.tweets.slice(0, 5).map((tweet, i) => (
                          <div key={tweet.id} className="bg-slate-50 dark:bg-white/[0.03] rounded-lg p-2.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/[0.06]">
                            {tweet.text}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* How-to guide */}
              <div className="card p-6">
                <div className="section-header">
                  <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">Nasıl Çalışır?</h3>
                </div>
                <div className="space-y-3 mt-4">
                  {[
                    { step: '01', title: 'Profili Analiz Et', desc: 'Hedef hesabın tweetlerini Xquik ile çek veya manuel yapıştır.' },
                    { step: '02', title: 'Stil Profilini Kaydet', desc: 'Tweet örnekleri ile benzersiz yazım kalıbı oluştur.' },
                    { step: '03', title: 'Konu + Ton Belirle', desc: 'Ne hakkında, hangi tonda yazmak istediğini seç.' },
                    { step: '04', title: 'Taslak Yaz', desc: 'Rehber ve kalıplara göre taslağı oluştur.' },
                    { step: '05', title: '11 Kontrol Testi', desc: 'Xquik skor motoru ile tüm algoritma kontrollerinden geçir.' },
                  ].map(s => (
                    <div key={s.step} className="flex gap-3 items-start">
                      <span className="w-7 h-7 rounded-lg bg-brand-red/10 text-brand-red text-[10px] font-bold flex items-center justify-center flex-shrink-0">{s.step}</span>
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ DRAFTS TAB ═══════════ */}
      {tab === 'drafts' && (
        <div className="space-y-4">
          {drafts.length === 0 ? (
            <div className="card text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-medium">Henüz taslak yok.</div>
              <div className="text-slate-400 text-sm mt-1">Tweet üretip skor kontrolünden geçirdiğinde otomatik kaydedilir.</div>
            </div>
          ) : (
            drafts.map(draft => (
              <div key={draft.id} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="chip bg-brand-red/10 text-brand-red border-brand-red/20 text-[10px]">@{draft.styleUsername}</span>
                    <span className="text-xs text-slate-400">{draft.topic}</span>
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
