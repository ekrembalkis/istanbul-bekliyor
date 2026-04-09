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
    } catch { /* silent */ }
    setShadowLoading(false)
  }

  return (
    <div className="sticky top-0 h-screen overflow-y-auto py-3 space-y-4">
      {/* GÜN Counter */}
      <div className="rounded-2xl border border-x-border bg-x-surface p-4">
        <div className="text-[13px] font-bold text-x-text-secondary tracking-wider mb-2">KAMPANYA</div>
        <div className="flex items-center gap-3">
          <span className="live-dot flex-shrink-0" />
          <div>
            <div className="stat-number text-4xl text-x-text-primary">{day}</div>
            <div className="text-[13px] text-x-text-secondary mt-1">gündür devam ediyor</div>
          </div>
        </div>
      </div>

      {/* Shadow Ban Status */}
      <div className="rounded-2xl border border-x-border bg-x-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-bold text-x-text-secondary tracking-wider">HESAP SAĞLIĞI</div>
          <button
            onClick={handleCheck}
            disabled={shadowLoading}
            className="text-[12px] font-semibold text-x-accent hover:text-x-accent-hover transition-colors disabled:opacity-40"
          >
            {shadowLoading ? '...' : 'Kontrol'}
          </button>
        </div>
        {shadowResult ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                shadowResult.overall === 'clean' ? 'bg-x-retweet' :
                shadowResult.overall === 'suspicious' ? 'bg-x-warning' : 'bg-x-like'
              }`} />
              <span className={`text-sm font-bold ${
                shadowResult.overall === 'clean' ? 'text-x-retweet' :
                shadowResult.overall === 'suspicious' ? 'text-x-warning' : 'text-x-like'
              }`}>
                {shadowResult.overall === 'clean' ? 'Temiz' :
                 shadowResult.overall === 'suspicious' ? 'Şüpheli' : 'Risk'}
              </span>
              <span className="text-[11px] text-x-text-secondary">%{shadowResult.confidence}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(shadowResult.checks).map(([key, check]) => {
                const labels: Record<string, string> = {
                  monitorProbe: 'K1', searchBan: 'K2', ghostBan: 'K3',
                  engagementDrop: 'K4', profileVisible: 'K5',
                }
                const colors: Record<string, string> = {
                  pass: 'text-x-retweet border-x-retweet/30',
                  fail: 'text-x-like border-x-like/30',
                  inconclusive: 'text-x-warning border-x-warning/30',
                  skipped: 'text-x-text-secondary border-x-border',
                  error: 'text-x-like border-x-like/30',
                }
                return (
                  <span key={key} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colors[check.status]}`}>
                    {labels[key]} {check.status === 'pass' ? '✓' : check.status === 'fail' ? '✕' : '—'}
                  </span>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-x-text-secondary">Henüz kontrol yapılmadı</div>
        )}
      </div>

      {/* Campaign Rules */}
      <div className="rounded-2xl border border-x-border bg-x-surface p-4">
        <div className="text-[13px] font-bold text-x-text-secondary tracking-wider mb-3">KAMPANYA KURALLARI</div>
        <div className="space-y-2.5 text-[13px] text-x-text-secondary">
          {[
            'GÜN [SAYI] ile başla',
            '#İstanbulBekliyor (tek hashtag)',
            '09:00 TSİ paylaşım',
            '1:1 görsel (siyah/beyaz + altın)',
          ].map((rule, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-x-accent text-xs">•</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div className="px-2 space-y-2 text-[13px] text-x-text-secondary">
        <div className="flex items-center gap-3">
          <span>@istbekliyor</span>
          <span>#İstanbulBekliyor</span>
        </div>
        <div>19 Mart 2025'ten beri</div>
      </div>
    </div>
  )
}
