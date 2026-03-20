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
        <h1 className="text-2xl font-serif font-bold text-slate-800">Algoritma Kontrolu</h1>
        <p className="text-sm text-slate-400 mt-1">Tweet taslagini yapistir, X algoritmasina gore analiz et.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="card p-6">
          <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-3">TWEET TASLAGI</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
            className="w-full input-field p-4 text-slate-700 text-sm leading-relaxed resize-none"
            placeholder={'Tweet metnini buraya yapistir...\n\nOrnek:\nGUN 366.\n\nIstanbul bekliyor.\n\n#IstanbulBekliyor'}
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

        {/* Results */}
        <div className="space-y-5">
          {hasText ? (
            <>
              {/* Score */}
              <div className={`card rounded-2xl p-6 ${getScoreBg(analysis.score)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 tracking-wider">ALGORITMA SKORU</label>
                    <div className="text-xs text-slate-400 mt-1">
                      {analysis.score >= 80 ? 'Paylasima hazir' : analysis.score >= 60 ? 'Iyilestirme onerilir' : 'Kritik sorunlar var'}
                    </div>
                  </div>
                  <span className={`stat-number text-6xl ${getScoreColor(analysis.score)}`}>{analysis.score}</span>
                </div>
              </div>

              {/* Checks */}
              <div className="card p-6">
                <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-4">DETAYLI ANALIZ</label>
                <div className="space-y-3">
                  {analysis.checks.map((check, i) => (
                    <div key={i} className={`flex items-start gap-3 text-sm p-3 rounded-xl ${check.passed ? 'bg-emerald-50/50' : 'bg-red-50/50'}`}>
                      <span className={`mt-0.5 text-xs flex-shrink-0 font-bold ${check.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                        {check.passed ? '✓' : '✕'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${check.passed ? 'text-slate-400' : 'text-slate-700'}`}>{check.rule}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{check.tip}</div>
                      </div>
                      <span className={`chip text-[10px] ${
                        check.impact === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                        check.impact === 'high' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>{check.impact === 'critical' ? 'KRITIK' : check.impact === 'high' ? 'YUKSEK' : 'ORTA'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick fixes */}
              {analysis.checks.some(c => !c.passed) && (
                <div className="card border-l-4 border-l-brand-gold p-5 bg-brand-gold-light">
                  <div className="text-xs font-bold text-brand-gold mb-3 tracking-wider">IYILESTIRME ONERILERI</div>
                  <ul className="space-y-2 text-sm text-slate-500">
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="text-slate-500 text-sm font-medium">Tweet metnini sol tarafa yaz veya yapistir.</div>
              <div className="text-slate-400 text-xs mt-2">Sistem X algoritmasinin kaynak koduna gore analiz edecek.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
