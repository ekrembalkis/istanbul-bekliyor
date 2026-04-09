import { ChangeEvent, useEffect, useState } from 'react'
import PreviewMedia from '../components/preview/PreviewMedia'
import {
  PreviewAsset,
  PreviewSurface,
  SAMPLE_ASSETS,
  createUploadAsset,
  duplicateAsset,
  getRatioLabel,
  getSurfaceSummary,
  loadPreviewAssets,
  moveAsset,
  readFileAsDataUrl,
  readImageRatio,
  savePreviewAssets,
} from '../lib/instagramPreview'

const SURFACE_LABELS: Record<PreviewSurface, string> = {
  profile: 'Profil Grid',
  reels: 'Reels Grid',
  explore: 'Keşfet Simülasyonu',
}

const PROFILE_NOTES = [
  'Profil grid artık kare değil, dikey thumbnail mantığına daha yakın.',
  '1:1 görseller yandan, 9:16 kapaklar üst-alt eksende kırpılır.',
  'Metin ve logo güvenli alanı orta bantta tutulmalı.',
]

const REELS_NOTES = [
  'Reels sekmesinde dikey kapak tam boy hissi verir.',
  'Aynı kapak profil gridde merkez 3:4 alana düşürülür.',
  'Kapak metni üst veya alt kenara yapışmamalı.',
]

const EXPLORE_NOTES = [
  'Explore herkeste aynı değildir; bu görünüm yüksek doğruluklu bir simülasyondur.',
  'Kare kartlar temel yüzey olarak korunur, büyük dikkat çeken kutular araya girer.',
  'Hero işaretli kartlar mozaikte büyük alan alır.',
]

function getInitialAssets() {
  return loadPreviewAssets()
}

function getInitialSelectedId() {
  return getInitialAssets()[0]?.id || SAMPLE_ASSETS[0].id
}

function getPreviewNotes(surface: PreviewSurface) {
  if (surface === 'profile') return PROFILE_NOTES
  if (surface === 'reels') return REELS_NOTES
  return EXPLORE_NOTES
}

