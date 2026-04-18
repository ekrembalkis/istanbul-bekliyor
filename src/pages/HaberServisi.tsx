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
  aa: 'bg-x-accent/10 text-x-accent',
  ntv: 'bg-x-text-primary/10 text-x-text-primary',
  cnnturk: 'bg-[#38BDF8]/10 text-[#38BDF8]',
  diken: 'bg-[#FB923C]/10 text-[#FB923C]',
  bianet: 'bg-[#A855F7]/10 text-[#A855F7]',
  bbc: 'bg-x-surface-active text-x-text-primary',
  sozcu: 'bg-x-accent/10 text-x-accent',
  cumhuriyet: 'bg-[#FB7185]/10 text-[#FB7185]',
}

const CATEGORY_COLORS: Record<string, string> = {
  siyaset: 'bg-x-accent/10 text-x-accent',
  ekonomi: 'bg-x-text-primary/10 text-x-text-primary',
  dunya: 'bg-x-accent/10 text-x-accent',
  teknoloji: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
  toplum: 'bg-campaign-gold/10 text-campaign-gold',
  spor: 'bg-[#22D3EE]/10 text-[#22D3EE]',
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
      // Use AI-generated search query if available, fallback to title
      const query = content.imageSearchQuery || item.title
      setIgModal(prev => prev ? { ...prev, content, loading: false, imageQuery: query, imageLoading: true } : null)
      // Auto-search images with AI-optimized query
      const images = await searchImages(query)
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
          <h1 className="text-2xl sm:text-3xl font-bold text-x-text-primary">
            Haber Servisi
          </h1>
          <p className="text-sm text-x-text-secondary mt-1">
            Türkiye gündemi, canlı ve kategorize
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetchedAt && (
            <span className="text-xs text-x-text-secondary">
              Son: {getRelativeTime(fetchedAt)}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-x-accent/[0.06] border border-x-accent/10">
            <span className="live-dot" />
            <span className="text-[10px] font-bold tracking-[2px] text-x-accent">
              {okCount}/{totalCount} KAYNAK
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-x-border pb-4 space-y-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilter(f => ({ ...f, category: cat.key }))}
              className={`px-3 py-1.5 text-xs font-medium rounded-none transition-all ${
                filter.category === cat.key
                  ? 'bg-x-accent text-white'
                  : 'bg-x-surface-hover text-x-text-secondary hover:bg-x-surface-active'
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
            className="min-w-[170px] px-3 py-2 pr-8 text-xs rounded-none border border-x-border bg-[#000000] text-x-text-primary focus:outline-none focus:ring-2 focus:ring-x-accent/20"
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
            className="flex-1 px-3 py-2 text-xs rounded-none border border-x-border bg-[#000000] text-x-text-primary placeholder:text-x-text-secondary focus:outline-none focus:ring-2 focus:ring-x-accent/20"
          />

          <button
            onClick={() => setFilter(f => ({ ...f, campaignOnly: !f.campaignOnly }))}
            className={`px-3 py-2 text-xs font-medium rounded-none border transition-all whitespace-nowrap ${
              filter.campaignOnly
                ? 'bg-x-accent/10 border-x-accent/30 text-x-accent'
                : 'border-x-border text-x-text-secondary hover:bg-x-surface-active'
            }`}
          >
            Kampanya Sinyali
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 border-l-4 border-campaign-gold bg-campaign-gold/10">
          <p className="text-xs text-campaign-gold">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-x-border py-4 animate-pulse">
              <div className="h-3 bg-x-surface-hover rounded w-16 mb-3" />
              <div className="h-4 bg-x-surface-hover rounded w-3/4 mb-2" />
              <div className="h-3 bg-x-surface-hover rounded w-full" />
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
                <h2 className="text-sm font-bold text-x-accent tracking-wide">
                  KAMPANYA SİNYALİ ({campaignSignals.length})
                </h2>
              </div>
              <div className="space-y-0">
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
              <h2 className="text-sm font-bold text-x-text-secondary tracking-wide mb-3">
                GENEL GÜNDEM ({generalNews.length})
              </h2>
            )}
            {(filter.campaignOnly ? filtered : generalNews).length === 0 && (
              <div className="border-b border-x-border py-8 text-center">
                <p className="text-sm text-x-text-secondary">
                  {filter.searchQuery
                    ? `"${filter.searchQuery}" için sonuç bulunamadı.`
                    : 'Bu filtreye uygun haber yok.'}
                </p>
              </div>
            )}
            <div className="space-y-0">
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
          <section className="border-b border-x-border py-4">
            <div className="text-[10px] font-bold text-x-text-secondary tracking-wider mb-2">KAYNAK DURUMU</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sourceStatus).map(([key, status]) => {
                const label = SOURCES.find(s => s.key === key)?.label || key
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium ${
                      status === 'ok'
                        ? 'bg-x-text-primary/10 text-x-text-primary'
                        : 'bg-x-accent/10 text-x-accent'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'ok' ? 'bg-x-text-primary' : 'bg-x-accent'}`} />
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
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-none bg-x-surface border border-x-border"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-x-border bg-x-surface rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="text-fuchsia-500 text-lg">&#9632;</span>
                <h3 className="text-sm font-bold text-x-text-primary">Instagram İçeriği</h3>
              </div>
              <button
                onClick={() => setIgModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-none text-x-text-secondary hover:bg-x-surface-active transition-colors"
              >
                &#10005;
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Source news title */}
              <div className="text-xs text-x-text-secondary leading-relaxed">
                <span className="font-medium text-x-text-primary">{igModal.item.sourceLabel}:</span>{' '}
                {igModal.item.title}
              </div>

              {/* Loading */}
              {igModal.loading && (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-block w-6 h-6 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
                  <p className="text-xs text-x-text-secondary">Gemini ile oluşturuluyor...</p>
                </div>
              )}

              {/* Error */}
              {igModal.error && (
                <div className="p-3 rounded-none bg-x-accent/10 border border-x-accent/20">
                  <p className="text-xs text-x-accent">{igModal.error}</p>
                  <button
                    onClick={() => handleInstagram(igModal.item)}
                    className="mt-2 text-xs font-medium text-x-accent underline"
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
                    className="w-full py-2.5 text-xs font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 rounded-none transition-colors"
                  >
                    Tam Caption'u Kopyala (Hook + Body)
                  </button>

                  {/* Image Search Section */}
                  <div className="pt-4 mt-4 border-t border-x-border">
                    <div className="text-[10px] font-bold text-x-text-secondary tracking-wider mb-2">GÖRSEL ARA</div>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={igModal.imageQuery}
                        onChange={e => setIgModal(prev => prev ? { ...prev, imageQuery: e.target.value } : null)}
                        onKeyDown={e => e.key === 'Enter' && handleImageSearch(igModal.imageQuery)}
                        className="flex-1 px-3 py-2 text-xs rounded-none border border-x-border bg-[#000000] text-x-text-primary placeholder:text-x-text-secondary focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                        placeholder="Görsel ara..."
                      />
                      <button
                        onClick={() => handleImageSearch(igModal.imageQuery)}
                        disabled={igModal.imageLoading}
                        className="px-3 py-2 text-xs font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-700 rounded-none transition-colors disabled:opacity-50"
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
                        <ImageGrid
                          images={igModal.images}
                          selectedUrl={igModal.selectedImage}
                          onSelect={url => setIgModal(prev => prev ? { ...prev, selectedImage: prev.selectedImage === url ? null : url } : null)}
                        />

                        <p className="text-[10px] text-x-text-secondary text-center mt-2">
                          {igModal.images.length} görsel bulundu
                          {igModal.selectedImage && ' — 1 seçili'}
                        </p>

                        {igModal.selectedImage && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleCopy(igModal.selectedImage!)}
                              className="flex-1 py-2 text-xs font-bold text-fuchsia-400 bg-fuchsia-500/[0.08] hover:bg-fuchsia-500/[0.15] rounded-none transition-colors"
                            >
                              URL Kopyala
                            </button>
                            <a
                              href={`/api/image-download?url=${encodeURIComponent(igModal.selectedImage!)}`}
                              download
                              className="flex-1 py-2 text-xs font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 rounded-none transition-colors text-center"
                            >
                              İndir
                            </a>
                          </div>
                        )}
                      </>
                    )}

                    {igModal.images.length === 0 && !igModal.imageLoading && igModal.content && (
                      <p className="text-[10px] text-x-text-secondary text-center py-3">Görsel bulunamadı. Farklı bir arama deneyin.</p>
                    )}
                  </div>

                  {/* Regenerate */}
                  <button
                    onClick={() => handleInstagram(igModal.item)}
                    className="w-full py-2 text-xs font-medium text-x-text-secondary bg-x-surface-hover hover:bg-x-surface-active rounded-none transition-colors"
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
  const sourceColor = SOURCE_COLORS[item.source] || 'bg-x-surface-active text-x-text-secondary'
  const categoryColor = CATEGORY_COLORS[item.category] || 'bg-x-surface-active text-x-text-secondary'
  const categoryLabel = CATEGORIES.find(c => c.key === item.category)?.label || item.category

  return (
    <article
      className={`border-b border-x-border py-4 transition-all hover:bg-x-surface-hover ${
        isCampaign ? 'bg-campaign-red/[0.04]' : ''
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-x-accent/10 text-x-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-x-accent animate-pulse" />
                Kampanya
              </span>
            )}
            <span className="text-[10px] text-x-text-secondary ml-auto">
              {getRelativeTime(item.publishedAt)}
            </span>
          </div>

          {/* Title */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-semibold text-x-text-primary hover:text-x-accent transition-colors leading-snug mb-1"
          >
            {item.title}
          </a>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-x-text-secondary leading-relaxed line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {/* Image thumbnail */}
        {item.imageUrl && (
          <div className="hidden sm:block flex-shrink-0 w-20 h-20 rounded-none overflow-hidden bg-x-surface-hover">
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
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-x-border">
        <button
          onClick={() => onUseTweet(item)}
          className="px-3 py-1.5 text-[11px] font-medium text-x-accent bg-x-accent/[0.06] hover:bg-x-accent/[0.12] rounded-none transition-colors"
        >
          Tweet İçin Kullan
        </button>
        <button
          onClick={() => onInstagram(item)}
          className="px-3 py-1.5 text-[11px] font-medium text-fuchsia-400 bg-fuchsia-500/[0.06] hover:bg-fuchsia-500/[0.12] rounded-none transition-colors"
        >
          Instagram İçin Kullan
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-[11px] font-medium text-x-text-secondary bg-x-surface-hover hover:bg-x-surface-active rounded-none transition-colors"
        >
          Habere Git
        </a>
      </div>
    </article>
  )
}

function ImageGrid({
  images,
  selectedUrl,
  onSelect,
}: {
  images: SearchImage[]
  selectedUrl: string | null
  onSelect: (url: string) => void
}) {
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set())

  // Reset failed thumbs when images change
  useEffect(() => {
    setFailedThumbs(new Set())
  }, [images])

  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map(img => {
        const isSelected = selectedUrl === img.url
        const hasFailed = failedThumbs.has(img.id)

        return (
          <button
            key={img.id}
            onClick={() => onSelect(img.url)}
            className={`group relative aspect-square rounded-none overflow-hidden border-2 transition-all ${
              isSelected
                ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/30 bg-fuchsia-500/10'
                : 'border-x-border hover:border-fuchsia-400/60 hover:scale-[1.03]'
            }`}
          >
            {!hasFailed ? (
              <img
                src={img.thumbnail}
                alt={img.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setFailedThumbs(prev => new Set(prev).add(img.id))}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-x-surface-hover text-x-text-secondary">
                <span className="text-lg">&#128247;</span>
                <span className="text-[9px] mt-1">Yüklenemedi</span>
              </div>
            )}

            {/* Selected indicator */}
            {isSelected && (
              <>
                <div className="absolute inset-0 bg-fuchsia-500/20" />
                <div className="absolute bottom-1 left-1 right-1 py-0.5 rounded text-[9px] font-bold text-center bg-fuchsia-500/80 text-white">
                  Seçili
                </div>
              </>
            )}

            {/* Title tooltip on hover */}
            {img.title && !isSelected && (
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[9px] text-white truncate">{img.title}</p>
              </div>
            )}
          </button>
        )
      })}
    </div>
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
    <div className="rounded-none border border-x-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-x-surface-hover">
        <div>
          <span className="text-[11px] font-bold text-x-text-primary">{label}</span>
          <span className="text-[10px] text-x-text-secondary ml-2">{sublabel}</span>
        </div>
        <button
          onClick={handleClick}
          className="px-2 py-1 text-[10px] font-medium text-x-text-secondary hover:text-fuchsia-400 transition-colors"
        >
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <div className={`px-3 py-3 text-xs leading-relaxed text-x-text-primary whitespace-pre-wrap ${mono ? 'text-base font-black tracking-wide text-white' : ''}`}>
        {content}
      </div>
    </div>
  )
}
