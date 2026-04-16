import { useState, useEffect, useCallback } from 'react'
import { checkCampaignRules, getScoreColor, getScoreBg } from '../lib/utils'
import { scoreDraft } from '../lib/xquik'
import type { ScoreResult } from '../lib/xquik'
import { CopyBtn } from '../components/CopyBtn'

export default function AlgorithmCheck() {
  const [text, setText] = useState('')
  const [algoResult, setAlgoResult] = useState<ScoreResult | null>(null)
  const [algoLoading, setAlgoLoading] = useState(false)
  const hasText = text.trim().length > 0

  const campaignAnalysis = checkCampaignRules(text)

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
    if (!hasText) { setAlgoResult(null); return }
    const timer = setTimeout(() => scoreWithXquik(text), 800)
    return () => clearTimeout(timer)
  }, [text, hasText, scoreWithXquik])

  const algoScore = algoResult ? Math.round((algoResult.passedCount / algoResult.totalChecks) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[#0A0A0A]">Algoritma Kontrolü</h1>
        <p className="text-sm text-[rgba(10,10,10,0.4)] mt-1">Tweet taslağını yapıştır, X algoritması + kampanya kurallarına göre analiz et.</p>
      </div>

      <div className="space-y-5">
        <div className="card p-6">
          <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-3">TWEET TASLAGI</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            className="w-full input-field p-4 text-[#0A0A0A] text-sm leading-relaxed resize-none"
            placeholder={'Tweet metnini buraya yapıştır...\n\nÖrnek:\nGÜN 368.\n\nİstanbul bekliyor.\n\n#İstanbulBekliyor'}
          />
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs ${text.length > 280 ? 'text-[#E30A17]' : text.length > 250 ? 'text-[#D4A843]' : 'text-[rgba(10,10,10,0.4)]'}`}>
              {text.length}/280
            </span>
            <div className="flex gap-2">
              {hasText && <CopyBtn text={text} label="Kopyala" />}
              {hasText && (
                <button onClick={() => setText('')} className="btn text-xs py-1.5">Temizle</button>
              )}
            </div>
          </div>
        </div>

        {hasText ? (
          <>
            {/* Xquik Algorithm Score */}
            <div className={`card rounded-none p-6 ${algoResult ? (algoResult.passed ? getScoreBg(100) : getScoreBg(algoScore)) : 'bg-[rgba(10,10,10,0.02)]'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">ALGORITMA SKORU</label>
                  <div className="text-[10px] text-[rgba(10,10,10,0.4)] mt-0.5">Xquik — 11 kontrol (canlı)</div>
                </div>
                {algoLoading ? (
                  <svg className="w-8 h-8 animate-spin text-[rgba(10,10,10,0.4)]" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
                ) : algoResult ? (
                  <span className={`stat-number text-5xl ${algoResult.passed ? 'text-[#0A0A0A]' : getScoreColor(algoScore)}`}>
                    {algoResult.passedCount}/{algoResult.totalChecks}
                  </span>
                ) : (
                  <span className="text-2xl text-[rgba(10,10,10,0.4)]">—</span>
                )}
              </div>
              {algoResult?.topSuggestion && !algoResult.passed && (
                <div className="text-xs text-[#D4A843] mt-2">{algoResult.topSuggestion}</div>
              )}
            </div>

            {/* Xquik Checklist */}
            {algoResult && (
              <div className="card p-6">
                <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-4">ALGORITMA DETAY</label>
                <div className="space-y-2">
                  {algoResult.checklist.map((check, i) => (
                    <div key={i} className={`flex items-start gap-3 text-sm p-2.5 rounded-none ${check.passed ? 'bg-[#0A0A0A]/5' : 'bg-[#E30A17]/5'}`}>
                      <span className={`mt-0.5 text-xs flex-shrink-0 font-bold ${check.passed ? 'text-[#0A0A0A]' : 'text-[#E30A17]'}`}>
                        {check.passed ? '✓' : '✕'}
                      </span>
                      <span className={check.passed ? 'text-[rgba(10,10,10,0.4)]' : 'text-[#0A0A0A] font-medium'}>{check.factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign Rules */}
            <div className={`card rounded-none p-5 ${getScoreBg(campaignAnalysis.score)}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider">KAMPANYA UYUMU</label>
                  <div className="text-[10px] text-[rgba(10,10,10,0.4)] mt-0.5">Marka kimliği kontrolleri</div>
                </div>
                <span className={`stat-number text-3xl ${getScoreColor(campaignAnalysis.score)}`}>
                  {campaignAnalysis.checks.filter(c => c.passed).length}/{campaignAnalysis.checks.length}
                </span>
              </div>
              <div className="space-y-2">
                {campaignAnalysis.checks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`text-xs font-bold ${check.passed ? 'text-[#0A0A0A]' : 'text-[#E30A17]'}`}>
                      {check.passed ? '✓' : '✕'}
                    </span>
                    <span className={check.passed ? 'text-[rgba(10,10,10,0.4)]' : 'text-[#0A0A0A]'}>{check.rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card rounded-none p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-none bg-[rgba(10,10,10,0.02)] flex items-center justify-center">
              <svg className="w-8 h-8 text-[rgba(10,10,10,0.4)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="text-[rgba(10,10,10,0.4)] text-sm font-medium">Tweet metnini yukarıya yaz veya yapıştır.</div>
            <div className="text-[rgba(10,10,10,0.4)] text-xs mt-2">Xquik canlı 11 kontrol + kampanya uyum analizi yapılacak.</div>
          </div>
        )}
      </div>
    </div>
  )
}