export default function InstagramPreview() {
  const [surface, setSurface] = useState<PreviewSurface>('profile')
  const [assets, setAssets] = useState<PreviewAsset[]>(() => getInitialAssets())
  const [selectedId, setSelectedId] = useState<string>(() => getInitialSelectedId())
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    savePreviewAssets(assets)
  }, [assets])

  const selectedAsset = assets.find(asset => asset.id === selectedId) || assets[0]
  const selectedIndex = assets.findIndex(asset => asset.id === selectedAsset?.id)
  const reelsAssets = assets.filter(asset => asset.kind === 'reel')
  const heroCount = assets.filter(asset => asset.highlight).length

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    try {
      const uploadedAssets = await Promise.all(files.map(async file => {
        const dataUrl = await readFileAsDataUrl(file)
        const sourceRatio = await readImageRatio(dataUrl)
        return createUploadAsset(file.name, dataUrl, sourceRatio)
      }))

      setAssets(current => [...uploadedAssets, ...current])
      setSelectedId(uploadedAssets[0].id)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  function updateSelected(patch: Partial<PreviewAsset>) {
    if (!selectedAsset) return
    setAssets(current => current.map(asset => asset.id === selectedAsset.id ? { ...asset, ...patch } : asset))
  }

  function moveSelected(direction: -1 | 1) {
    if (selectedIndex < 0) return
    setAssets(current => moveAsset(current, selectedIndex, selectedIndex + direction))
  }

  function cloneSelected() {
    if (!selectedAsset) return
    const copy = duplicateAsset(selectedAsset)
    setAssets(current => [copy, ...current])
    setSelectedId(copy.id)
  }

  function removeSelected() {
    if (!selectedAsset || assets.length === 1) return
    const next = assets.filter(asset => asset.id !== selectedAsset.id)
    setAssets(next)
    setSelectedId(next[0].id)
  }

  function resetSamples() {
    setAssets(SAMPLE_ASSETS)
    setSelectedId(SAMPLE_ASSETS[0].id)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white px-6 py-8 shadow-card dark:border-white/[0.06] dark:bg-dark-card sm:px-8">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(227,10,23,0.12),_transparent_50%)]" />
        <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-brand-gold/10 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-red/15 bg-brand-red/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-brand-red">
              Instagram Preview Lab
            </div>
            <h1 className="max-w-3xl font-serif text-3xl font-bold tracking-tight text-slate-850 dark:text-white sm:text-4xl">
              Profil grid, reels grid ve keşfet yüzeyini tek yerde, gerçekçi crop mantığı ile gör.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Bu araç birebir profil grid ve reels kapak davranışını hedefler. Keşfet görünümü ise algoritmik olarak aynı olmayacağı için
              açıkça simülasyon olarak işaretlenir. Temsil görselleri yükleyip doğru crop bölgesini ayarlayabilirsin.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <label className="btn btn-primary cursor-pointer">
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                {uploading ? 'Yükleniyor...' : 'Temsil görseli yükle'}
              </label>
              <button type="button" className="btn" onClick={cloneSelected}>Seçili kartı çoğalt</button>
              <button type="button" className="btn" onClick={resetSamples}>Örnek seti geri yükle</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-black/[0.06] bg-slate-50/80 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Toplam kart</div>
              <div className="mt-3 stat-number text-4xl text-slate-850 dark:text-white">{assets.length}</div>
            </div>
            <div className="rounded-[1.5rem] border border-black/[0.06] bg-slate-50/80 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Reels kart</div>
              <div className="mt-3 stat-number text-4xl text-brand-red">{reelsAssets.length}</div>
            </div>
            <div className="rounded-[1.5rem] border border-black/[0.06] bg-slate-50/80 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Hero explore</div>
              <div className="mt-3 stat-number text-4xl text-brand-gold">{heroCount}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden p-4 sm:p-6">
            <div className="flex flex-col gap-4 border-b border-black/[0.06] pb-5 dark:border-white/[0.06] sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="section-header">
                  <h2 className="font-serif text-2xl font-bold text-slate-850 dark:text-white">Canlı yüzey</h2>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{getSurfaceSummary(surface)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['profile', 'reels', 'explore'] as PreviewSurface[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSurface(item)}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-all ${
                      surface === item
                        ? 'bg-brand-red text-white shadow-[0_10px_18px_rgba(227,10,23,0.22)]'
                        : 'bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400'
                    }`}
                  >
                    {SURFACE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>

            {surface === 'profile' && (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {assets.map(asset => (
                  <PreviewMedia
                    key={asset.id}
                    asset={asset}
                    aspectClass="aspect-[3/4]"
                    selected={asset.id === selectedAsset?.id}
                    showGuide={asset.id === selectedAsset?.id}
                    guideMode="profile"
                    onClick={() => setSelectedId(asset.id)}
                  />
                ))}
              </div>
            )}

            {surface === 'reels' && (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {reelsAssets.length > 0 ? reelsAssets.map(asset => (
                  <PreviewMedia
                    key={asset.id}
                    asset={asset}
                    aspectClass="aspect-[9/16]"
                    selected={asset.id === selectedAsset?.id}
                    showGuide={asset.id === selectedAsset?.id}
                    guideMode="reel"
                    onClick={() => setSelectedId(asset.id)}
                  />
                )) : (
                  <div className="col-span-full rounded-[1.5rem] border border-dashed border-black/[0.1] p-10 text-center text-sm text-slate-400 dark:border-white/[0.08]">
                    Reels grid preview için en az bir kartı <span className="font-semibold text-brand-red">reel</span> türüne çevir.
                  </div>
                )}
              </div>
            )}

            {surface === 'explore' && (
              <div className="mt-6 grid auto-rows-[110px] grid-cols-3 gap-3 sm:auto-rows-[150px]">
                {assets.map((asset, index) => {
                  const isHero = asset.highlight && index % 3 !== 2
                  return (
                    <PreviewMedia
                      key={asset.id}
                      asset={asset}
                      aspectClass={isHero ? 'h-full' : 'aspect-square'}
                      selected={asset.id === selectedAsset?.id}
                      onClick={() => setSelectedId(asset.id)}
                      className={isHero ? 'col-span-2 row-span-2 h-full' : 'h-full'}
                      title={isHero ? `${asset.title} / hero` : asset.title}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="card p-5">
              <div className="section-header">
                <h2 className="font-serif text-xl font-bold text-slate-850 dark:text-white">Açılmış görünüm</h2>
              </div>
              {selectedAsset && (
                <div className="mt-5 rounded-[2rem] bg-slate-950 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.38)]">
                  <div className="mx-auto w-full max-w-[320px] rounded-[2rem] border border-white/10 bg-[#09090f] p-3">
                    <div className="mb-3 flex justify-center">
                      <div className="h-1.5 w-20 rounded-full bg-white/20" />
                    </div>

                    <div
                      className="relative overflow-hidden rounded-[1.4rem]"
                      style={{ aspectRatio: String(selectedAsset.sourceRatio) }}
                    >
                      <img
                        src={selectedAsset.dataUrl}
                        alt={selectedAsset.title}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ objectPosition: `${selectedAsset.focalX}% ${selectedAsset.focalY}%` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      {selectedAsset.kind === 'reel' && (
                        <div className="pointer-events-none absolute inset-x-[12.5%] inset-y-[12.5%] rounded-[1rem] border border-white/80 border-dashed" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">
                          {selectedAsset.kind} / {getRatioLabel(selectedAsset.sourceRatio)}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">{selectedAsset.title}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="section-header">
                <h2 className="font-serif text-xl font-bold text-slate-850 dark:text-white">Yüzey notları</h2>
              </div>
              <div className="mt-5 space-y-3">
                {getPreviewNotes(surface).map(note => (
                  <div key={note} className="flex gap-3 rounded-[1rem] border border-black/[0.06] bg-slate-50/70 p-4 text-sm leading-6 text-slate-600 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300">
                    <span className="mt-1 h-2 w-2 rounded-full bg-brand-red" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <div className="section-header">
              <h2 className="font-serif text-xl font-bold text-slate-850 dark:text-white">Seçili kart</h2>
            </div>

            {selectedAsset && (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Başlık</label>
                  <input
                    value={selectedAsset.title}
                    onChange={event => updateSelected({ title: event.target.value })}
                    className="input-field w-full px-4 py-3 text-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Tur</label>
                    <select
                      value={selectedAsset.kind}
                      onChange={event => updateSelected({
                        kind: event.target.value as PreviewAsset['kind'],
                        sourceRatio: event.target.value === 'reel'
                          ? 9 / 16
                          : selectedAsset.sourceRatio === 9 / 16
                            ? 4 / 5
                            : selectedAsset.sourceRatio,
                      })}
                      className="input-field w-full px-4 py-3 text-sm"
                    >
                      <option value="post">Post</option>
                      <option value="reel">Reel</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Explore hero</label>
                    <button
                      type="button"
                      onClick={() => updateSelected({ highlight: !selectedAsset.highlight })}
                      className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                        selectedAsset.highlight
                          ? 'border-brand-gold bg-brand-gold-light text-brand-gold'
                          : 'border-black/[0.08] bg-white text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300'
                      }`}
                    >
                      {selectedAsset.highlight ? 'Hero aktif' : 'Hero kapali'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Not</label>
                  <textarea
                    value={selectedAsset.note}
                    onChange={event => updateSelected({ note: event.target.value })}
                    rows={3}
                    className="input-field w-full resize-none px-4 py-3 text-sm"
                  />
                </div>

                <div className="rounded-[1.25rem] border border-black/[0.06] bg-slate-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    <span>Odak noktasi</span>
                    <span>{selectedAsset.focalX}% / {selectedAsset.focalY}%</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs text-slate-400">Yatay</div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selectedAsset.focalX}
                        onChange={event => updateSelected({ focalX: Number(event.target.value) })}
                        className="w-full accent-brand-red"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs text-slate-400">Dikey</div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selectedAsset.focalY}
                        onChange={event => updateSelected({ focalY: Number(event.target.value) })}
                        className="w-full accent-brand-red"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-black/[0.06] bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Kaynak oran</div>
                  <div className="mt-2 font-semibold text-slate-800 dark:text-white">{getRatioLabel(selectedAsset.sourceRatio)}</div>
                  <div className="mt-2 text-xs leading-6 text-slate-400">
                    Yüklenen görselin kendi oranı saklanır. Profil grid preview ayrı, açılmış görünüm ayrı hesaplanır.
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      { label: '1:1', value: 1 },
                      { label: '4:5', value: 4 / 5 },
                      { label: '3:4', value: 3 / 4 },
                      { label: '9:16', value: 9 / 16 },
                    ].map(option => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => updateSelected({ sourceRatio: option.value, kind: option.value === 9 / 16 ? 'reel' : 'post' })}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-all ${
                          getRatioLabel(selectedAsset.sourceRatio) === option.label
                            ? 'bg-brand-red text-white'
                            : 'bg-white text-slate-500 dark:bg-white/[0.05] dark:text-slate-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="btn justify-center" disabled={selectedIndex <= 0} onClick={() => moveSelected(-1)}>
                    Sola tasi
                  </button>
                  <button type="button" className="btn justify-center" disabled={selectedIndex >= assets.length - 1} onClick={() => moveSelected(1)}>
                    Saga tasi
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="btn justify-center" onClick={cloneSelected}>Çoğalt</button>
                  <button
                    type="button"
                    className="btn justify-center border-red-200 text-red-600 dark:border-red-500/20 dark:text-red-400"
                    onClick={removeSelected}
                    disabled={assets.length === 1}
                  >
                    Sil
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="section-header">
              <h2 className="font-serif text-xl font-bold text-slate-850 dark:text-white">Kart serisi</h2>
            </div>
            <div className="mt-5 space-y-3">
              {assets.map((asset, index) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedId(asset.id)}
                  className={`flex w-full items-center gap-3 rounded-[1.1rem] border px-3 py-3 text-left transition-all ${
                    asset.id === selectedAsset?.id
                      ? 'border-brand-red bg-brand-red/[0.05]'
                      : 'border-black/[0.06] bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.03]'
                  }`}
                >
                  <img
                    src={asset.dataUrl}
                    alt={asset.title}
                    className="h-14 w-14 rounded-xl object-cover"
                    style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">{index + 1}. {asset.title}</div>
                    <div className="mt-1 truncate text-xs text-slate-400">{asset.kind} · {asset.highlight ? 'hero explore' : 'standart'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
