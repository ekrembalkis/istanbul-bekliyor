import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchNews,
  filterNews,
  startNewsPolling,
  getRelativeTime,
  getNewsForTweet,
  CATEGORIES,
  SOURCES,
  type NewsItem,
  type NewsApiResponse,
  type NewsFilter,
} from '../lib/newsService'

const SOURCE_COLORS: Record<string, string> = {
  aa: 'bg-red-500/10 text-red-600 dark:text-red-400',
  ntv: 'bg-green-500/10 text-green-600 dark:text-green-400',
  cnnturk: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  diken: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  bianet: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  bbc: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  sozcu: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  cumhuriyet: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

const CATEGORY_COLORS: Record<string, string> = {
  siyaset: 'bg-red-500/10 text-red-600 dark:text-red-400',
  ekonomi: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  dunya: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  teknoloji: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  toplum: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  spor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
}

const defaultFilter: NewsFilter = {
  category: 'all',
  source: 'all',
  campaignOnly: false,
  searchQuery: '',
}

export default function HaberServisi() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NewsItem[]>([])
  const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({})
  const [fetchedAt, setFetchedAt] = useState<string>('')
  const [filter, setFilter] = useState<NewsFilter>(defaultFilter)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const handleData = useCallback((data: NewsApiResponse) => {
    setItems(data.items)
    setSourceStatus(data.sourceStatus)
    setFetchedAt(data.fetchedAt)
    setLoading(false)
    setError('')
  }, [])

  useEffect(() => {
    fetchNews()
      .then(handleData)
      .catch(err => { setError(err.message); setLoading(false) })

    const cleanup = startNewsPolling(handleData, (err) => setError(err.message))
    return cleanup
  }, [handleData])

  const filtered = filterNews(items, filter)
  const campaignSignals = filtered.filter(i => i.isCampaignSignal)
  const generalNews = filtered.filter(i => !i.isCampaignSignal)

  const okCount = Object.values(sourceStatus).filter(s => s === 'ok').length
  const totalCount = Object.keys(sourceStatus).length

  const handleUseTweet = (item: NewsItem) => {
    const params = getNewsForTweet(item)
    const qs = new URLSearchParams(params).toString()
    navigate(`/planner?${qs}`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-850 dark:text-white">
            Haber Servisi
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Türkiye gündemi, canlı ve kategorize
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetchedAt && (
            <span className="text-xs text-slate-400">
              Son: {getRelativeTime(fetchedAt)}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-red/[0.06] border border-brand-red/10">
            <span className="live-dot" />
            <span className="text-[10px] font-bold tracking-[2px] text-brand-red">
              {okCount}/{totalCount} KAYNAK
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 space-y-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilter(f => ({ ...f, category: cat.key }))}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter.category === cat.key
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Source + Search + Campaign Toggle */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filter.source}
            onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}
            className="px-3 py-2 text-xs rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-dark-bg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          >
            {SOURCES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Haberlerde ara..."
            value={filter.searchQuery}
            onChange={e => setFilter(f => ({ ...f, searchQuery: e.target.value }))}
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-dark-bg text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />

          <button
            onClick={() => setFilter(f => ({ ...f, campaignOnly: !f.campaignOnly }))}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
              filter.campaignOnly
                ? 'bg-brand-red/10 border-brand-red/30 text-brand-red'
                : 'border-black/[0.08] dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
          >
            Kampanya Sinyali
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-500/10">
          <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-3 bg-slate-200 dark:bg-white/[0.06] rounded w-16 mb-3" />
              <div className="h-4 bg-slate-200 dark:bg-white/[0.06] rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-white/[0.06] rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Campaign Signals */}
          {campaignSignals.length > 0 && !filter.campaignOnly && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="live-dot" />
                <h2 className="text-sm font-bold text-brand-red tracking-wide">
                  KAMPANYA SİNYALİ ({campaignSignals.length})
                </h2>
              </div>
              <div className="space-y-3">
                {campaignSignals.map(item => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    isCampaign
                    onUseTweet={handleUseTweet}
                  />
                ))}
              </div>
            </section>
          )}

          {/* General News (or all if campaignOnly) */}
          <section>
            {!filter.campaignOnly && campaignSignals.length > 0 && (
              <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide mb-3">
                GENEL GÜNDEM ({generalNews.length})
              </h2>
            )}
            {(filter.campaignOnly ? filtered : generalNews).length === 0 && (
              <div className="card p-8 text-center">
                <p className="text-sm text-slate-400">
                  {filter.searchQuery
                    ? `"${filter.searchQuery}" için sonuç bulunamadı.`
                    : 'Bu filtreye uygun haber yok.'}
                </p>
              </div>
            )}
            <div className="space-y-3">
              {(filter.campaignOnly ? filtered : generalNews).map(item => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onUseTweet={handleUseTweet}
                />
              ))}
            </div>
          </section>

          {/* Source Status */}
          <section className="card p-4">
            <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">KAYNAK DURUMU</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sourceStatus).map(([key, status]) => {
                const label = SOURCES.find(s => s.key === key)?.label || key
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium ${
                      status === 'ok'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {label}
                  </span>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function NewsCard({
  item,
  isCampaign,
  onUseTweet,
}: {
  item: NewsItem
  isCampaign?: boolean
  onUseTweet: (item: NewsItem) => void
}) {
  const sourceColor = SOURCE_COLORS[item.source] || 'bg-slate-500/10 text-slate-500'
  const categoryColor = CATEGORY_COLORS[item.category] || 'bg-slate-500/10 text-slate-500'
  const categoryLabel = CATEGORIES.find(c => c.key === item.category)?.label || item.category

  return (
    <article
      className={`card p-4 sm:p-5 transition-all hover:shadow-card-hover dark:hover:shadow-dark-card-hover ${
        isCampaign ? 'border-l-4 border-l-brand-red' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${sourceColor}`}>
              {item.sourceLabel}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${categoryColor}`}>
              {categoryLabel}
            </span>
            {item.isCampaignSignal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-brand-red/10 text-brand-red">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                Kampanya
              </span>
            )}
            <span className="text-[10px] text-slate-400 ml-auto">
              {getRelativeTime(item.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-semibold text-slate-800 dark:text-white hover:text-brand-red dark:hover:text-brand-red transition-colors leading-snug mb-1"
          >
            {item.title}
          </a>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {/* Image thumbnail */}
        {item.imageUrl && (
          <div className="hidden sm:block flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-white/[0.06]">
            <img
              src={item.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={e => { (e.target as HTMLElement).parentElement!.style.display = 'none' }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
        <button
          onClick={() => onUseTweet(item)}
          className="px-3 py-1.5 text-[11px] font-medium text-brand-red bg-brand-red/[0.06] hover:bg-brand-red/[0.12] rounded-lg transition-colors"
        >
          Tweet İçin Kullan
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg transition-colors"
        >
          Habere Git
        </a>
      </div>
    </article>
  )
}
