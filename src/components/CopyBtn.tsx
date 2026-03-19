import { useState } from 'react'

export function CopyBtn({ text, label = 'Kopyala', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={`glass-btn px-3 py-1.5 text-xs font-semibold transition-all ${
        copied
          ? 'bg-green-500/15 text-green-400 !border-green-500/20'
          : 'text-white/50 hover:text-white/70'
      } ${className}`}
    >
      {copied ? '✓ Kopyalandı' : label}
    </button>
  )
}
