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
      aria-label={`${asset.title || 'Görsel'} seç`}
      className={`group relative w-full overflow-hidden border text-left transition-all ${
        selected
          ? 'border-[#E30A17] border-2'
          : 'border-[rgba(10,10,10,0.1)]'
      } ${className}`}
    >
      <div className={`relative ${aspectClass} bg-[#000]`}>
        <img
          src={asset.dataUrl}
          alt={asset.title || 'Preview görsel'}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }}
        />

        {/* Profile safe zone guide — top/bottom 20% risk */}
        {showGuide && guideMode === 'profile' && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[20%] bg-red-500/15 border-b border-dashed border-white/50" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[20%] bg-red-500/15 border-t border-dashed border-white/50" />
          </>
        )}

        {/* Reels safe zone guide — real overlay positions */}
        {showGuide && guideMode === 'reel' && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[13%] bg-red-500/15 border-b border-dashed border-white/50" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[23%] bg-red-500/15 border-t border-dashed border-white/50" />
            <div className="pointer-events-none absolute top-[13%] bottom-[23%] right-0 w-[11%] bg-red-500/10 border-l border-dashed border-white/40" />
          </>
        )}
      </div>
    </button>
  )
}
