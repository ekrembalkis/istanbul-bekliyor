import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchNews,
  filterNews,
  startNewsPolling,
  getRelativeTime,
  getNewsForTweet,
  generateInstagramContent,
  CATEGORIES,
  SOURCES,
  type NewsItem,
  type NewsApiResponse,
  type NewsFilter,
  type InstagramContent,
} from '../lib/newsService'
import { searchImages, type SearchImage } from '../lib/imageSearch'

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
    navigate(`/style?${qs}`)
  }

  // Instagram content generation + image search
  const [igModal, setIgModal] = useState<{
    item: NewsItem
    content: InstagramContent | null
    loading: boolean
    error: string
    images: SearchImage[]
    imageLoading: boolean
    imageQuery: string
    selectedImage: string | null
  } | null>(null)

  const handleInstagram = async (item: NewsItem) => {
    setIgModal({ item, content: null, loading: true, error: '', images: [], imageLoading: false, imageQuery: item.title, selectedImage: null })
    try {
      const content = await generateInstagramContent(item)
      setIgModal(prev => prev ? { ...prev, content, loading: false } : null)
      // Auto-search images after content loads
      setIgModal(prev => prev ? { ...prev, imageLoading: true } : null)
      const images = await searchImages(item.title)
      setIgModal(prev => prev ? { ...prev, images, imageLoading: false } : null)
    } catch (err) {
      setIgModal(prev => prev ? { ...prev, loading: false, imageLoading: false, error: err instanceof Error ? err.message : 'Bilinmeyen hata' } : null)
    }
  }

  const handleImageSearch = async (query: string) => {
    if (!igModal || query.trim().length < 2) return
    setIgModal(prev => prev ? { ...prev, imageLoading: true, imageQuery: query, selectedImage: null } : null)
    try {
      const images = await searchImages(query)
      setIgModal(prev => prev ? { ...prev, images, imageLoading: false } : null)
    } catch {
      setIgModal(prev => prev ? { ...prev, imageLoading: false } : null)
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
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
                    onInstagram={handleInstagram}
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
                  onInstagram={handleInstagram}
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

      {/* Instagram Content Modal */}
      {igModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setIgModal(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-dark-card shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-dark-card rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="text-fuchsia-500 text-lg">&#9632;</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Instagram İçeriği</h3>
              </div>
              <button
                onClick={() => setIgModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                &#10005;
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Source news title */}
              <div className="text-xs text-slate-400 leading-relaxed">
                <span className="font-medium text-slate-500 dark:text-slate-300">{igModal.item.sourceLabel}:</span>{' '}
                {igModal.item.title}
              </div>

              {/* Loading */}
              {igModal.loading && (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block w-6 h-6 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Gemini ile oluşturuluyor...</p>
                </div>
              )}

              {/* Error */}
              {igModal.error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <p className="text-xs text-red-600 dark:text-red-400">{igModal.error}</p>
                  <button
                    onClick={() => handleInstagram(igModal.item)}
                    className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 underline"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}

              {/* Content */}
              {igModal.content && (
                <>
                  {/* Image Text */}
                  <ContentBlock
                    label="Görsel Üstü Metin"
                    sublabel="Post görselinin alt alanına yazılacak"
                    content={igModal.content.imageText}
                    onCopy={handleCopy}
                  />

                  {/* Caption Hook */}
                  <ContentBlock
                    label="Caption Hook"
                    sublabel="Caption'ın en başı — büyük harflerle"
                    content={igModal.content.captionHook}
                    onCopy={handleCopy}
                    mono
                  />

                  {/* Caption Body */}
                  <ContentBlock
                    label="Caption Metni"
                    sublabel="Giriş → Gelişme → Sonuç"
                    content={igModal.content.captionBody}
                    onCopy={handleCopy}
                  />

                  {/* Copy Full Caption */}
                  <button
                    onClick={() => handleCopy(`${igModal.content!.captionHook}\n\n${igModal.content!.captionBody}`)}
                    className="w-full py-2.5 text-xs font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 rounded-lg transition-colors"
                  >
                    Tam Caption'u Kopyala (Hook + Body)
                  </button>

                  {/* Image Search Section */}
                  <div className="pt-4 mt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">GÖRSEL ARA</div>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={igModal.imageQuery}
                        onChange={e => setIgModal(prev => prev ? { ...prev, imageQuery: e.target.value } : null)}
                        onKeyDown={e => e.key === 'Enter' && handleImageSearch(igModal.imageQuery)}
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-dark-bg text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                        placeholder="Görsel ara..."
                      />
                      <button
                        onClick={() => handleImageSearch(igModal.imageQuery)}
                        disabled={igModal.imageLoading}
                        className="px-3 py-2 text-xs font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {igModal.imageLoading ? '...' : 'Ara'}
                      </button>
                    </div>

                    {igModal.imageLoading && (
                      <div className="py-6 text-center">
                        <div className="inline-block w-5 h-5 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
                      </div>
                    )}

                    {igModal.images.length > 0 && !igModal.imageLoading && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {igModal.images.map(img => (
                            <button
                              key={img.id}
                              onClick={() => setIgModal(prev => prev ? { ...prev, selectedImage: prev.selectedImage === img.url ? null : img.url } : null)}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                igModal.selectedImage === img.url
                                  ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/30'
                                  : 'border-transparent hover:border-slate-300 dark:hover:border-white/20'
                              }`}
                            >
                              <img
                                src={img.thumbnail}
                                alt={img.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={e => { (e.target as HTMLElement).style.display = 'none' }}
                              />
                              {igModal.selectedImage === img.url && (
                                <div className="absolute inset-0 bg-fuchsia-500/20 flex items-center justify-center">
                                  <span className="text-white text-lg font-bold">&#10003;</span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        {igModal.selectedImage && (
                          <button
                            onClick={() => handleCopy(igModal.selectedImage!)}
                            className="w-full mt-3 py-2 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/[0.08] hover:bg-fuchsia-500/[0.15] rounded-lg transition-colors"
                          >
                            Görsel URL Kopyala
                          </button>
                        )}
                      </>
                    )}

                    {igModal.images.length === 0 && !igModal.imageLoading && igModal.content && (
                      <p className="text-[10px] text-slate-400 text-center py-3">Görsel bulunamadı. Farklı bir arama deneyin.</p>
                    )}
                  </div>

                  {/* Regenerate */}
                  <button
                    onClick={() => handleInstagram(igModal.item)}
                    className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg transition-colors"
                  >
                    Yeniden Oluştur
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NewsCard({
  item,
  isCampaign,
  onUseTweet,
  onInstagram,
}: {
  item: NewsItem
  isCampaign?: boolean
  onUseTweet: (item: NewsItem) => void
  onInstagram: (item: NewsItem) => void
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
        <button
          onClick={() => onInstagram(item)}
          className="px-3 py-1.5 text-[11px] font-medium text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/[0.06] hover:bg-fuchsia-500/[0.12] rounded-lg transition-colors"
        >
          Instagram İçin Kullan
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

function ContentBlock({
  label,
  sublabel,
  content,
  onCopy,
  mono,
}: {
  label: string
  sublabel: string
  content: string
  onCopy: (text: string) => void
  mono?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleClick = () => {
    onCopy(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/[0.03]">
        <div>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
          <span className="text-[10px] text-slate-400 ml-2">{sublabel}</span>
        </div>
        <button
          onClick={handleClick}
          className="px-2 py-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors"
        >
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <div className={`px-3 py-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap ${mono ? 'font-mono text-base font-black tracking-wide text-slate-900 dark:text-white' : ''}`}>
        {content}
      </div>
    </div>
  )
}
