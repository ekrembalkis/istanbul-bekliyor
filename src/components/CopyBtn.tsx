import { useState } from 'react'

export function CopyBtn({ text, label = 'Kopyala', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={`btn text-xs py-1.5 px-3 transition-all ${
        copied
          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      } ${className}`}
    >
      {copied ? '✓ Kopyalandi' : label}
    </button>
  )
}
