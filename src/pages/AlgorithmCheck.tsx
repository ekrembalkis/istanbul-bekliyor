import { useState } from 'react'
import { checkAlgorithm, getScoreColor, getScoreBg } from '../lib/utils'
import { CopyBtn } from '../components/CopyBtn'

export default function AlgorithmCheck() {
  const [text, setText] = useState('')
  const analysis = checkAlgorithm(text)
  const hasText = text.trim().length > 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header">
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Algoritma Kontrolü</h1>
        <p className="text-sm text-slate-400 mt-1">Tweet taslağını yapıştır, X algoritmasına göre analiz et.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-3">TWEET TASLAĞI</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
            className="w-full input-field p-4 text-slate-700 dark:text-slate-200 text-sm leading-relaxed resize-none"
            placeholder={'Tweet metnini buraya yapıştır...\n\nÖrnek:\nGÜN 366.\n\nİstanbul bekliyor.\n\n#İstanbulBekliyor'}
          />
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs font-mono ${text.length > 280 ? 'text-red-500' : text.length > 250 ? 'text-amber-500' : 'text-slate-400'}`}>
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

        <div className="space-y-5">
          {hasText ? (
            <>
              <div className={`card rounded-2xl p-6 ${getScoreBg(analysis.score)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">ALGORİTMA SKORU</label>
                    <div className="text-xs text-slate-400 mt-1">
                      {analysis.score >= 80 ? 'Paylaşıma hazır' : analysis.score >= 60 ? 'İyileştirme önerilir' : 'Kritik sorunlar var'}
                    </div>
                  </div>
                  <span className={`stat-number text-6xl ${getScoreColor(analysis.score)}`}>{analysis.score}</span>
                </div>
              </div>

              <div className="card p-6">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-4">DETAYLI ANALİZ</label>
                <div className="space-y-3">
                  {analysis.checks.map((check, i) => (
                    <div key={i} className={`flex items-start gap-3 text-sm p-3 rounded-xl ${check.passed ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : 'bg-red-50/50 dark:bg-red-500/5'}`}>
                      <span className={`mt-0.5 text-xs flex-shrink-0 font-bold ${check.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                        {check.passed ? '✓' : '✕'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${check.passed ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{check.rule}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{check.tip}</div>
                      </div>
                      <span className={`chip text-[10px] ${
                        check.impact === 'critical' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                        check.impact === 'high' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                        'bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                      }`}>{check.impact === 'critical' ? 'KRİTİK' : check.impact === 'high' ? 'YÜKSEK' : 'ORTA'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {analysis.checks.some(c => !c.passed) && (
                <div className="card border-l-4 border-l-brand-gold p-5 bg-brand-gold-light dark:bg-brand-gold/5">
                  <div className="text-xs font-bold text-brand-gold mb-3 tracking-wider">İYİLEŞTİRME ÖNERİLERİ</div>
                  <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                    {analysis.checks.filter(c => !c.passed).map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-brand-gold font-bold">→</span>
                        <span>{c.tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="card rounded-2xl p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tweet metnini sol tarafa yaz veya yapıştır.</div>
              <div className="text-slate-400 text-xs mt-2">Sistem X algoritmasının kaynak koduna göre analiz edecek.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
