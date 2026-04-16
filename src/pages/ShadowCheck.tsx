import { useState, useEffect } from 'react'
import { runFullCheck, runQuickCheck } from '../lib/shadowBanDetector'
import type { ShadowBanRecord, CheckProgress, OverallStatus } from '../lib/shadowBanDetector'
import { getLatestCheck, getShadowHistory } from '../lib/shadowBanHistory'
import type { CheckResult } from '../lib/shadowBanHistory'
import { Link } from 'react-router-dom'

const STATUS_CONFIG: Record<OverallStatus, { label: string; color: string; bg: string }> = {
  clean: { label: 'Temiz', color: 'text-x-text-primary', bg: 'bg-[#0A0A0A]/10 border-x-border/20' },
  suspicious: { label: 'Şüpheli', color: 'text-campaign-gold', bg: 'bg-campaign-gold/10 border-campaign-gold/20' },
  likely_banned: { label: 'Muhtemel Ban', color: 'text-campaign-gold', bg: 'bg-campaign-gold/10 border-campaign-gold/20' },
  confirmed_banned: { label: 'Onaylı Shadow Ban', color: 'text-x-accent', bg: 'bg-x-accent/10 border-x-accent/20' },
}

const LAYER_LABELS: Record<string, { name: string; description: string }> = {
  monitorProbe: { name: 'Monitor Probe', description: 'X\'in kendi shadow ban sinyali' },
  searchBan: { name: 'Search Ban', description: 'Tweet\'ler aramada görünüyor mu' },
  ghostBan: { name: 'Ghost Ban', description: 'Reply\'lar thread\'lerde görünüyor mu' },
  engagementDrop: { name: 'Engagement', description: 'Etkileşim oranlarında ani düşüş var mı' },
  profileVisible: { name: 'Profil', description: 'Profil tam görünür mü' },
}

