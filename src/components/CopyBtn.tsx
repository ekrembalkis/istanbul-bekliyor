import { useState } from 'react'

export function CopyBtn({ text, label = 'Kopyala', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={`btn text-xs py-1.5 px-3 transition-all ${
        copied
          ? 'bg-[#0A0A0A] text-[#EBEBEB] border-[#0A0A0A]'
          : 'text-[rgba(10,10,10,0.4)] hover:text-[#0A0A0A] hover:bg-[rgba(10,10,10,0.05)]'
      } ${className}`}
    >
      {copied ? '✓ Kopyalandı' : label}
    </button>
  )
}
