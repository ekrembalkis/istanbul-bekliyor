import { useState } from 'react'

export function CopyBtn({ text, label = 'Kopyala', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={`btn text-xs py-1.5 px-3 transition-all ${
        copied
          ? 'bg-[#00BA7C]/10 text-[#00BA7C] border-[#00BA7C]/20'
          : 'text-[#71767B] hover:text-[#E7E9EA] hover:bg-[rgba(231,233,234,0.1)]'
      } ${className}`}
    >
      {copied ? '✓ Kopyalandı' : label}
    </button>
  )
}
