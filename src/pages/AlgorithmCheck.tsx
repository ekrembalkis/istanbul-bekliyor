import { useState } from 'react'
import { checkAlgorithm, getScoreColor, getScoreBg } from '../lib/utils'
import { CopyBtn } from '../components/CopyBtn'

export default function AlgorithmCheck() {
  const [text, setText] = useState('')
  const analysis = checkAlgorithm(text)
  const hasText = text.trim().length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Algoritma Kontrolü</h1>
        <p className="text-sm text-white/30 mt-1">Tweet taslağını yapıştır, X algoritmasına göre analiz et.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="glass-card-static rounded-2xl p-5">
          <label className="text-xs font-semibold text-white/40 block mb-2">TWEET TASLAĞI</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={12}
            className="w-full glass-input p-4 text-white/90 text-sm leading-relaxed resize-none"
            placeholder={'Tweet metnini buraya yapıştır...\n\nÖrnek:\nGÜN 366.\n\nİstanbul bekliyor.\n\n#İstanbulBekliyor'}
          />
          <div className="flex items-center justify-between mt-3">
            <span className={`text-xs font-mono ${text.length > 280 ? 'text-red-400' : text.length > 250 ? 'text-yellow-400' : 'text-white/30'}`}>
              {text.length}/280
            </span>
            <div className="flex gap-2">
              {hasText && <CopyBtn text={text} label="Kopyala" />}
              {hasText && (
                <button
                  onClick={() => setText('')}
                  className="glass-btn px-3 py-1.5 text-white/40 text-xs font-semibold"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {hasText ? (
            <>
              {/* Score */}
              <div className={`glass-card border-gradient rounded-2xl p-6 ${getScoreBg(analysis.score)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-semibold text-white/40">ALGORİTMA SKORU</label>
                    <div className="text-xs text-white/25 mt-1">
                      {analysis.score >= 80 ? 'Paylaşıma hazır' : analysis.score >= 60 ? 'İyileştirme önerilir' : 'Kritik sorunlar var'}
                    </div>
                  </div>
                  <span className={`text-5xl font-black font-mono ${getScoreColor(analysis.score)}`}>{analysis.score}</span>
                </div>
              </div>

              {/* Checks */}
              <div className="glass-card rounded-2xl p-5">
                <label className="text-xs font-semibold text-white/40 block mb-3">DETAYLI ANALİZ</label>
                <div className="space-y-3">
                  {analysis.checks.map((check, i) => (
                    <div key={i} className={`flex items-start gap-3 text-sm p-3 rounded-xl ${check.passed ? 'bg-green-500/[0.03]' : 'bg-red-500/[0.03]'}`}>
                      <span className={`mt-0.5 text-xs flex-shrink-0 ${check.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {check.passed ? '✓' : '✕'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${check.passed ? 'text-white/45' : 'text-white/75'}`}>{check.rule}</div>
                        <div className="text-xs text-white/25 mt-0.5">{check.tip}</div>
                      </div>
                      <span className={`glass-chip ${
                        check.impact === 'critical' ? '!bg-red-500/10 text-red-400' :
                        check.impact === 'high' ? '!bg-orange-500/10 text-orange-400' :
                        '!bg-yellow-500/10 text-yellow-400'
                      }`}>{check.impact === 'critical' ? 'KRİTİK' : check.impact === 'high' ? 'YÜKSEK' : 'ORTA'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick fixes */}
              {analysis.checks.some(c => !c.passed) && (
                <div className="glass-card border-gradient-gold rounded-xl p-4">
                  <div className="text-xs font-semibold text-brand-gold mb-2">İYİLEŞTİRME ÖNERİLERİ</div>
                  <ul className="space-y-1.5 text-xs text-white/35">
                    {analysis.checks.filter(c => !c.passed).map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-brand-gold">→</span>
                        <span>{c.tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card-static rounded-2xl p-12 text-center">
              <div className="text-4xl mb-4 opacity-20">📝</div>
              <div className="text-white/30 text-sm">Tweet metnini sol tarafa yaz veya yapıştır.</div>
              <div className="text-white/15 text-xs mt-2">Sistem X algoritmasının kaynak koduna göre analiz edecek.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
