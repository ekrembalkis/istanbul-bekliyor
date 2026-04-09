import { useState, useEffect } from 'react'
import { fetchAlgorithmData, isConfirmedSignal } from '../lib/algorithmData'
import type { AlgorithmData } from '../lib/algorithmData'

export default function AlgorithmGuide() {
  const [data, setData] = useState<AlgorithmData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlgorithmData().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Algoritma Rehberi</h1>
        </div>
        <div className="card p-12 text-center text-sm text-slate-400">Algoritma verileri yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Algoritma Rehberi</h1>
        <p className="text-sm text-slate-400 mt-1">X algoritmasının kaynak kodundan ve Xquik analizinden elde edilen canlı veriler.</p>
      </div>

      {/* Source attribution */}
      {data?.source && (
        <div className="card p-4 bg-blue-50 dark:bg-blue-500/5 border-l-4 border-l-blue-500">
          <div className="text-[10px] font-bold text-blue-500 tracking-wider mb-1">KAYNAK</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{data.source}</div>
        </div>
      )}

      {/* Content Rules (from Xquik compose) */}
      {data?.contentRules && data.contentRules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-slate-700 dark:text-slate-200">İçerik Kuralları ({data.contentRules.length})</h2>
          {data.contentRules.map((rule, i) => (
            <div key={i} className="card p-4 hover:shadow-card-hover dark:hover:shadow-dark-card-hover">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{rule.rule}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scorer Weights (19 signals) */}
      {data?.scorerWeights && data.scorerWeights.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-serif font-bold text-slate-700 dark:text-slate-200 mb-1">Phoenix Skorlama Sinyalleri ({data.scorerWeights.length})</h2>
          <p className="text-xs text-slate-400 mb-5">Ağırlık değerleri TAHMİN — kaynak kodda sabit ağırlık yok, transformer öğreniyor.</p>
          <div className="space-y-3">
            {data.scorerWeights.map((sw, i) => {
              const isPositive = sw.weight > 0
              const isConfirmed = isConfirmedSignal(sw.signal)
              const absWeight = Math.abs(sw.weight)
              const maxWeight = Math.max(...data.scorerWeights.map(s => Math.abs(s.weight)))
              const barWidth = `${Math.max(2, (absWeight / maxWeight) * 100)}%`

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-40 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{sw.signal}</span>
                      {isConfirmed && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">kaynak</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 h-4 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full opacity-60 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: barWidth, minWidth: '4px' }}
                    />
                  </div>
                  <div className={`w-14 text-right text-xs font-mono font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {sw.weight > 0 ? '+' : ''}{sw.weight}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Engagement Multipliers */}
      {data?.engagementMultipliers && data.engagementMultipliers.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-serif font-bold text-slate-700 dark:text-slate-200 mb-5">Engagement Çarpanları</h2>
          <div className="space-y-2">
            {data.engagementMultipliers.map((em, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/[0.04] last:border-0">
                <span className="text-sm text-slate-600 dark:text-slate-300">{em.action}</span>
                <span className="text-sm font-mono font-bold text-brand-red">{em.multiplier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Velocity */}
      {data?.engagementVelocity && (
        <div className="card border-l-4 border-l-brand-gold p-6 bg-brand-gold-light dark:bg-brand-gold/5">
          <h3 className="font-bold text-brand-gold mb-3">Engagement Hızı</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{data.engagementVelocity}</p>
        </div>
      )}

      {/* Top Penalties */}
      {data?.topPenalties && data.topPenalties.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-serif font-bold text-red-600 dark:text-red-400 mb-4">Cezalar</h2>
          <div className="space-y-2">
            {data.topPenalties.map((p, i) => (
              <div key={i} className="flex gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="text-red-500 flex-shrink-0 font-bold">!</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Architecture (static — from source code) */}
      <div className="card p-6">
        <div className="section-header">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg font-serif">Sistem Mimarisi</h3>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">x-algorithm-main kaynak kodundan doğrulanmış</p>
        </div>
        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 leading-loose space-y-1 mt-4">
          <div className="text-slate-400 text-[10px] tracking-widest font-sans font-bold">KULLANICI İSTEĞİ</div>
          <div className="text-slate-300 dark:text-slate-600 ml-2">|</div>
          {[
            '1. Query Hydration -> User Action Sequence + Features',
            '2. Candidate Sources -> Thunder (in-network) + Phoenix (OON)',
            '3. Hydration -> Core data, author info, media',
            '4. Pre-Scoring Filters -> Duplicate, age, self, muted',
            '5. Grok Transformer -> 19 sinyal logit -> sigmoid -> P(action)',
            '6. Selection -> Top K',
            '7. Post-Selection -> VF Filter (safety)',
          ].map((step, i) => (
            <div key={i} className="ml-2 pl-4 border-l-2 border-brand-red/20 py-1 hover:border-brand-red/50 hover:text-slate-700 dark:hover:text-white transition-colors">{step}</div>
          ))}
          <div className="text-slate-300 dark:text-slate-600 ml-2">|</div>
          <div className="text-brand-red font-bold ml-2 font-sans text-sm">Sıralanmış Feed</div>
        </div>
      </div>

      {!data && (
        <div className="card p-8 text-center text-sm text-slate-400">
          Algoritma verileri yüklenemedi. Xquik API bağlantısını kontrol et.
        </div>
      )}
    </div>
  )
}
