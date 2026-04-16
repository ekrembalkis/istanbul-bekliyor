import { useState, useEffect } from 'react'
import { getDayCount } from '../lib/utils'
import { runQuickCheck } from '../lib/shadowBanDetector'
import type { ShadowBanRecord } from '../lib/shadowBanDetector'
import { getLatestCheck } from '../lib/shadowBanHistory'

export default function RightSidebar() {
  const day = getDayCount()
  const [shadowResult, setShadowResult] = useState<ShadowBanRecord | null>(null)
  const [shadowLoading, setShadowLoading] = useState(false)

  useEffect(() => {
    const cached = getLatestCheck('istbekliyor')
    if (cached) setShadowResult(cached)
  }, [])

  const handleCheck = async () => {
    setShadowLoading(true)
    try {
      const res = await runQuickCheck('istbekliyor')
      setShadowResult(res)
    } catch (err) { console.error('Shadow check failed:', err) }
    setShadowLoading(false)
  }

  return (
    <div className="sticky top-0 h-screen overflow-y-auto py-4 space-y-4">
      {/* GÜN Counter */}
      <div className="border-2 border-[#0A0A0A] bg-white p-5">
        <div className="font-mono text-[10px] font-bold text-[rgba(10,10,10,0.35)] tracking-[3px] mb-3 uppercase">KAMPANYA</div>
        <div className="flex items-center gap-3">
          <span className="live-dot flex-shrink-0" />
          <div>
            <div className="stat-number text-5xl text-[#0A0A0A]">{day}</div>
            <div className="font-mono text-[11px] text-[rgba(10,10,10,0.4)] tracking-[1px] mt-1">gündür devam ediyor</div>
          </div>
        </div>
      </div>

      {/* Shadow Ban Status */}
      <div className="border-2 border-[#0A0A0A] bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-mono text-[10px] font-bold text-[rgba(10,10,10,0.35)] tracking-[3px] uppercase">HESAP SAĞLIĞI</div>
          <button
            onClick={handleCheck}
            disabled={shadowLoading}
            className="font-mono text-[10px] font-bold text-[#E30A17] hover:text-[#B80813] tracking-[1px] uppercase transition-colors disabled:opacity-40"
          >
            {shadowLoading ? '...' : 'KONTROL'}
          </button>
        </div>
        {shadowResult ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 ${
                shadowResult.overall === 'clean' ? 'bg-[#0A0A0A]' :
                shadowResult.overall === 'suspicious' ? 'bg-[#D4A843]' : 'bg-[#E30A17]'
              }`} />
              <span className={`font-mono text-xs font-bold tracking-[1px] ${
                shadowResult.overall === 'clean' ? 'text-[#0A0A0A]' :
                shadowResult.overall === 'suspicious' ? 'text-[#D4A843]' : 'text-[#E30A17]'
              }`}>
                {shadowResult.overall === 'clean' ? 'TEMİZ' :
                 shadowResult.overall === 'suspicious' ? 'ŞÜPHELİ' : 'RİSK'}
              </span>
              <span className="font-mono text-[10px] text-[rgba(10,10,10,0.35)]">%{shadowResult.confidence}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(shadowResult.checks).map(([key, check]) => {
                const labels: Record<string, string> = {
                  monitorProbe: 'K1', searchBan: 'K2', ghostBan: 'K3',
                  engagementDrop: 'K4', profileVisible: 'K5',
                }
                const colors: Record<string, string> = {
                  pass: 'text-[#0A0A0A] border-[#0A0A0A]',
                  fail: 'text-[#E30A17] border-[#E30A17]',
                  inconclusive: 'text-[rgba(10,10,10,0.4)] border-[rgba(10,10,10,0.2)]',
                  skipped: 'text-[rgba(10,10,10,0.25)] border-[rgba(10,10,10,0.1)]',
                  error: 'text-[#E30A17] border-[#E30A17]',
                }
                return (
                  <span key={key} className={`font-mono text-[9px] font-bold px-1.5 py-0.5 border-2 ${colors[check.status]}`}>
                    {labels[key]} {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✕' : '—'}
                  </span>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="font-mono text-[11px] text-[rgba(10,10,10,0.35)] tracking-[1px]">Henüz kontrol yapılmadı</div>
        )}
      </div>

      {/* Campaign Rules */}
      <div className="border-2 border-[#0A0A0A] bg-white p-5">
        <div className="font-mono text-[10px] font-bold text-[rgba(10,10,10,0.35)] tracking-[3px] mb-3 uppercase">KAMPANYA KURALLARI</div>
        <div className="space-y-2.5 text-[13px] text-[rgba(10,10,10,0.55)]">
          {[
            'GÜN [SAYI] ile başla',
            '#İstanbulBekliyor (tek hashtag)',
            '09:00 TSİ paylaşım',
            '1:1 görsel (siyah/beyaz + altın)',
          ].map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[#E30A17] text-xs font-bold">&#9654;</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="px-1 space-y-2 font-mono text-[10px] text-[rgba(10,10,10,0.3)] tracking-[1px]">
        <div className="flex items-center gap-3">
          <span>@istbekliyor</span>
          <span>#İstanbulBekliyor</span>
        </div>
        <div>19 Mart 2025'ten beri</div>
      </div>
    </div>
  )
}
