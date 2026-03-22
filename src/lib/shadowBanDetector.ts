// Shadow Ban Detector — 5-layer detection with composite scoring

import { lookupUser, searchTweets, createMonitor, deleteMonitor, listMonitors, lookupTweetFull } from './xquik'
import type { TweetMetrics } from './xquik'
import { saveShadowCheck, getEngagementTrend } from './shadowBanHistory'
import type { ShadowBanRecord, CheckResult, OverallStatus, EngagementSnapshot } from './shadowBanHistory'

export type { ShadowBanRecord, CheckResult, OverallStatus, EngagementSnapshot }

// ── Layer 1: Monitor Probe ──
// Creates a monitor then immediately deletes it.
// 422 "shadow_account" = confirmed shadow ban.

async function probeMonitor(username: string): Promise<CheckResult> {
  try {
    // Check existing monitors
    const { monitors } = await listMonitors()
    const existing = monitors.find(m => m.username === username)

    if (existing) {
      // Already monitored = no shadow ban (monitor creation succeeded before)
      return { status: 'pass', detail: 'Mevcut monitor aktif — shadow ban yok', confidence: 95 }
    }

    // Need to free a slot if at limit
    let freedMonitorId: string | null = null
    try {
      const probe = await createMonitor(username)
      // Success = no shadow ban. Clean up immediately.
      await deleteMonitor(probe.id)
      return { status: 'pass', detail: 'Monitor probe başarılı — shadow ban yok', confidence: 95 }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)

      if (msg.includes('shadow_account') || msg.includes('shadow')) {
        return { status: 'fail', detail: 'X shadow ban tespit etti', confidence: 95 }
      }

      if (msg.includes('monitor_limit_reached')) {
        // Free a non-target monitor, probe, then restore
        const expendable = monitors.find(m => m.username !== username)
        if (expendable) {
          freedMonitorId = expendable.id
          const savedUsername = expendable.username
          await deleteMonitor(expendable.id)

          try {
            const probe = await createMonitor(username)
            await deleteMonitor(probe.id)
            // Restore the original monitor
            try { await createMonitor(savedUsername) } catch { /* best effort */ }
            return { status: 'pass', detail: 'Monitor probe başarılı (slot geçici serbest bırakıldı)', confidence: 95 }
          } catch (probeErr: unknown) {
            // Restore first
            try { await createMonitor(savedUsername) } catch { /* best effort */ }
            const probeMsg = probeErr instanceof Error ? probeErr.message : String(probeErr)
            if (probeMsg.includes('shadow_account') || probeMsg.includes('shadow')) {
              return { status: 'fail', detail: 'X shadow ban tespit etti', confidence: 95 }
            }
            if (probeMsg.includes('not_found')) {
              return { status: 'fail', detail: 'Hesap bulunamadı', confidence: 90 }
            }
            return { status: 'error', detail: `Probe hatası: ${probeMsg}`, confidence: 0 }
          }
        }
        return { status: 'skipped', detail: 'Monitor slotu yok ve serbest bırakılacak monitor bulunamadı', confidence: 0 }
      }

      if (msg.includes('not_found')) {
        return { status: 'fail', detail: 'Hesap X\'te bulunamadı', confidence: 90 }
      }

      return { status: 'error', detail: `Monitor hatası: ${msg}`, confidence: 0 }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { status: 'error', detail: `Beklenmeyen hata: ${msg}`, confidence: 0 }
  }
}

// ── Layer 2: Search Ban ──
// Searches from:username — if user has tweets but search returns 0, search banned.

async function checkSearchBan(username: string): Promise<CheckResult> {
  try {
    const clean = username.replace('@', '')
    const result = await searchTweets(`from:${clean}`, 10)
    const count = result.tweets?.length ?? 0

    if (count > 0) {
      return { status: 'pass', detail: `Arama'da ${count} tweet bulundu`, confidence: 90 }
    }

    // No tweets in search — could be search ban OR account has no tweets
    return { status: 'inconclusive', detail: 'Aramada tweet bulunamadı — az tweet olabilir veya search ban', confidence: 50 }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('402') || msg.includes('subscription')) {
      return { status: 'skipped', detail: 'API aboneliği gerekli', confidence: 0 }
    }
    return { status: 'error', detail: `Arama hatası: ${msg}`, confidence: 0 }
  }
}

// ── Layer 3: Ghost Ban (Reply Visibility) ──

