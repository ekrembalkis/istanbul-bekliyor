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
  'Ocak 2025\'ten itibaren profil grid 3:4 dikey thumbnail gösteriyor (eskiden 1:1 idi).',
  'Tüm görseller merkez-crop ile 3:4\'e kırpılır. 4:5 uploadlar hafif kırpılır, 1:1 kare görseller yanlardan kırpılır.',
  'Güvenli alan: Dikeyde ortadaki %60. Üst ve alt %20 risk bölgesidir.',
  'Grid her zaman 3 kolon, ~2px gap, 0px border radius.',
]

const REELS_NOTES = [
  'Reels sekmesinde kapaklar tam 9:16 boy gösterilir, kırpılmaz.',
  'Aynı reel profil gridde 3:4 olarak kırpılır — kapak metnini orta banta koy.',
  'Safe zone: Üst %13 (kamera/saat), alt %23 (butonlar/caption), sağ %11 (like/yorum).',
  'Grid 3 kolon, ~2px gap, 0px radius.',
]

const EXPLORE_NOTES = [
  'Explore grid hala 1:1 kare tile kullanıyor (profil griddan farklı olarak).',
  'Mozaik pattern: 2 küçük kare + 1 büyük (2 satır yüksek) kart, dönüşümlü sağ/sol.',
  'Büyük kart genelde video/reel içerik. Her 3 satırda 1 büyük kart çıkar.',
  'Bu görünüm kişiseldir — birebir kopyalanamaz, simülasyondur.',
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

  // Explore mosaic: repeating pattern of 2-row blocks
  // Block A: [small][small][LARGE spanning 2 rows] (large on right)
  // Block B: [LARGE spanning 2 rows][small][small] (large on left)
  function getExploreMosaicClass(index: number): { className: string; aspectClass: string } {
    const blockIndex = Math.floor(index / 3)
    const posInBlock = index % 3
    const isBlockA = blockIndex % 2 === 0

    if (isBlockA) {
      // Block A: items 0,1 are small squares, item 2 is large
      if (posInBlock === 2) return { className: 'row-span-2', aspectClass: 'aspect-square' }
      return { className: '', aspectClass: 'aspect-square' }
    } else {
      // Block B: item 0 is large, items 1,2 are small squares
      if (posInBlock === 0) return { className: 'row-span-2', aspectClass: 'aspect-square' }
      return { className: '', aspectClass: 'aspect-square' }
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <section className="border-2 border-[#0A0A0A] bg-white px-6 py-8 sm:px-8">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-[#E30A17]/15 bg-[#E30A17]/[0.06] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-[#E30A17]">
              Instagram Preview Lab
            </div>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[#0A0A0A] sm:text-4xl">
              Profil grid, reels ve keşfet yüzeyini gerçek Instagram ölçüleriyle gör.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[rgba(10,10,10,0.4)]">
              Profil grid 3:4 crop, reels 9:16, explore 1:1 kare mozaik.
              Gerçek gap (~2px), gerçek radius (0px), gerçek safe zone overlay'leri.
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

          <div className="grid gap-3 grid-cols-3">
            <div className="border-2 border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[rgba(10,10,10,0.4)]">Toplam kart</div>
              <div className="mt-3 stat-number text-4xl text-[#0A0A0A]">{assets.length}</div>
            </div>
            <div className="border-2 border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[rgba(10,10,10,0.4)]">Reels kart</div>
              <div className="mt-3 stat-number text-4xl text-[#E30A17]">{reelsAssets.length}</div>
            </div>
            <div className="border-2 border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[rgba(10,10,10,0.4)]">Hero explore</div>
              <div className="mt-3 stat-number text-4xl text-campaign-gold">{heroCount}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Surface Preview + Controls */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* Grid Preview */}
          <div className="card overflow-hidden p-4 sm:p-6">
            <div className="flex flex-col gap-4 border-b-2 border-[#0A0A0A] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#0A0A0A]">Canlı yüzey</h2>
                <p className="mt-2 text-sm text-[rgba(10,10,10,0.4)]">{getSurfaceSummary(surface)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['profile', 'reels', 'explore'] as PreviewSurface[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSurface(item)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] border-2 transition-all ${
                      surface === item
                        ? 'bg-[#E30A17] text-white border-[#0A0A0A]'
                        : 'bg-[rgba(10,10,10,0.02)] text-[rgba(10,10,10,0.4)] border-[#0A0A0A]'
                    }`}
                  >
                    {SURFACE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>

            {/* Instagram-accurate grid container */}
            <div className="mt-6 mx-auto max-w-[375px] bg-black p-0">

              {/* Profile Grid: 3 cols, 3:4 thumbnails, 2px gap */}
              {surface === 'profile' && (
                <div className="grid grid-cols-3 gap-[2px]">
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

              {/* Reels Grid: 3 cols, 9:16 thumbnails, 2px gap */}
              {surface === 'reels' && (
                <div className="grid grid-cols-3 gap-[2px]">
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
                    <div className="col-span-full border border-dashed border-[rgba(255,255,255,0.2)] p-10 text-center text-sm text-[rgba(255,255,255,0.4)]">
                      Reels grid preview için en az bir kartı <span className="font-semibold text-[#E30A17]">reel</span> türüne çevir.
                    </div>
                  )}
                </div>
              )}

              {/* Explore Grid: 3 cols, 1:1 kare, mosaic pattern, 2px gap */}
              {surface === 'explore' && (
                <div className="grid grid-cols-3 gap-[2px]">
                  {assets.map((asset, index) => {
                    const { className: mosaicClass, aspectClass } = getExploreMosaicClass(index)
                    return (
                      <PreviewMedia
                        key={asset.id}
                        asset={asset}
                        aspectClass={aspectClass}
                        selected={asset.id === selectedAsset?.id}
                        onClick={() => setSelectedId(asset.id)}
                        className={mosaicClass}
                      />
                    )
                  })}
                </div>
              )}

            </div>
          </div>

          {/* Expanded View */}
          <div className="card p-5">
            <h2 className="text-xl font-bold text-[#0A0A0A]">Açılmış görünüm</h2>
            {selectedAsset && (
              <div className="mt-5 bg-[#000] p-4">
                <div className="mx-auto w-full max-w-[320px] border border-white/10 bg-[#09090f] p-3">
                  <div className="mb-3 flex justify-center">
                    <div className="h-1.5 w-20 rounded-full bg-white/20" />
                  </div>
                  <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: String(selectedAsset.sourceRatio) }}
                  >
                    <img
                      src={selectedAsset.dataUrl}
                      alt={selectedAsset.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: `${selectedAsset.focalX}% ${selectedAsset.focalY}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
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

          {/* Surface Notes */}
          <div className="card p-5">
            <h2 className="text-xl font-bold text-[#0A0A0A]">Yüzey notları</h2>
            <div className="mt-5 space-y-3">
              {getPreviewNotes(surface).map(note => (
                <div key={note} className="flex gap-3 border-2 border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] p-4 text-sm leading-6 text-[#0A0A0A]">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#E30A17]" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar — Card Controls */}
        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="text-xl font-bold text-[#0A0A0A]">Seçili kart</h2>

            {selectedAsset && (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(10,10,10,0.4)]">Başlık</label>
                  <input
                    value={selectedAsset.title}
                    onChange={event => updateSelected({ title: event.target.value })}
                    className="input-field w-full px-4 py-3 text-sm"
                  />
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(10,10,10,0.4)]">Tür</label>
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
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(10,10,10,0.4)]">Explore hero</label>
                    <button
                      type="button"
                      onClick={() => updateSelected({ highlight: !selectedAsset.highlight })}
                      className={`w-full border-2 px-4 py-3 text-sm font-semibold transition-all ${
                        selectedAsset.highlight
                          ? 'border-campaign-gold bg-campaign-gold/10 text-campaign-gold'
                          : 'border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] text-[#0A0A0A]'
                      }`}
                    >
                      {selectedAsset.highlight ? 'Hero aktif' : 'Hero kapalı'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(10,10,10,0.4)]">Not</label>
                  <textarea
                    value={selectedAsset.note}
                    onChange={event => updateSelected({ note: event.target.value })}
                    rows={3}
                    className="input-field w-full resize-none px-4 py-3 text-sm"
                  />
                </div>

                <div className="border-2 border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] p-4">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(10,10,10,0.4)]">
                    <span>Odak noktası</span>
                    <span>{selectedAsset.focalX}% / {selectedAsset.focalY}%</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs text-[rgba(10,10,10,0.4)]">Yatay</div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selectedAsset.focalX}
                        onChange={event => updateSelected({ focalX: Number(event.target.value) })}
                        className="w-full accent-[#E30A17]"
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs text-[rgba(10,10,10,0.4)]">Dikey</div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selectedAsset.focalY}
                        onChange={event => updateSelected({ focalY: Number(event.target.value) })}
                        className="w-full accent-[#E30A17]"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-2 border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] p-4 text-sm text-[#0A0A0A]">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(10,10,10,0.4)]">Kaynak oran</div>
                  <div className="mt-2 font-semibold text-[#0A0A0A]">{getRatioLabel(selectedAsset.sourceRatio)}</div>
                  <div className="mt-2 text-xs leading-6 text-[rgba(10,10,10,0.4)]">
                    Yüklenen görselin oranı. Profil gridde 3:4, explore'da 1:1 olarak kırpılır.
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
                        className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] border-2 transition-all ${
                          getRatioLabel(selectedAsset.sourceRatio) === option.label
                            ? 'bg-[#E30A17] text-white border-[#0A0A0A]'
                            : 'bg-[rgba(10,10,10,0.02)] text-[#0A0A0A] border-[#0A0A0A]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="btn justify-center" disabled={selectedIndex <= 0} onClick={() => moveSelected(-1)}>
                    Sola taşı
                  </button>
                  <button type="button" className="btn justify-center" disabled={selectedIndex >= assets.length - 1} onClick={() => moveSelected(1)}>
                    Sağa taşı
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="btn justify-center" onClick={cloneSelected}>Çoğalt</button>
                  <button
                    type="button"
                    className="btn justify-center border-[#E30A17] text-[#E30A17]"
                    onClick={removeSelected}
                    disabled={assets.length === 1}
                  >
                    Sil
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card list */}
          <div className="card p-5">
            <h2 className="text-xl font-bold text-[#0A0A0A]">Kart serisi</h2>
            <div className="mt-5 space-y-2">
              {assets.map((asset, index) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedId(asset.id)}
                  className={`flex w-full items-center gap-3 border-2 px-3 py-3 text-left transition-all ${
                    asset.id === selectedAsset?.id
                      ? 'border-[#E30A17] bg-[#E30A17]/[0.05]'
                      : 'border-[#0A0A0A] bg-[rgba(10,10,10,0.02)]'
                  }`}
                >
                  <img
                    src={asset.dataUrl}
                    alt={asset.title}
                    className="h-14 w-14 object-cover"
                    style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#0A0A0A]">{index + 1}. {asset.title}</div>
                    <div className="mt-1 truncate text-xs text-[rgba(10,10,10,0.4)]">{asset.kind} · {asset.highlight ? 'hero explore' : 'standart'}</div>
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
