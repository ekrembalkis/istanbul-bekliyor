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
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-[#E7E9EA]">Arşiv</h1>
        <div className="border-b border-[#2F3336] py-4 text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(231,233,234,0.04)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#71767B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
            </svg>
          </div>
          <div className="text-[#E7E9EA] font-semibold">Supabase Bağlantısı Gerekli</div>
          <div className="text-[#71767B] text-sm mt-2 max-w-md mx-auto">
            Arşiv özelliği için <code className="chip text-[#1D9BF0]">.env</code> dosyasına
            Supabase URL ve Anon Key ekle.
          </div>
          <div className="mt-6 bg-[rgba(231,233,234,0.03)] rounded-xl p-4 max-w-sm mx-auto text-left border border-[#2F3336]">
            <code className="text-xs text-[#71767B] leading-loose">
              VITE_SUPABASE_URL=https://xxx.supabase.co<br/>
              VITE_SUPABASE_ANON_KEY=eyJ...
            </code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#E7E9EA]">Arşiv</h1>
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
              className={`chip transition-all cursor-pointer ${
                filter === f.v
                  ? 'bg-[#1D9BF0]/10 text-[#1D9BF0] border-[#1D9BF0]/20'
                  : 'text-[#71767B] hover:text-[#E7E9EA] hover:bg-[rgba(231,233,234,0.1)]'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-[#71767B] text-center py-20 text-sm">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="border-b border-[#2F3336] py-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgba(231,233,234,0.04)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#71767B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <div className="text-[#71767B] font-medium">Henüz kaydedilmiş tweet yok.</div>
          <div className="text-[#71767B] text-sm mt-2">Planlayıcıdan ilk tweetini kaydet.</div>
        </div>
      ) : (
        <div>
          {filtered.map(t => (
            <div key={t.id} className="border-b border-[#2F3336] py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-[#1D9BF0]">GÜN {t.day_number}</span>
                  <span className="text-xs text-[#71767B]">{t.theme}</span>
                  <span className={`chip text-[10px] ${
                    t.status === 'posted' ? 'bg-[#00BA7C]/10 text-[#00BA7C] border-[#00BA7C]/20' :
                    t.status === 'ready' ? 'bg-[#1D9BF0]/10 text-[#1D9BF0] border-[#1D9BF0]/20' :
                    'bg-[rgba(231,233,234,0.04)] text-[#71767B] border-[rgba(231,233,234,0.1)]'
                  }`}>
                    {t.status === 'posted' ? 'PAYLAŞILDI' : t.status === 'ready' ? 'HAZIR' : t.status === 'skipped' ? 'ATLANDI' : 'PLANLI'}
                  </span>
                </div>
                <span className={`font-bold text-sm ${getScoreColor(t.algorithm_score)}`}>{t.algorithm_score}</span>
              </div>
              <div className="text-sm text-[#E7E9EA] whitespace-pre-line leading-relaxed">{t.tweet_text}</div>
              {t.status === 'posted' && (t.engagement_likes > 0 || t.engagement_views > 0) && (
                <>
                  <div className="divider mt-4 mb-3" />
                  <div className="flex gap-6 text-xs text-[#71767B]">
                    <span className="flex items-center gap-1">♥ {t.engagement_likes.toLocaleString()}</span>
                    <span className="flex items-center gap-1">💬 {t.engagement_replies.toLocaleString()}</span>
                    <span className="flex items-center gap-1">🔁 {t.engagement_reposts.toLocaleString()}</span>
                    <span className="flex items-center gap-1">👁 {t.engagement_views.toLocaleString()}</span>
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
