import { ChangeEvent, useEffect, useState } from 'react'
import PreviewMedia from '../components/preview/PreviewMedia'
import {
  PreviewAsset,
  PreviewSurface,
  SAMPLE_ASSETS,
  createUploadAsset,
  duplicateAsset,
  getRatioLabel,
  loadPreviewAssets,
  moveAsset,
  readFileAsDataUrl,
  readImageRatio,
  savePreviewAssets,
} from '../lib/instagramPreview'

const SURFACE_CONFIG: Record<PreviewSurface, { label: string; aspect: string; icon: string }> = {
  profile: { label: 'Paylaşıldı', aspect: 'aspect-[3/4]', icon: '▦' },
  reels: { label: 'Reels', aspect: 'aspect-[9/16]', icon: '▶' },
  explore: { label: 'Keşfet', aspect: 'aspect-square', icon: '◉' },
}

function getExploreMosaicClass(index: number): { className: string; aspectClass: string } {
  const blockIndex = Math.floor(index / 3)
  const posInBlock = index % 3
  const isBlockA = blockIndex % 2 === 0
  if (isBlockA) {
    if (posInBlock === 2) return { className: 'row-span-2 h-full', aspectClass: '' }
    return { className: '', aspectClass: 'aspect-square' }
  } else {
    if (posInBlock === 0) return { className: 'row-span-2 h-full', aspectClass: '' }
    return { className: '', aspectClass: 'aspect-square' }
  }
}

