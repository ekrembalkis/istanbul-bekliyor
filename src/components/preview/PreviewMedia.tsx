import type { PreviewAsset } from '../../lib/instagramPreview'

interface PreviewMediaProps {
  asset: PreviewAsset
  aspectClass: string
  title?: string
  selected?: boolean
  showGuide?: boolean
  guideMode?: 'profile' | 'reel'
  onClick?: () => void
  className?: string
}

export default function PreviewMedia({
  asset,
  aspectClass,
  title,
  selected = false,
  showGuide = false,
  guideMode = 'profile',
  onClick,
  className = '',
}: PreviewMediaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-[1.35rem] border text-left transition-all ${
        selected
          ? 'border-[#1D9BF0]'
          : 'border-[#2F3336]'
      } ${className}`}
    >
      <div className={`relative ${aspectClass} bg-slate-950`}>
        <img
          src={asset.dataUrl}
          alt={asset.title}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {showGuide && guideMode === 'profile' && (
          <div className="pointer-events-none absolute inset-x-[12%] inset-y-[8%] rounded-[1rem] border border-white/70 border-dashed" />
        )}

        {showGuide && guideMode === 'reel' && (
          <div className="pointer-events-none absolute inset-x-[18%] inset-y-[13%] rounded-[1rem] border border-white/70 border-dashed" />
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white"
            style={{ backgroundColor: asset.accent }}
          >
            {asset.kind}
          </span>
          {asset.highlight && (
            <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
              hero
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="text-sm font-semibold text-white">{title || asset.title}</div>
          <div className="mt-1 text-[11px] text-white/70">{asset.note}</div>
        </div>
      </div>
    </button>
  )
}
