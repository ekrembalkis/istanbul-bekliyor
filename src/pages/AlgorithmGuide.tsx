import { ALGORITHM_RULES } from '../data/campaign'

export default function AlgorithmGuide() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Algoritma Rehberi</h1>
        <p className="text-sm text-slate-400 mt-1">X algoritmasinin acik kaynak kodundan (Phoenix Grok transformer) elde edilen kurallar.</p>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {ALGORITHM_RULES.map((rule, i) => (
          <div key={i} className="card p-5 hover:shadow-card-hover">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-700">{rule.title}</h3>
              <span className={`chip text-[10px] ${
                rule.weight === 'KRİTİK' ? 'bg-red-50 text-red-600 border-red-200' :
                rule.weight === 'YÜKSEK' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                'bg-slate-50 text-slate-500 border-slate-200'
              }`}>{rule.weight}</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">{rule.content}</p>
          </div>
        ))}
      </div>

      {/* Phoenix Scoring */}
      <div className="card border-l-4 border-l-brand-gold p-6 bg-brand-gold-light">
        <h3 className="font-bold text-brand-gold text-lg font-serif mb-5">Phoenix Scoring Model</h3>
        <div className="text-sm text-slate-500 space-y-4">
          <div>
            <div className="text-xs font-bold text-emerald-600 mb-2 tracking-wider">POZITIF AKSIYONLAR</div>
            <div className="text-xs text-slate-500 leading-relaxed bg-white/60 rounded-lg p-3">
              favorite, reply, retweet, quote, click, profile_click, video_view, photo_expand, share, share_via_dm, share_via_copy_link, dwell, follow_author
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-red-500 mb-2 tracking-wider">NEGATIF AKSIYONLAR</div>
            <div className="text-xs text-slate-500 leading-relaxed bg-white/60 rounded-lg p-3">
              not_interested, block_author, mute_author, report
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 font-mono text-xs text-brand-red border border-brand-gold/20">
            Final Score = Σ(weight_i × P(action_i)) × diversity_multiplier × oon_factor
          </div>
        </div>
      </div>

      {/* Engagement Weights */}
      <div className="card p-6">
        <div className="section-header">
          <h3 className="font-bold text-slate-700 text-lg font-serif">Engagement Agirliklari (Tahmini)</h3>
        </div>
        <div className="space-y-3 mt-5">
          {[
            { action: 'Reply (yazar cevap verirse)', weight: '+75', multiple: '150x like', color: 'bg-emerald-500', barWidth: '100%' },
            { action: 'Reply (normal)', weight: '+13.5', multiple: '27x like', color: 'bg-emerald-400', barWidth: '18%' },
            { action: 'Bookmark + dwell >2dk', weight: '+10', multiple: '20x like', color: 'bg-blue-400', barWidth: '13%' },
            { action: 'Retweet', weight: '+1.0', multiple: '2x like', color: 'bg-amber-400', barWidth: '2%' },
            { action: 'Like', weight: '+0.5', multiple: 'referans', color: 'bg-slate-300', barWidth: '1%' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-48 text-xs text-slate-500 flex-shrink-0">{item.action}</div>
              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.color} opacity-60`} style={{ width: item.barWidth, minWidth: '6px' }} />
              </div>
              <div className="w-14 text-right text-xs font-mono text-slate-600 font-semibold">{item.weight}</div>
              <div className="w-20 text-right text-[10px] text-slate-400">{item.multiple}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Format Performance */}
      <div className="card p-6">
        <div className="section-header">
          <h3 className="font-bold text-slate-700 text-lg font-serif">Icerik Format Performansi</h3>
        </div>
        <div className="text-xs text-slate-400 mb-4 mt-1">Buffer 52M+ post analizi (2026)</div>
        <div className="space-y-3">
          {[
            { format: 'Metin', rate: 3.56, color: 'bg-emerald-500' },
            { format: 'Gorsel', rate: 3.40, color: 'bg-blue-500' },
            { format: 'Video', rate: 2.96, color: 'bg-purple-500' },
            { format: 'Link', rate: 2.25, color: 'bg-red-500' },
          ].map(item => (
            <div key={item.format} className="flex items-center gap-3">
              <div className="w-16 text-sm text-slate-600 font-medium">{item.format}</div>
              <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                <div className={`h-full ${item.color} rounded-lg flex items-center pl-3`} style={{ width: `${(item.rate / 4) * 100}%`, opacity: 0.5 }}>
                  <span className="text-[11px] font-mono text-white font-semibold">%{item.rate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Architecture */}
      <div className="card p-6">
        <div className="section-header">
          <h3 className="font-bold text-slate-700 text-lg font-serif">Sistem Mimarisi</h3>
        </div>
        <div className="font-mono text-xs text-slate-500 leading-loose space-y-1 mt-4">
          <div className="text-slate-400 text-[10px] tracking-widest font-sans font-bold">KULLANICI ISTEGI</div>
          <div className="text-slate-300 ml-2">↓</div>
          {[
            '1. Query Hydration → User Action Sequence + Features',
            '2. Candidate Sources → Thunder (in-network) + Phoenix (OON)',
            '3. Hydration → Core data, author info, media',
            '4. Pre-Scoring Filters → Duplicate, age, self, muted',
            '5. Scoring → Phoenix + Weighted + Author Diversity + OON',
            '6. Selection → Top K',
            '7. Post-Selection → VF Filter (safety)',
          ].map((step, i) => (
            <div key={i} className="ml-2 pl-4 border-l-2 border-brand-red/20 py-1 hover:border-brand-red/50 hover:text-slate-700 transition-colors">{step}</div>
          ))}
          <div className="text-slate-300 ml-2">↓</div>
          <div className="text-brand-red font-bold ml-2 font-sans text-sm">Siralanmis Feed</div>
        </div>
      </div>
    </div>
  )
}