async function checkGhostBan(username: string): Promise<CheckResult> {
  try {
    const clean = username.replace('@', '')
    const result = await searchTweets(`from:${clean} filter:replies`, 10)
    const count = result.tweets?.length ?? 0

    if (count > 0) {
      return { status: 'pass', detail: `${count} reply görünür durumda`, confidence: 75 }
    }

    return { status: 'inconclusive', detail: 'Reply bulunamadı — hesap reply atmıyor olabilir', confidence: 40 }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('402') || msg.includes('subscription')) {
      return { status: 'skipped', detail: 'API aboneliği gerekli', confidence: 0 }
    }
    return { status: 'error', detail: `Reply arama hatası: ${msg}`, confidence: 0 }
  }
}

// ── Layer 4: Engagement Drop Detection ──

async function checkEngagement(username: string): Promise<{ check: CheckResult; snapshot?: EngagementSnapshot }> {
  try {
    const clean = username.replace('@', '')
    const result = await searchTweets(`from:${clean}`, 20)
    const tweets = result.tweets || []

    if (tweets.length < 3) {
      return {
        check: { status: 'inconclusive', detail: `Sadece ${tweets.length} tweet — trend analizi için yetersiz`, confidence: 30 },
      }
    }

    // Fetch full metrics for up to 5 recent tweets
    const metricsPromises = tweets.slice(0, 5).map(async t => {
      try {
        const full = await lookupTweetFull(t.id)
        return full.tweet
      } catch { return null }
    })
    const metrics = (await Promise.all(metricsPromises)).filter((m): m is TweetMetrics => m !== null)

    if (metrics.length === 0) {
      return {
        check: { status: 'error', detail: 'Tweet metrikleri alınamadı', confidence: 0 },
      }
    }

    const avgViews = Math.round(metrics.reduce((s, m) => s + m.viewCount, 0) / metrics.length)
    const avgEngRate = metrics.reduce((s, m) => {
      const eng = m.likeCount + m.retweetCount + m.replyCount + (m.quoteCount || 0)
      return s + (m.viewCount > 0 ? eng / m.viewCount : 0)
    }, 0) / metrics.length

    // Compare with historical baseline
    const history = getEngagementTrend(clean)
    let trend: 'up' | 'stable' | 'down' = 'stable'

    if (history.length >= 2) {
      const prevAvg = history.slice(0, 3).reduce((s, h) => s + h.avgViews, 0) / Math.min(history.length, 3)
      if (avgViews < prevAvg * 0.5) trend = 'down'
      else if (avgViews > prevAvg * 1.3) trend = 'up'
    }

    const snapshot: EngagementSnapshot = {
      avgViews,
      avgEngRate: Math.round(avgEngRate * 10000) / 100, // percentage with 2 decimals
      tweetCount: metrics.length,
      trend,
    }

    if (trend === 'down') {
      return {
        check: { status: 'fail', detail: `View ortalaması ${avgViews.toLocaleString()} — önceki dönemden %50+ düşüş`, confidence: 60 },
        snapshot,
      }
    }

    return {
      check: { status: 'pass', detail: `Ort. ${avgViews.toLocaleString()} view, %${snapshot.avgEngRate} engagement`, confidence: 70 },
      snapshot,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('402') || msg.includes('subscription')) {
      return { check: { status: 'skipped', detail: 'API aboneliği gerekli', confidence: 0 } }
    }
    return { check: { status: 'error', detail: `Engagement hatası: ${msg}`, confidence: 0 } }
  }
}

// ── Layer 5: Profile Visibility ──

async function checkProfileVisibility(username: string): Promise<CheckResult> {
  try {
    const clean = username.replace('@', '')
    const user = await lookupUser(clean)

    if (!user || !user.id) {
      return { status: 'fail', detail: 'Profil verisi alınamadı', confidence: 85 }
    }

    const fields = [user.description, user.followers, user.username].filter(Boolean)
    if (fields.length >= 2) {
      return { status: 'pass', detail: `Profil tam görünür (${user.followers?.toLocaleString()} takipçi)`, confidence: 85 }
    }

    return { status: 'fail', detail: 'Profil kısıtlı görünüyor — bazı alanlar eksik', confidence: 70 }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('402') || msg.includes('subscription')) {
      return { status: 'skipped', detail: 'API aboneliği gerekli', confidence: 0 }
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return { status: 'fail', detail: 'Hesap bulunamadı veya askıya alınmış', confidence: 90 }
    }
    return { status: 'error', detail: `Profil hatası: ${msg}`, confidence: 0 }
  }
}