export default function InstagramPreview() {
  const [surface, setSurface] = useState<PreviewSurface>('profile')
  const [assets, setAssets] = useState<PreviewAsset[]>(() => loadPreviewAssets())
  const [selectedId, setSelectedId] = useState<string>(() => loadPreviewAssets()[0]?.id || SAMPLE_ASSETS[0].id)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => { savePreviewAssets(assets) }, [assets])

  const selectedAsset = assets.find(a => a.id === selectedId) || assets[0] || null
  const selectedIndex = assets.findIndex(a => a.id === selectedAsset?.id)
  const reelsAssets = assets.filter(a => a.kind === 'reel')

  // Auto-select first matching asset when switching tabs
  function handleSurfaceChange(s: PreviewSurface) {
    setSurface(s)
    if (s === 'reels') {
      const firstReel = assets.find(a => a.kind === 'reel')
      if (firstReel) setSelectedId(firstReel.id)
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    setUploadError('')
    try {
      const uploaded = await Promise.all(files.map(async file => {
        const dataUrl = await readFileAsDataUrl(file)
        const sourceRatio = await readImageRatio(dataUrl)
        return createUploadAsset(file.name, dataUrl, sourceRatio)
      }))
      setAssets(cur => [...uploaded, ...cur])
      setSelectedId(uploaded[0].id)
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError(err instanceof Error ? err.message : 'Görsel yüklenemedi')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  function updateSelected(patch: Partial<PreviewAsset>) {
    if (!selectedId) return
    setAssets(cur => cur.map(a => a.id === selectedId ? { ...a, ...patch } : a))
  }

  function moveSelected(dir: -1 | 1) {
    if (selectedIndex < 0) return
    setAssets(cur => moveAsset(cur, selectedIndex, selectedIndex + dir))
  }

  function removeSelected() {
    if (!selectedAsset || assets.length <= 1) return
    const next = assets.filter(a => a.id !== selectedAsset.id)
    setAssets(next)
    if (next.length > 0) setSelectedId(next[0].id)
  }

  return (
    <div className="animate-fade-in">
      {/* Instagram-Native Dark Container */}
      <div className="w-full max-w-[480px] mx-auto bg-black min-h-[80vh] overflow-hidden" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>

        {/* IG Profile Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-[72px] h-[72px] rounded-full shrink-0 p-[3px]" style={{ background: 'linear-gradient(135deg, #E30A17, #D4A843, #E30A17)' }}>
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-2 border-black">
                <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
                  <path d="M15 8 L45 8 L45 12 L33 28 L33 32 L45 48 L45 52 L15 52 L15 48 L27 32 L27 28 L15 12 Z" fill="white" />
                </svg>
              </div>
            </div>
            {/* Stats */}
            <div className="flex-1 flex justify-around">
              {[
                { num: assets.length, lbl: 'Gönderi' },
                { num: '—', lbl: 'Takipçi' },
                { num: '—', lbl: 'Takip' },
              ].map(s => (
                <div key={s.lbl} className="text-center">
                  <div className="text-[15px] font-bold text-white">{s.num}</div>
                  <div className="text-[11px] text-[rgba(255,255,255,0.5)]">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Bio */}
          <div className="mt-3">
            <div className="text-[13px] font-semibold text-white">istbekliyor</div>
            <div className="text-[13px] text-[rgba(255,255,255,0.7)] mt-0.5 leading-[1.4]">
              İstanbul bekliyor. Her gün bir görsel, her görsel bir ses.
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <label className="flex-1 bg-[#363636] text-white text-[13px] font-semibold text-center py-[7px] rounded-lg cursor-pointer">
              <input type="file" accept="image/*" multiple className="absolute w-0 h-0 opacity-0" onChange={handleUpload} />
              {uploading ? 'Yükleniyor...' : 'Görsel Yükle'}
            </label>
            <button
              onClick={() => setShowEditor(!showEditor)}
              className={`flex-1 text-[13px] font-semibold text-center py-[7px] rounded-lg transition-colors ${
                showEditor ? 'bg-[#E30A17] text-white' : 'bg-[#363636] text-white'
              }`}
            >
              {showEditor ? 'Düzenleyiciyi Kapat' : 'Düzenle'}
            </button>
            <button
              onClick={() => { setAssets(SAMPLE_ASSETS); setSelectedId(SAMPLE_ASSETS[0].id) }}
              aria-label="Örnek seti geri yükle"
              className="bg-[#363636] text-white text-[13px] font-semibold px-3 py-[7px] rounded-lg"
            >
              ↺
            </button>
          </div>
          {uploadError && (
            <div className="mt-2 text-[12px] text-[#E30A17] bg-[#E30A17]/10 px-3 py-2 rounded-lg">{uploadError}</div>
          )}
        </div>

        {/* IG Tabs */}
        <div className="flex border-b border-[#262626]">
          {(['profile', 'reels', 'explore'] as PreviewSurface[]).map(s => (
            <button
              key={s}
              onClick={() => handleSurfaceChange(s)}
              className={`flex-1 py-[10px] text-[12px] font-semibold text-center transition-colors border-b-[1px] ${
                surface === s
                  ? 'text-white border-white'
                  : 'text-[rgba(255,255,255,0.4)] border-transparent'
              }`}
            >
              <span className="mr-1">{SURFACE_CONFIG[s].icon}</span>
              {SURFACE_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {surface === 'profile' && (
          <div className="grid grid-cols-3 gap-[2px]">
            {assets.map(asset => (
              <PreviewMedia
                key={asset.id}
                asset={asset}
                aspectClass="aspect-[3/4]"
                selected={asset.id === selectedAsset?.id}
                showGuide={showEditor && asset.id === selectedAsset?.id}
                guideMode="profile"
                onClick={() => setSelectedId(asset.id)}
              />
            ))}
          </div>
        )}

        {surface === 'reels' && (
          <div className="grid grid-cols-3 gap-[2px]">
            {reelsAssets.length > 0 ? reelsAssets.map(asset => (
              <PreviewMedia
                key={asset.id}
                asset={asset}
                aspectClass="aspect-[9/16]"
                selected={asset.id === selectedAsset?.id}
                showGuide={showEditor && asset.id === selectedAsset?.id}
                guideMode="reel"
                onClick={() => setSelectedId(asset.id)}
              />
            )) : (
              <div className="col-span-3 py-16 text-center text-[13px] text-[rgba(255,255,255,0.3)]">
                Henüz reel yok. Bir kartı <span className="text-[#E30A17] font-semibold">reel</span> türüne çevir.
              </div>
            )}
          </div>
        )}

        {surface === 'explore' && (
          <div className="grid grid-cols-3 auto-rows-[minmax(0,1fr)] gap-[2px]">
            {assets.map((asset, index) => {
              const { className: mc, aspectClass: ac } = getExploreMosaicClass(index)
              return (
                <PreviewMedia
                  key={asset.id}
                  asset={asset}
                  aspectClass={ac}
                  selected={asset.id === selectedAsset?.id}
                  onClick={() => setSelectedId(asset.id)}
                  className={mc}
                />
              )
            })}
          </div>
        )}

        {/* Safe zone hint bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-[#262626]">
          <div className="w-[14px] h-[18px] border border-dashed border-[rgba(255,255,255,0.25)] relative shrink-0">
            <div className="absolute inset-x-0 top-0 h-[20%] bg-[#E30A17]/20" />
            <div className="absolute inset-x-0 bottom-0 h-[20%] bg-[#E30A17]/20" />
          </div>
          <span className="text-[11px] text-[rgba(255,255,255,0.25)]">
            {surface === 'profile' && 'Profil grid: 3:4 crop, orta %60 güvenli alan'}
            {surface === 'reels' && 'Reels: 9:16, üst %13 / alt %23 / sağ %11 UI overlay'}
            {surface === 'explore' && 'Keşfet: 1:1 kare tile, mozaik pattern'}
          </span>
        </div>
      </div>

      {/* ===== EDITOR PANEL (outside IG frame) ===== */}
      {showEditor && selectedAsset && (
        <div className="w-full max-w-[480px] mx-auto mt-0 pt-4 pb-4 px-4 space-y-3 bg-[#111] border-t-2 border-[#262626]" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
          {/* Selected Card Info */}
          <div className="border-2 border-[#0A0A0A] bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-[#0A0A0A]">
                {selectedAsset.title}
              </h3>
              <span className="font-mono text-[10px] tracking-[2px] text-[rgba(10,10,10,0.35)] uppercase">
                {selectedAsset.kind} / {getRatioLabel(selectedAsset.sourceRatio)}
              </span>
            </div>

            {/* Tür + Hero */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block font-mono text-[9px] font-bold tracking-[2px] text-[rgba(10,10,10,0.3)] uppercase mb-1">Tür</label>
                <select
                  value={selectedAsset.kind}
                  onChange={e => updateSelected({
                    kind: e.target.value as PreviewAsset['kind'],
                    sourceRatio: e.target.value === 'reel' ? 9 / 16
                      : selectedAsset.sourceRatio === 9 / 16 ? 4 / 5 : selectedAsset.sourceRatio,
                  })}
                  className="input-field w-full px-3 py-2 text-sm"
                >
                  <option value="post">Post</option>
                  <option value="reel">Reel</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-[9px] font-bold tracking-[2px] text-[rgba(10,10,10,0.3)] uppercase mb-1">Hero</label>
                <button
                  onClick={() => updateSelected({ highlight: !selectedAsset.highlight })}
                  className={`w-full border-2 px-3 py-2 text-sm font-semibold transition-all ${
                    selectedAsset.highlight
                      ? 'border-campaign-gold bg-campaign-gold/10 text-campaign-gold'
                      : 'border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] text-[#0A0A0A]'
                  }`}
                >
                  {selectedAsset.highlight ? 'Aktif' : 'Kapalı'}
                </button>
              </div>
            </div>

            {/* Başlık */}
            <div className="mb-4">
              <label className="block font-mono text-[9px] font-bold tracking-[2px] text-[rgba(10,10,10,0.3)] uppercase mb-1">Başlık</label>
              <input
                value={selectedAsset.title}
                onChange={e => updateSelected({ title: e.target.value })}
                className="input-field w-full px-3 py-2 text-sm"
              />
            </div>

            {/* Focal Point */}
            <div className="border-2 border-[#0A0A0A] bg-[rgba(10,10,10,0.02)] p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="font-mono text-[9px] font-bold tracking-[2px] text-[rgba(10,10,10,0.3)] uppercase">Odak Noktası</span>
                <span className="font-mono text-[10px] text-[rgba(10,10,10,0.4)]">{selectedAsset.focalX}% / {selectedAsset.focalY}%</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] text-[rgba(10,10,10,0.35)] mb-1">Yatay</div>
                  <input type="range" min={0} max={100} value={selectedAsset.focalX}
                    onChange={e => updateSelected({ focalX: Number(e.target.value) })}
                    className="w-full accent-[#E30A17] h-1" />
                </div>
                <div>
                  <div className="text-[11px] text-[rgba(10,10,10,0.35)] mb-1">Dikey</div>
                  <input type="range" min={0} max={100} value={selectedAsset.focalY}
                    onChange={e => updateSelected({ focalY: Number(e.target.value) })}
                    className="w-full accent-[#E30A17] h-1" />
                </div>
              </div>
            </div>

            {/* Ratio Switcher */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { label: '1:1', value: 1 },
                { label: '4:5', value: 4 / 5 },
                { label: '3:4', value: 3 / 4 },
                { label: '9:16', value: 9 / 16 },
              ].map(o => (
                <button
                  key={o.label}
                  onClick={() => updateSelected({ sourceRatio: o.value, kind: o.value === 9 / 16 ? 'reel' : 'post' })}
                  className={`px-3 py-1.5 font-mono text-[10px] font-bold tracking-[1px] border-2 transition-all ${
                    getRatioLabel(selectedAsset.sourceRatio) === o.label
                      ? 'bg-[#E30A17] text-white border-[#0A0A0A]'
                      : 'bg-white text-[#0A0A0A] border-[#0A0A0A]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-4 gap-2">
              <button className="btn justify-center text-[10px] py-2" disabled={selectedIndex <= 0} onClick={() => moveSelected(-1)}>&#9664;</button>
              <button className="btn justify-center text-[10px] py-2" disabled={selectedIndex >= assets.length - 1} onClick={() => moveSelected(1)}>&#9654;</button>
              <button className="btn justify-center text-[10px] py-2" onClick={() => {
                const copy = duplicateAsset(selectedAsset)
                setAssets(cur => [copy, ...cur])
                setSelectedId(copy.id)
              }}>Kopyala</button>
              <button
                className="btn justify-center text-[10px] py-2 border-[#E30A17] text-[#E30A17]"
                onClick={removeSelected}
                disabled={assets.length === 1}
              >Sil</button>
            </div>
          </div>

          {/* Card List */}
          <div className="border-2 border-[#0A0A0A] bg-white p-4">
            <div className="font-mono text-[9px] font-bold tracking-[2px] text-[rgba(10,10,10,0.3)] uppercase mb-3">
              Kart Serisi ({assets.length})
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {assets.map((asset, i) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedId(asset.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-all border ${
                    asset.id === selectedAsset?.id
                      ? 'border-[#E30A17] bg-[#E30A17]/[0.04]'
                      : 'border-transparent hover:bg-[rgba(10,10,10,0.02)]'
                  }`}
                >
                  <img src={asset.dataUrl} alt={asset.title || 'Görsel'} className="w-8 h-8 object-cover shrink-0"
                    style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-[#0A0A0A] truncate">{i + 1}. {asset.title}</div>
                    <div className="text-[10px] text-[rgba(10,10,10,0.35)]">{asset.kind} · {getRatioLabel(asset.sourceRatio)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
