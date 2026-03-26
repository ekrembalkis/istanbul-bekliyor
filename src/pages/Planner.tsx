import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getDayCount, getDateForDay, checkCampaignRules, getScoreColor, getScoreBg } from '../lib/utils'
import { getDayPlan } from '../data/campaign'
import { scoreDraft } from '../lib/xquik'
import type { ScoreResult } from '../lib/xquik'
import { supabase } from '../lib/supabase'
import { CopyBtn } from '../components/CopyBtn'
import { generateNbpPrompt } from '../lib/nbpPromptService'

export default function Planner() {
  const day = getDayCount()
  const plan = getDayPlan(day)
  const [searchParams, setSearchParams] = useSearchParams()

  // If navigated from Haber Servisi, pre-fill with news content
  const newsTitle = searchParams.get('newsTitle')
  const newsContext = searchParams.get('newsContext')
  const newsUrl = searchParams.get('newsUrl')

  const initialText = newsTitle
    ? `GÜN ${day}\n\n${newsTitle}\n\n#İstanbulBekliyor`
    : plan.tweetTemplate

  const [tweetText, setTweetText] = useState(initialText)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [algoResult, setAlgoResult] = useState<ScoreResult | null>(null)
  const [algoLoading, setAlgoLoading] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptError, setPromptError] = useState('')

  const campaignAnalysis = checkCampaignRules(tweetText)

  // Debounced Xquik scoring
  const scoreWithXquik = useCallback(async (draft: string) => {
    if (draft.trim().length < 10) { setAlgoResult(null); return }
    setAlgoLoading(true)
    try {
      const result = await scoreDraft(draft, true)
      setAlgoResult(result)
    } catch {
      setAlgoResult(null)
    }
    setAlgoLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => scoreWithXquik(tweetText), 800)
    return () => clearTimeout(timer)
  }, [tweetText, scoreWithXquik])

  const algoScore = algoResult ? Math.round((algoResult.passedCount / algoResult.totalChecks) * 100) : 0

  const activePrompt = generatedPrompt || ''

  const handleGeneratePrompt = async (mode: 'generate' | 'refine') => {
    setPromptLoading(true)
    setPromptError('')
    try {
      const result = await generateNbpPrompt({
        theme: plan.theme,
        scene: plan.scene,
        goldenElement: plan.goldenElement,
        dayNumber: day,
        mode,
        existingPrompt: mode === 'refine' ? activePrompt : undefined,
      })
      setGeneratedPrompt(result.prompt)
    } catch (e: any) {
      setPromptError(e.message || 'Prompt üretilemedi')
    }
    setPromptLoading(false)
  }

  const saveTweet = async () => {
    if (!supabase) { alert('Supabase baglantisi yapilandirilmamis.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('tweets').upsert({
        day_number: day,
        tweet_date: getDateForDay(day).toISOString().split('T')[0],
        theme: plan.theme,
        tweet_text: tweetText,
        nano_prompt: activePrompt,
        status: 'ready',
        algorithm_score: algoResult ? algoResult.passedCount * 9 : campaignAnalysis.score, // 0-99 scale
        algorithm_notes: [
          ...(algoResult?.checklist?.filter(c => !c.passed).map(c => c.factor) || []),
          ...campaignAnalysis.checks.filter(c => !c.passed).map(c => c.tip),
        ],
      }, { onConflict: 'day_number' })
      if (!error) setSaved(true)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  // Clear search params after initial load so refresh doesn't re-apply
  useEffect(() => {
    if (newsTitle) {
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* News context banner */}
      {newsTitle && (
        <div className="card p-4 border-l-4 border-l-brand-red bg-brand-red/[0.03]">
          <div className="text-[10px] font-bold text-brand-red tracking-wider mb-1">HABERDEN TWEET</div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">{newsTitle}</p>
          {newsContext && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{newsContext}</p>
          )}
          {newsUrl && (
            <a href={newsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-red hover:underline mt-2 inline-block">
              Habere git
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Tweet Planlayici</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{plan.emoji}</span>
          <div className="text-right">
            <div className="text-sm font-mono text-brand-red font-bold">GUN {day}</div>
            <div className="text-xs text-slate-400">{plan.theme}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Composer */}
        <div className="space-y-5">
          <div className="card p-6">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-3">TWEET METNI</label>
            <textarea
              value={tweetText}
              onChange={e => { setTweetText(e.target.value); setSaved(false) }}
              rows={10}
              className="w-full input-field p-4 text-slate-700 dark:text-slate-200 text-sm leading-relaxed resize-none"
              placeholder="Tweet metnini buraya yaz..."
            />
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs font-mono ${tweetText.length > 280 ? 'text-red-500' : tweetText.length > 250 ? 'text-amber-500' : 'text-slate-400'}`}>
                {tweetText.length}/280
              </span>
              <div className="flex gap-2">
                <CopyBtn text={tweetText} label="Kopyala" />
                <button
                  onClick={saveTweet}
                  disabled={saving}
                  className={`btn text-xs py-1.5 ${saved ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'btn-primary'} disabled:opacity-50`}
                >
                  {saving ? '...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-3">GORSEL BILGISI</label>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] text-slate-400 mb-1 font-semibold">SAHNE</div>
                <div className="text-slate-600 dark:text-slate-300">{plan.scene}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 mb-1 font-semibold">ALTIN ELEMAN</div>
                <div className="text-brand-gold font-medium">{plan.goldenElement}</div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold text-brand-red tracking-wider">NANO BANANA PRO PROMPT</label>
              {activePrompt && <CopyBtn text={activePrompt} label="Kopyala" />}
            </div>
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 text-xs font-mono text-slate-500 dark:text-slate-400 leading-relaxed max-h-48 overflow-y-auto border border-slate-100 dark:border-white/[0.06]">
              {promptLoading ? (
                <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                  Prompt üretiliyor...
                </div>
              ) : activePrompt ? activePrompt : (
                <div className="text-center py-4 text-slate-300 dark:text-slate-500">
                  "Prompt Üret" ile AI destekli prompt oluştur
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-4 text-[10px] text-slate-400 font-mono">
                <span>aspectRatio: 1:1</span>
                <span>resolution: 2K</span>
                <span>temperature: 0.7</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleGeneratePrompt('generate')}
                disabled={promptLoading}
                className="btn btn-primary text-[10px] py-1.5 px-3 disabled:opacity-50"
              >
                {promptLoading ? '...' : 'Prompt Üret'}
              </button>
              <button
                onClick={() => handleGeneratePrompt('refine')}
                disabled={promptLoading || !activePrompt}
                className="btn text-[10px] py-1.5 px-3 disabled:opacity-50"
              >
                İyileştir
              </button>
            </div>
            {promptError && (
              <div className="mt-2 text-[10px] text-red-500">{promptError}</div>
            )}
          </div>
        </div>

        {/* Right: Scores + Checklist */}
        <div className="space-y-5">
          {/* Xquik Algorithm Score */}
          <div className={`card rounded-2xl p-6 ${algoResult ? (algoResult.passed ? getScoreBg(100) : getScoreBg(algoScore)) : 'bg-slate-50 dark:bg-white/[0.03]'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 tracking-wider">ALGORITMA SKORU</label>
                <div className="text-[10px] text-slate-400 mt-0.5">Xquik canli 11 kontrol</div>
              </div>
              {algoLoading ? (
                <svg className="w-8 h-8 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
              ) : algoResult ? (
                <span className={`stat-number text-5xl ${algoResult.passed ? 'text-emerald-600 dark:text-emerald-400' : getScoreColor(algoScore)}`}>
                  {algoResult.passedCount}/{algoResult.totalChecks}
                </span>
              ) : (
                <span className="text-2xl text-slate-300">—</span>
              )}
            </div>
            {algoResult && (
              <div className="space-y-2">
                {algoResult.checklist.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`text-xs font-bold ${check.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                      {check.passed ? '✓' : '✕'}
                    </span>
                    <span className={check.passed ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}>{check.factor}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Rules */}
          <div className={`card rounded-2xl p-5 ${getScoreBg(campaignAnalysis.score)}`}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider">KAMPANYA UYUMU</label>
              <span className={`stat-number text-3xl ${getScoreColor(campaignAnalysis.score)}`}>
                {campaignAnalysis.checks.filter(c => c.passed).length}/{campaignAnalysis.checks.length}
              </span>
            </div>
            <div className="space-y-2">
              {campaignAnalysis.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`text-xs font-bold ${check.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                    {check.passed ? '✓' : '✕'}
                  </span>
                  <span className={check.passed ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}>{check.rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-publish checklist */}
          <div className="card p-5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-4">PAYLASIM ONCESI KONTROL</label>
            {[
              'Nano Banana Pro ile gorseli urettim',
              'Gorsel 1:1 kare format, siyah/beyaz + tek altin eleman',
              'Tweet metnini kontrol ettim',
              `Algoritma skoru ${algoResult?.passed ? '11/11 ✓' : algoResult ? `${algoResult.passedCount}/11 — iyilestir!` : 'bekleniyor...'}`,
              `Kampanya uyumu ${campaignAnalysis.score >= 100 ? '3/3 ✓' : `${campaignAnalysis.checks.filter(c => c.passed).length}/3 — iyilestir!`}`,
              'Display name guncellendi (GUN sayisi)',
              'Sabah 09:00 TSI civarinda paylasacagim',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-3 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-0">
                <input type="checkbox" className="rounded w-4 h-4" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