// ── Composite Score ──

function computeComposite(checks: ShadowBanRecord['checks']): { overall: OverallStatus; confidence: number } {
  // Priority-based decision
  if (checks.monitorProbe.status === 'fail') {
    return { overall: 'confirmed_banned', confidence: 95 }
  }

  if (checks.searchBan.status === 'fail') {
    return { overall: 'likely_banned', confidence: 85 }
  }

  if (checks.profileVisible.status === 'fail') {
    return { overall: 'likely_banned', confidence: 80 }
  }

  if (checks.ghostBan.status === 'fail') {
    return { overall: 'suspicious', confidence: 70 }
  }

  if (checks.engagementDrop.status === 'fail') {
    return { overall: 'suspicious', confidence: 55 }
  }

  // Count passes
  const passed = Object.values(checks).filter(c => c.status === 'pass').length
  const total = Object.values(checks).filter(c => c.status !== 'skipped' && c.status !== 'error').length

  if (passed === total && total >= 3) {
    return { overall: 'clean', confidence: 90 }
  }

  if (passed >= 2) {
    return { overall: 'clean', confidence: 75 }
  }

  return { overall: 'clean', confidence: 50 }
}

// ── Public API ──

export interface CheckProgress {
  layer: number
  label: string
  status: 'running' | 'done'
}

export async function runFullCheck(
  username: string,
  onProgress?: (p: CheckProgress) => void,
): Promise<ShadowBanRecord> {
  const clean = username.replace('@', '')

  onProgress?.({ layer: 1, label: 'Monitor Probe', status: 'running' })
  const monitorProbe = await probeMonitor(clean)
  onProgress?.({ layer: 1, label: 'Monitor Probe', status: 'done' })

  onProgress?.({ layer: 2, label: 'Search Ban', status: 'running' })
  const searchBan = await checkSearchBan(clean)
  onProgress?.({ layer: 2, label: 'Search Ban', status: 'done' })

  onProgress?.({ layer: 3, label: 'Ghost Ban', status: 'running' })
  const ghostBan = await checkGhostBan(clean)
  onProgress?.({ layer: 3, label: 'Ghost Ban', status: 'done' })

  onProgress?.({ layer: 4, label: 'Engagement', status: 'running' })
  const { check: engagementDrop, snapshot } = await checkEngagement(clean)
  onProgress?.({ layer: 4, label: 'Engagement', status: 'done' })

  onProgress?.({ layer: 5, label: 'Profil', status: 'running' })
  const profileVisible = await checkProfileVisibility(clean)
  onProgress?.({ layer: 5, label: 'Profil', status: 'done' })

  const checks = { monitorProbe, searchBan, ghostBan, engagementDrop, profileVisible }
  const { overall, confidence } = computeComposite(checks)

  const record: ShadowBanRecord = {
    username: clean,
    checkedAt: new Date().toISOString(),
    overall,
    confidence,
    checks,
    engagement: snapshot,
  }

  saveShadowCheck(record)
  return record
}

export async function runQuickCheck(
  username: string,
  onProgress?: (p: CheckProgress) => void,
): Promise<ShadowBanRecord> {
  const clean = username.replace('@', '')

  onProgress?.({ layer: 1, label: 'Monitor Probe', status: 'running' })
  const monitorProbe = await probeMonitor(clean)
  onProgress?.({ layer: 1, label: 'Monitor Probe', status: 'done' })

  onProgress?.({ layer: 5, label: 'Profil', status: 'running' })
  const profileVisible = await checkProfileVisibility(clean)
  onProgress?.({ layer: 5, label: 'Profil', status: 'done' })

  const skipped: CheckResult = { status: 'skipped', detail: 'Hızlı kontrol — atlandı', confidence: 0 }

  const checks = {
    monitorProbe,
    searchBan: skipped,
    ghostBan: skipped,
    engagementDrop: skipped,
    profileVisible,
  }

  const { overall, confidence } = computeComposite(checks)

  const record: ShadowBanRecord = {
    username: clean,
    checkedAt: new Date().toISOString(),
    overall,
    confidence,
    checks,
  }

  saveShadowCheck(record)
  return record
}
