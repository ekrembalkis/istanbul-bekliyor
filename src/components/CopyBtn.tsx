import { useState } from 'react'

export function CopyBtn({ text, label = 'Kopyala', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={`btn text-xs py-1.5 px-3 transition-all ${
        copied
          ? 'bg-x-text-primary text-x-bg border-x-border'
          : 'text-x-text-secondary hover:text-x-text-primary hover:bg-x-surface-active'
      } ${className}`}
    >
      {copied ? '✓ Kopyalandı' : label}
    </button>
  )
}
