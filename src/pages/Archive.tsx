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
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800">Arsiv</h1>
        </div>
        <div className="card text-center py-20 px-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
            </svg>
          </div>
          <div className="text-slate-600 font-semibold">Supabase Baglantisi Gerekli</div>
          <div className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Arsiv ozelligi icin <code className="chip text-brand-red">.env</code> dosyasina
            Supabase URL ve Anon Key ekle.
          </div>
          <div className="mt-6 bg-slate-50 rounded-xl p-4 max-w-sm mx-auto text-left border border-slate-100">
            <code className="text-xs font-mono text-slate-500 leading-loose">
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
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800">Arsiv</h1>
        </div>
        <div className="flex gap-1.5">
          {[
            { v: 'all', l: 'Tumu' },
            { v: 'posted', l: 'Paylasildi' },
            { v: 'ready', l: 'Hazir' },
            { v: 'planned', l: 'Planli' },
          ].map(f => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`chip transition-all cursor-pointer ${
                filter === f.v
                  ? 'bg-brand-red/10 text-brand-red border-brand-red/20'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-20 text-sm">Yukleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <div className="text-slate-500 font-medium">Henuz kaydedilmis tweet yok.</div>
          <div className="text-slate-400 text-sm mt-2">Planlayicidan ilk tweetini kaydet.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold font-mono text-brand-red">GUN {t.day_number}</span>
                  <span className="text-xs text-slate-400">{t.theme}</span>
                  <span className={`chip text-[10px] ${
                    t.status === 'posted' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    t.status === 'ready' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {t.status === 'posted' ? 'PAYLASILDI' : t.status === 'ready' ? 'HAZIR' : t.status === 'skipped' ? 'ATLANDI' : 'PLANLI'}
                  </span>
                </div>
                <span className={`font-mono font-bold text-sm ${getScoreColor(t.algorithm_score)}`}>{t.algorithm_score}</span>
              </div>
              <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{t.tweet_text}</div>
              {t.status === 'posted' && (t.engagement_likes > 0 || t.engagement_views > 0) && (
                <>
                  <div className="divider mt-4 mb-3" />
                  <div className="flex gap-6 text-xs text-slate-400">
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