function CheckIcon({ status }: { status: CheckResult['status'] }) {
  switch (status) {
    case 'pass': return <span className="text-x-text-primary text-lg">{'\u2713'}</span>
    case 'fail': return <span className="text-x-accent text-lg">{'\u2717'}</span>
    case 'inconclusive': return <span className="text-campaign-gold text-lg">{'\u2014'}</span>
    case 'skipped': return <span className="text-x-text-secondary text-lg">{'\u2022'}</span>
    case 'error': return <span className="text-x-accent text-lg">!</span>
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} saat önce`
  return `${Math.floor(hrs / 24)} gün önce`
}

export default function ShadowCheck() {
  const [username, setUsername] = useState('istbekliyor')
  const [result, setResult] = useState<ShadowBanRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'idle' | 'quick' | 'full'>('idle')
  const [progress, setProgress] = useState<CheckProgress | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<ShadowBanRecord[]>([])

  // Load latest check on mount / username change
  useEffect(() => {
    const clean = username.replace('@', '')
    const latest = getLatestCheck(clean)
    if (latest) setResult(latest)
    else setResult(null)
    setHistory(getShadowHistory(clean).slice(0, 10))
  }, [username])

  async function handleCheck(type: 'quick' | 'full') {
    setLoading(true)
    setMode(type)
    setError('')
    setProgress(null)

    try {
      const clean = username.replace('@', '')
      const fn = type === 'quick' ? runQuickCheck : runFullCheck
      const res = await fn(clean, p => setProgress(p))
      setResult(res)
      setHistory(getShadowHistory(clean).slice(0, 10))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
      setMode('idle')
      setProgress(null)
    }
  }

  const statusCfg = result ? STATUS_CONFIG[result.overall] : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-x-text-primary">Shadow Ban Dedektoru</h1>
          <p className="text-xs text-x-text-secondary mt-1">5 katmanlı hesap sağlığı analizi</p>
        </div>
        <Link to="/" className="text-xs text-x-text-secondary hover:text-x-accent transition-colors">&larr; Panel</Link>
      </div>

      {/* Username Input + Actions */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-x-text-secondary text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace('@', '').trim())}
              placeholder="istbekliyor"
              className="w-full pl-8 pr-3 py-2.5 rounded-none bg-x-surface-hover border border-x-border text-sm text-x-text-primary focus:outline-none focus:ring-2 focus:ring-x-accent/30"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCheck('quick')}
              disabled={loading || !username}
              className="px-4 py-2.5 rounded-none text-xs font-semibold bg-x-surface-active text-x-text-primary hover:bg-x-surface-active transition-colors disabled:opacity-40"
            >
              {loading && mode === 'quick' ? 'Kontrol...' : 'Hızlı Kontrol'}
            </button>
            <button
              onClick={() => handleCheck('full')}
              disabled={loading || !username}
              className="px-4 py-2.5 rounded-none text-xs font-semibold bg-x-accent text-white hover:bg-x-accent-hover transition-colors disabled:opacity-40"
            >
              {loading && mode === 'full' ? 'Kontrol...' : 'Tam Kontrol'}
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        {loading && progress && (
          <div className="mt-3 flex items-center gap-2 text-xs text-x-text-secondary">
            <span className="inline-block w-3 h-3 rounded-full bg-x-accent animate-pulse" />
            Katman {progress.layer}: {progress.label}...
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs text-x-accent bg-x-accent/10 rounded-none p-3">{error}</div>
        )}
      </div>

      {/* Result Overview */}
      {result && statusCfg && (
        <div className={`card p-5 border ${statusCfg.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${statusCfg.color}`}>
                {result.overall === 'clean' ? '\u25CF' : result.overall === 'confirmed_banned' ? '\u26A0' : '\u25CF'}
              </div>
              <div>
                <div className={`text-lg font-bold ${statusCfg.color}`}>{statusCfg.label}</div>
                <div className="text-xs text-x-text-secondary">@{result.username} &middot; {timeAgo(result.checkedAt)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-x-text-primary">%{result.confidence}</div>
              <div className="text-[10px] text-x-text-secondary">güvenilirlik</div>
            </div>
          </div>

          {/* Engagement summary */}
          {result.engagement && (
            <div className="mt-4 flex items-center gap-4 text-xs text-x-text-secondary">
              <span>Ort. {result.engagement.avgViews.toLocaleString()} görüntülenme</span>
              <span>%{result.engagement.avgEngRate} engagement</span>
              <span className={
                result.engagement.trend === 'up' ? 'text-x-text-primary' :
                result.engagement.trend === 'down' ? 'text-x-accent' : 'text-x-text-secondary'
              }>
                {result.engagement.trend === 'up' ? '\u2191 yükseliş' :
                 result.engagement.trend === 'down' ? '\u2193 düşüş' : '\u2194 stabil'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 5 Layer Detail Cards */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.entries(result.checks) as [string, CheckResult][]).map(([key, check]) => {
            const layer = LAYER_LABELS[key]
            if (!layer) return null
            return (
              <div key={key} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-x-text-secondary tracking-wider">
                    {layer.name}
                  </div>
                  <CheckIcon status={check.status} />
                </div>
                <p className="text-[11px] text-x-text-secondary mb-2">{layer.description}</p>
                <p className="text-xs text-x-text-primary">{check.detail}</p>
                {check.confidence > 0 && (
                  <div className="mt-2 text-[10px] text-x-text-secondary">
                    Güvenilirlik: %{check.confidence}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* History */}
      {history.length > 1 && (
        <section className="card p-5">
          <h2 className="text-sm font-bold text-x-text-secondary mb-3">Kontrol Geçmişi</h2>
          <div className="space-y-2">
            {history.map((r, i) => {
              const cfg = STATUS_CONFIG[r.overall]
              return (
                <div key={r.checkedAt + i} className="flex items-center justify-between text-xs py-2 border-b border-x-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-x-text-secondary">%{r.confidence}</span>
                  </div>
                  <span className="text-x-text-secondary">{timeAgo(r.checkedAt)}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4 text-x-text-secondary">{'\u2609'}</div>
          <p className="text-sm text-x-text-secondary">Bir hesap adı girin ve kontrol başlatın</p>
        </div>
      )}
    </div>
  )
}
