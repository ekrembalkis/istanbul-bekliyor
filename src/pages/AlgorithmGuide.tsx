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
          <h1 className="text-xl font-bold text-[#0A0A0A]">Algoritma Rehberi</h1>
        </div>
        <div className="card p-12 text-center text-sm text-[rgba(10,10,10,0.4)]">Algoritma verileri yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[#0A0A0A]">Algoritma Rehberi</h1>
        <p className="text-sm text-[rgba(10,10,10,0.4)] mt-1">X algoritmasının kaynak kodundan ve Xquik analizinden elde edilen canlı veriler.</p>
      </div>

      {/* Source attribution */}
      {data?.source && (
        <div className="card p-4 bg-[#E30A17]/5 border-l-4 border-l-[#E30A17]">
          <div className="text-[10px] font-bold text-[#E30A17] tracking-wider mb-1">KAYNAK</div>
          <div className="text-xs text-[rgba(10,10,10,0.4)] leading-relaxed">{data.source}</div>
        </div>
      )}

      {/* Content Rules */}
      {data?.contentRules && data.contentRules.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#0A0A0A]">İçerik Kuralları ({data.contentRules.length})</h2>
          {data.contentRules.map((rule, i) => (
            <div key={i} className="border-b border-[#0A0A0A] py-3">
              <p className="text-sm text-[#0A0A0A] leading-relaxed">{rule.rule}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scorer Weights */}
      {data?.scorerWeights && data.scorerWeights.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-1">Phoenix Skorlama Sinyalleri ({data.scorerWeights.length})</h2>
          <p className="text-xs text-[rgba(10,10,10,0.4)] mb-5">Ağırlık değerleri TAHMİN — kaynak kodda sabit ağırlık yok, transformer öğreniyor.</p>
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
                      <span className="text-xs text-[#0A0A0A] font-medium">{sw.signal}</span>
                      {isConfirmed && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-[#0A0A0A]/10 text-[#0A0A0A] border border-[#0A0A0A]/20">kaynak</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 h-4 bg-[rgba(10,10,10,0.02)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full opacity-60 ${isPositive ? 'bg-[#0A0A0A]' : 'bg-[#E30A17]'}`}
                      style={{ width: barWidth, minWidth: '4px' }}
                    />
                  </div>
                  <div className={`w-14 text-right text-xs font-semibold ${isPositive ? 'text-[#0A0A0A]' : 'text-[#E30A17]'}`}>
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
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-5">Engagement Çarpanları</h2>
          <div className="space-y-2">
            {data.engagementMultipliers.map((em, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#0A0A0A] last:border-0">
                <span className="text-sm text-[#0A0A0A]">{em.action}</span>
                <span className="text-sm font-bold text-[#E30A17]">{em.multiplier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Velocity */}
      {data?.engagementVelocity && (
        <div className="card border-l-4 border-l-campaign-gold p-6 bg-campaign-gold/5">
          <h3 className="font-bold text-campaign-gold mb-3">Engagement Hızı</h3>
          <p className="text-sm text-[rgba(10,10,10,0.4)] leading-relaxed">{data.engagementVelocity}</p>
        </div>
      )}

      {/* Top Penalties */}
      {data?.topPenalties && data.topPenalties.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-bold text-[#E30A17] mb-4">Cezalar</h2>
          <div className="space-y-2">
            {data.topPenalties.map((p, i) => (
              <div key={i} className="flex gap-2 text-sm text-[rgba(10,10,10,0.4)]">
                <span className="text-[#E30A17] flex-shrink-0 font-bold">!</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Architecture */}
      <div className="card p-6">
        <div>
          <h3 className="font-bold text-[#0A0A0A] text-lg">Sistem Mimarisi</h3>
          <p className="text-[10px] text-[#0A0A0A] mt-1">x-algorithm-main kaynak kodundan doğrulanmış</p>
        </div>
        <div className="text-xs text-[rgba(10,10,10,0.4)] leading-loose space-y-1 mt-4">
          <div className="text-[rgba(10,10,10,0.4)] text-[10px] tracking-widest font-bold">KULLANICI İSTEĞİ</div>
          <div className="text-[#0A0A0A] ml-2">|</div>
          {[
            '1. Query Hydration -> User Action Sequence + Features',
            '2. Candidate Sources -> Thunder (in-network) + Phoenix (OON)',
            '3. Hydration -> Core data, author info, media',
            '4. Pre-Scoring Filters -> Duplicate, age, self, muted',
            '5. Grok Transformer -> 19 sinyal logit -> sigmoid -> P(action)',
            '6. Selection -> Top K',
            '7. Post-Selection -> VF Filter (safety)',
          ].map((step, i) => (
            <div key={i} className="ml-2 pl-4 border-l-2 border-[#E30A17]/20 py-1 hover:border-[#E30A17]/50 hover:text-[#0A0A0A] transition-colors">{step}</div>
          ))}
          <div className="text-[#0A0A0A] ml-2">|</div>
          <div className="text-[#E30A17] font-bold ml-2 text-sm">Sıralanmış Feed</div>
        </div>
      </div>

      {!data && (
        <div className="card p-8 text-center text-sm text-[rgba(10,10,10,0.4)]">
          Algoritma verileri yüklenemedi. Xquik API bağlantısını kontrol et.
        </div>
      )}
    </div>
  )
}
