import { ALGORITHM_RULES } from '../data/campaign'

export default function AlgorithmGuide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Algoritma Rehberi</h1>
        <p className="text-sm text-white/30 mt-1">X algoritmasının açık kaynak kodundan (Phoenix Grok transformer) elde edilen kurallar.</p>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {ALGORITHM_RULES.map((rule, i) => (
          <div key={i} className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white/75">{rule.title}</h3>
              <span className={`glass-chip ${
                rule.weight === 'KRİTİK' ? '!bg-red-500/10 text-red-400' :
                rule.weight === 'YÜKSEK' ? '!bg-orange-500/10 text-orange-400' :
                '!bg-yellow-500/10 text-yellow-400'
              }`}>{rule.weight}</span>
            </div>
            <p className="text-sm text-white/35 leading-relaxed">{rule.content}</p>
          </div>
        ))}
      </div>

      {/* Phoenix Scoring */}
      <div className="glass-card border-gradient-gold rounded-xl p-6">
        <h3 className="font-bold gradient-text inline-block mb-4">Phoenix Scoring Model</h3>
        <div className="text-sm text-white/35 space-y-3">
          <div>
            <div className="text-xs font-semibold text-green-400 mb-1">POZİTİF AKSİYONLAR</div>
            <div className="text-xs text-white/25 leading-relaxed">
              favorite, reply, retweet, quote, click, profile_click, video_view, photo_expand, share, share_via_dm, share_via_copy_link, dwell, follow_author
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-red-400 mb-1">NEGATİF AKSİYONLAR</div>
            <div className="text-xs text-white/25 leading-relaxed">
              not_interested, block_author, mute_author, report
            </div>
          </div>
          <div className="glass-input rounded-lg p-3 font-mono text-xs text-brand-gold/60">
            Final Score = Σ(weight_i × P(action_i)) × diversity_multiplier × oon_factor
          </div>
        </div>
      </div>

      {/* Engagement Weights */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold text-white/65 mb-4">Engagement Ağırlıkları (Tahmini)</h3>
        <div className="space-y-2">
          {[
            { action: 'Reply (yazar cevap verirse)', weight: '+75', multiple: '150× like', color: 'text-green-400', bar: 'w-full bg-green-400' },
            { action: 'Reply (normal)', weight: '+13.5', multiple: '27× like', color: 'text-green-400', bar: 'w-[18%] bg-green-400' },
            { action: 'Bookmark + dwell >2dk', weight: '+10', multiple: '20× like', color: 'text-blue-400', bar: 'w-[13%] bg-blue-400' },
            { action: 'Retweet', weight: '+1.0', multiple: '2× like', color: 'text-yellow-400', bar: 'w-[1.3%] min-w-[8px] bg-yellow-400' },
            { action: 'Like', weight: '+0.5', multiple: 'referans', color: 'text-white/40', bar: 'w-[0.7%] min-w-[4px] bg-white/40' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-44 text-xs text-white/35 flex-shrink-0">{item.action}</div>
              <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden backdrop-blur-sm">
                <div className={`h-full rounded-full opacity-40 ${item.bar}`} />
              </div>
              <div className={`w-16 text-right text-xs font-mono ${item.color}`}>{item.weight}</div>
              <div className="w-20 text-right text-[10px] text-white/20">{item.multiple}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Format Performance */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold text-white/65 mb-4">İçerik Format Performansı</h3>
        <div className="text-xs text-white/20 mb-3">Buffer 52M+ post analizi (2026)</div>
        <div className="space-y-3">
          {[
            { format: 'Metin', rate: 3.56, color: 'bg-green-400' },
            { format: 'Görsel', rate: 3.40, color: 'bg-blue-400' },
            { format: 'Video', rate: 2.96, color: 'bg-purple-400' },
            { format: 'Link', rate: 2.25, color: 'bg-red-400' },
          ].map(item => (
            <div key={item.format} className="flex items-center gap-3">
              <div className="w-16 text-sm text-white/45">{item.format}</div>
              <div className="flex-1 h-6 bg-white/[0.03] rounded-lg overflow-hidden">
                <div className={`h-full ${item.color} rounded-lg flex items-center pl-2`} style={{ width: `${(item.rate / 4) * 100}%`, opacity: 0.3 }}>
                  <span className="text-[10px] font-mono text-white/70">%{item.rate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Architecture */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold text-white/65 mb-4">Sistem Mimarisi</h3>
        <div className="font-mono text-xs text-white/25 leading-loose space-y-1">
          <div className="text-white/15">Kullanıcı İsteği</div>
          <div className="text-white/15 ml-2">↓</div>
          {[
            '1. Query Hydration → User Action Sequence + Features',
            '2. Candidate Sources → Thunder (in-network) + Phoenix (OON)',
            '3. Hydration → Core data, author info, media',
            '4. Pre-Scoring Filters → Duplicate, age, self, muted',
            '5. Scoring → Phoenix + Weighted + Author Diversity + OON',
            '6. Selection → Top K',
            '7. Post-Selection → VF Filter (safety)',
          ].map((step, i) => (
            <div key={i} className="ml-2 pl-3 border-l border-white/[0.08] py-0.5">{step}</div>
          ))}
          <div className="text-white/15 ml-2">↓</div>
          <div className="gradient-text ml-2 font-bold">Sıralanmış Feed</div>
        </div>
      </div>
    </div>
  )
}
