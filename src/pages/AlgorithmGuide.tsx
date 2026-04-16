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
        <div>
          <h1 className="text-xl font-bold text-x-text-primary">Algoritma Rehberi</h1>
        </div>
        <div className="card p-12 text-center text-sm text-x-text-secondary">Algoritma verileri yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-x-text-primary">Algoritma Rehberi</h1>
        <p className="text-sm text-x-text-secondary mt-1">X algoritmasının kaynak kodundan ve Xquik analizinden elde edilen canlı veriler.</p>
      </div>

      {/* Source attribution */}
      {data?.source && (
        <div className="card p-4 bg-x-accent/5 border-l-4 border-l-x-accent">
          <div className="text-[10px] font-bold text-x-accent tracking-wider mb-1">KAYNAK</div>
          <div className="text-xs text-x-text-secondary leading-relaxed">{data.source}</div>
        </div>
      )}

      {/* Content Rules */}
      {data?.contentRules && data.contentRules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-x-text-primary">İçerik Kuralları ({data.contentRules.length})</h2>
          {data.contentRules.map((rule, i) => (
            <div key={i} className="border-b border-x-border py-3">
              <p className="text-sm text-x-text-primary leading-relaxed">{rule.rule}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scorer Weights */}
      {data?.scorerWeights && data.scorerWeights.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-x-text-primary mb-1">Phoenix Skorlama Sinyalleri ({data.scorerWeights.length})</h2>
          <p className="text-xs text-x-text-secondary mb-5">Ağırlık değerleri TAHMİN — kaynak kodda sabit ağırlık yok, transformer öğreniyor.</p>
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
                      <span className="text-xs text-x-text-primary font-medium">{sw.signal}</span>
                      {isConfirmed && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-[#0A0A0A]/10 text-x-text-primary border border-x-border/20">kaynak</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 h-4 bg-x-surface-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full opacity-60 ${isPositive ? 'bg-[#0A0A0A]' : 'bg-x-accent'}`}
                      style={{ width: barWidth, minWidth: '4px' }}
                    />
                  </div>
                  <div className={`w-14 text-right text-xs font-semibold ${isPositive ? 'text-x-text-primary' : 'text-x-accent'}`}>
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
          <h2 className="text-lg font-bold text-x-text-primary mb-5">Engagement Çarpanları</h2>
          <div className="space-y-2">
            {data.engagementMultipliers.map((em, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-x-border last:border-0">
                <span className="text-sm text-x-text-primary">{em.action}</span>
                <span className="text-sm font-bold text-x-accent">{em.multiplier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Velocity */}
      {data?.engagementVelocity && (
        <div className="card border-l-4 border-l-campaign-gold p-6 bg-campaign-gold/5">
          <h3 className="font-bold text-campaign-gold mb-3">Engagement Hızı</h3>
          <p className="text-sm text-x-text-secondary leading-relaxed">{data.engagementVelocity}</p>
        </div>
      )}

      {/* Top Penalties */}
      {data?.topPenalties && data.topPenalties.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-x-accent mb-4">Cezalar</h2>
          <div className="space-y-2">
            {data.topPenalties.map((p, i) => (
              <div key={i} className="flex gap-2 text-sm text-x-text-secondary">
                <span className="text-x-accent flex-shrink-0 font-bold">!</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Architecture */}
      <div className="card p-6">
        <div>
          <h3 className="font-bold text-x-text-primary text-lg">Sistem Mimarisi</h3>
          <p className="text-[10px] text-x-text-primary mt-1">x-algorithm-main kaynak kodundan doğrulanmış</p>
        </div>
        <div className="text-xs text-x-text-secondary leading-loose space-y-1 mt-4">
          <div className="text-x-text-secondary text-[10px] tracking-widest font-bold">KULLANICI İSTEĞİ</div>
          <div className="text-x-text-primary ml-2">|</div>
          {[
            '1. Query Hydration -> User Action Sequence + Features',
            '2. Candidate Sources -> Thunder (in-network) + Phoenix (OON)',
            '3. Hydration -> Core data, author info, media',
            '4. Pre-Scoring Filters -> Duplicate, age, self, muted',
            '5. Grok Transformer -> 19 sinyal logit -> sigmoid -> P(action)',
            '6. Selection -> Top K',
            '7. Post-Selection -> VF Filter (safety)',
          ].map((step, i) => (
            <div key={i} className="ml-2 pl-4 border-l-2 border-x-accent/20 py-1 hover:border-x-accent/50 hover:text-x-text-primary transition-colors">{step}</div>
          ))}
          <div className="text-x-text-primary ml-2">|</div>
          <div className="text-x-accent font-bold ml-2 text-sm">Sıralanmış Feed</div>
        </div>
      </div>

      {!data && (
        <div className="card p-8 text-center text-sm text-x-text-secondary">
          Algoritma verileri yüklenemedi. Xquik API bağlantısını kontrol et.
        </div>
      )}
    </div>
  )
}
