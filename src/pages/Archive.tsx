import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getScoreColor } from '../lib/utils'

interface Tweet {
  id?: string
  day_number: number
  tweet_date: string
  theme: string
  tweet_text: string
  nano_prompt: string
  image_url?: string
  status: 'planned' | 'ready' | 'posted' | 'skipped'
  algorithm_score: number
  algorithm_notes: string[]
  engagement_likes: number
  engagement_replies: number
  engagement_reposts: number
  engagement_views: number
}

export default function Archive() {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.from('tweets').select('*').order('day_number', { ascending: false }).limit(100)
      .then(({ data }) => { setTweets(data || []); setLoading(false) })
  }, [])

  const filtered = filter === 'all' ? tweets : tweets.filter(t => t.status === filter)

  if (!supabase) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Arşiv</h1>
        <div className="glass-card-static border-gradient rounded-2xl text-center py-16 px-6">
          <div className="text-4xl mb-4 opacity-20">🔌</div>
          <div className="text-white/40 font-medium">Supabase Bağlantısı Gerekli</div>
          <div className="text-white/20 text-sm mt-2 max-w-md mx-auto">
            Arşiv özelliği için <code className="glass-chip text-brand-gold/60">.env</code> dosyasına
            Supabase URL ve Anon Key ekle.
          </div>
          <div className="mt-4 glass-card rounded-xl p-4 max-w-sm mx-auto text-left">
            <code className="text-xs font-mono text-white/30 leading-loose">
              VITE_SUPABASE_URL=https://xxx.supabase.co<br/>
              VITE_SUPABASE_ANON_KEY=eyJ...
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Arşiv</h1>
        <div className="flex gap-1.5">
          {[
            { v: 'all', l: 'Tümü' },
            { v: 'posted', l: 'Paylaşıldı' },
            { v: 'ready', l: 'Hazır' },
            { v: 'planned', l: 'Planlı' },
          ].map(f => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`glass-chip transition-all ${
                filter === f.v
                  ? '!bg-brand-red/15 text-brand-red !border-brand-red/25'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-white/25 text-center py-16 text-sm">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card-static rounded-2xl text-center py-16">
          <div className="text-4xl mb-4 opacity-20">📭</div>
          <div className="text-white/35">Henüz kaydedilmiş tweet yok.</div>
          <div className="text-white/15 text-sm mt-2">Planlayıcıdan ilk tweetini kaydet.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="glass-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold font-mono text-brand-gold">GÜN {t.day_number}</span>
                  <span className="text-xs text-white/20">{t.theme}</span>
                  <span className={`glass-chip ${
                    t.status === 'posted' ? '!bg-green-500/10 text-green-400' :
                    t.status === 'ready' ? '!bg-blue-500/10 text-blue-400' :
                    t.status === 'skipped' ? '!bg-white/5 text-white/30' :
                    '!bg-white/5 text-white/30'
                  }`}>
                    {t.status === 'posted' ? 'PAYLAŞILDI' : t.status === 'ready' ? 'HAZIR' : t.status === 'skipped' ? 'ATLANDI' : 'PLANLI'}
                  </span>
                </div>
                <span className={`font-mono font-bold text-sm ${getScoreColor(t.algorithm_score)}`}>{t.algorithm_score}</span>
              </div>
              <div className="text-sm text-white/40 whitespace-pre-line leading-relaxed">{t.tweet_text}</div>
              {t.status === 'posted' && (t.engagement_likes > 0 || t.engagement_views > 0) && (
                <>
                  <div className="gradient-divider mt-3 mb-3" />
                  <div className="flex gap-5 text-xs text-white/25">
                    <span>❤️ {t.engagement_likes.toLocaleString()}</span>
                    <span>💬 {t.engagement_replies.toLocaleString()}</span>
                    <span>🔁 {t.engagement_reposts.toLocaleString()}</span>
                    <span>👁️ {t.engagement_views.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
