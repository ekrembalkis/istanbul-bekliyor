import { useState, useEffect } from 'react'

type Props = {
  src: string
  fallbackChar?: string
  size?: number // tailwind spacing unit (w-${size} h-${size})
  className?: string
}

// Avatar with onError fallback to initials. `src` is already proxied/resolved
// by resolveAvatarUrl() — this component just handles runtime load failures
// (CDN 404, network, content-filter) without leaving a broken-image icon.
export function AvatarImg({ src, fallbackChar = '?', size = 6, className = '' }: Props) {
  const [failed, setFailed] = useState(false)

  // Reset failure state when src changes (new resolution attempt).
  useEffect(() => { setFailed(false) }, [src])

  const dim = `w-${size} h-${size}`

  if (!src || failed) {
    return (
      <div className={`${dim} rounded-full bg-x-surface-active flex items-center justify-center text-[10px] font-bold text-x-text-secondary ${className}`}>
        {fallbackChar?.toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className={`${dim} rounded-full object-cover ${className}`}
    />
  )
}
