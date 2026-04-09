import { useState, useEffect } from 'react'
import { getDayCount } from '../lib/utils'
import { DAY_PLANS } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'
import { getAccount, getConnectedAccounts, connectXAccount, disconnectXAccount, listAutomations, createAutomation, updateAutomation, deleteAutomation, testAutomation } from '../lib/xquik'
import type { XquikAccount, XAccount, AutomationFlow } from '../lib/xquik'
import { getCostSummary, calculateGeminiCost, resetCostTracker } from '../lib/costTracker'
import type { GeminiUsage } from '../lib/costTracker'
import { fetchAlgorithmData, isConfirmedSignal } from '../lib/algorithmData'
import type { AlgorithmData } from '../lib/algorithmData'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function formatCost(usd: number): string {
  if (usd < 0.01) return '<$0.01'
  return '$' + usd.toFixed(2)
}

function UsageBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-[#71767B]">{label}</span>
        <span className="text-[#71767B]">{formatTokens(value)}</span>
      </div>
      <div className="h-1.5 bg-[rgba(231,233,234,0.03)] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  )
}

function GeminiCard({ title, usage, period }: { title: string; usage: GeminiUsage; period: string }) {
  const cost = calculateGeminiCost(usage)
  return (
    <div className="bg-[rgba(231,233,234,0.03)] rounded-xl p-4 border border-[#2F3336]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold text-[#71767B] tracking-wider">{title}</div>
          <div className="text-[10px] text-[#71767B]">{period}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#1D9BF0]">{formatCost(cost)}</div>
          <div className="text-[10px] text-[#71767B]">{usage.calls} istek</div>
        </div>
      </div>
      <div className="space-y-2">
        <UsageBar label="Input tokens" value={usage.promptTokens} max={Math.max(usage.promptTokens, usage.completionTokens)} color="bg-[#1D9BF0]" />
        <UsageBar label="Output tokens" value={usage.completionTokens} max={Math.max(usage.promptTokens, usage.completionTokens)} color="bg-[#7856FF]" />
      </div>
    </div>
  )
}

export default function Settings() {
  const day = getDayCount()
  const [account, setAccount] = useState<XquikAccount | null>(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountError, setAccountError] = useState('')
  const [costSummary, setCostSummary] = useState(getCostSummary())
  const [algoData, setAlgoData] = useState<AlgorithmData | null>(null)
  const [algoLoading, setAlgoLoading] = useState(true)

  // ── X Account Connection ──
  const [xAccounts, setXAccounts] = useState<XAccount[]>([])
  const [xLoading, setXLoading] = useState(true)
  const [xError, setXError] = useState('')
  const [showConnect, setShowConnect] = useState(false)
  const [connectForm, setConnectForm] = useState({ username: '', email: '', password: '', totp: '' })
  const [connecting, setConnecting] = useState(false)

  // ── Automations ──
  const [automations, setAutomations] = useState<AutomationFlow[]>([])
  const [autoLoading, setAutoLoading] = useState(true)
  const [autoError, setAutoError] = useState('')
  const [creatingAuto, setCreatingAuto] = useState(false)

  const loadAutomations = () => {
    setAutoLoading(true)
    listAutomations()
      .then(res => setAutomations(res.items || []))
      .catch(e => setAutoError(e.message))
      .finally(() => setAutoLoading(false))
  }

  const handleCreateAutomation = async (name: string, triggerType: string) => {
    setCreatingAuto(true)
    setAutoError('')
    try {
      await createAutomation({ name, triggerType })
      loadAutomations()
    } catch (e: any) {
      setAutoError(e.message)
    }
    setCreatingAuto(false)
  }

  const handleToggleAutomation = async (flow: AutomationFlow) => {
    try {
      await updateAutomation(flow.id, {
        expectedUpdatedAt: flow.updatedAt,
        isActive: !flow.isActive,
      })
      loadAutomations()
    } catch (e: any) {
      setAutoError(e.message)
    }
  }

  const handleDeleteAutomation = async (id: string, name: string) => {
    if (!confirm(`"${name}" otomasyonunu sil?`)) return
    try {
      await deleteAutomation(id)
      loadAutomations()
    } catch (e: any) {
      setAutoError(e.message)
    }
  }

  const handleTestAutomation = async (id: string) => {
    setAutoError('')
    try {
      await testAutomation(id)
      setAutoError('Test çalıştırıldı')
      setTimeout(() => setAutoError(''), 3000)
    } catch (e: any) {
      setAutoError(e.message)
    }
  }

  const loadXAccounts = () => {
    setXLoading(true)
    getConnectedAccounts()
      .then(res => setXAccounts(res.accounts || []))
      .catch(e => setXError(e.message))
      .finally(() => setXLoading(false))
  }

  const handleConnect = async () => {
    if (!connectForm.username || !connectForm.email || !connectForm.password) return
    setConnecting(true)
    setXError('')
    try {
      await connectXAccount({
        username: connectForm.username,
        email: connectForm.email,
        password: connectForm.password,
        totp_secret: connectForm.totp || undefined,
      })
      setConnectForm({ username: '', email: '', password: '', totp: '' })
      setShowConnect(false)
      loadXAccounts()
    } catch (e: any) {
      setXError(e.message || 'Bağlantı başarısız')
    }
    setConnecting(false)
  }

  const handleDisconnect = async (id: string, username: string) => {
    if (!confirm(`@${username} hesabının bağlantısını kes?`)) return
    try {
      await disconnectXAccount(id)
      loadXAccounts()
    } catch (e: any) {
      setXError(e.message)
    }
  }

  useEffect(() => {
    getAccount()
      .then(setAccount)
      .catch(e => setAccountError(e.message))
      .finally(() => setAccountLoading(false))
    fetchAlgorithmData()
      .then(setAlgoData)
      .finally(() => setAlgoLoading(false))
    loadXAccounts()
    loadAutomations()
  }, [])

  useEffect(() => {
    // Refresh cost summary every 30s
    const interval = setInterval(() => setCostSummary(getCostSummary()), 30000)
    return () => clearInterval(interval)
  }, [])

  const promptTemplate = `Minimalist [SAHNE TÜRÜ] of [SAHNE DETAYI], shot in stark black and white. [DETAYLI AÇIKLAMA]. [ALTIN ELEMAN] has a warm amber gold color (#D4A843). Everything else is deep black and charcoal gray. [KAMERA]. Bold clean text reading "GÜN [SAYI]" in large uppercase sans-serif font at the top of the frame. Brutalist minimalist style. 1:1 aspect ratio at 2K resolution.`

  const isActive = account?.plan === 'active'
  const period = account?.currentPeriod
  const usagePct = period?.usagePercent ?? 0
  const daysLeft = period?.end ? Math.max(0, Math.ceil((new Date(period.end).getTime() - Date.now()) / 86400000)) : 0

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[#E7E9EA]">Ayarlar</h1>
      </div>

      {/* ═══════════ COST TRACKER ═══════════ */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[#71767B] mb-5 tracking-wider">API KULLANIM PANELİ</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Xquik Subscription */}
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-[#71767B] tracking-wider">XQUIK ABONELİK</div>
            {accountLoading ? (
              <div className="bg-[rgba(231,233,234,0.03)] rounded-xl p-6 border border-[#2F3336] text-center">
                <div className="text-xs text-[#71767B] animate-pulse">Yükleniyor...</div>
              </div>
            ) : accountError ? (
              <div className="bg-[#F91880]/10 rounded-xl p-4 border border-[#F91880]/20">
                <div className="text-xs text-[#F91880]">{accountError}</div>
              </div>
            ) : account ? (
              <div className="bg-[rgba(231,233,234,0.03)] rounded-xl p-4 border border-[#2F3336] space-y-4">
                {/* Status + Plan */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-[#00BA7C] animate-pulse' : 'bg-[#F91880]'}`} />
                    <span className="text-sm font-bold text-[#E7E9EA]">
                      Xquik Pro
                    </span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${
                    isActive
                      ? 'bg-[#00BA7C]/10 text-[#00BA7C]'
                      : 'bg-[#F91880]/10 text-[#F91880]'
                  }`}>
                    {isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                {/* Usage gauge */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[#71767B]">Dönem Kullanımı</span>
                    <span className="text-sm font-bold text-[#E7E9EA]">{usagePct}%</span>
                  </div>
                  <div className="h-3 bg-[rgba(231,233,234,0.03)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usagePct > 80 ? 'bg-[#F91880]' : usagePct > 50 ? 'bg-[#FFD400]' : 'bg-[#00BA7C]'
                      }`}
                      style={{ width: `${Math.max(2, usagePct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-[#71767B]">
                    <span>{usagePct}% kullanıldı</span>
                    <span>{100 - usagePct}% kaldı</span>
                  </div>
                </div>

                {/* Period + Monitors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#16181C] rounded-lg p-2.5 border border-[#2F3336]">
                    <div className="text-[10px] text-[#71767B] mb-0.5">Dönem</div>
                    <div className="text-[11px] text-[#E7E9EA]">
                      {period ? new Date(period.start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-'}
                      {' — '}
                      {period ? new Date(period.end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-'}
                    </div>
                  </div>
                  <div className="bg-[#16181C] rounded-lg p-2.5 border border-[#2F3336]">
                    <div className="text-[10px] text-[#71767B] mb-0.5">Kalan Gün</div>
                    <div className="text-[11px] font-bold text-[#E7E9EA]">{daysLeft} gün</div>
                  </div>
                  <div className="bg-[#16181C] rounded-lg p-2.5 border border-[#2F3336]">
                    <div className="text-[10px] text-[#71767B] mb-0.5">Monitörler</div>
                    <div className="text-[11px] text-[#E7E9EA]">
                      {account.monitorsUsed} / {account.monitorsAllowed}
                    </div>
                  </div>
                  <div className="bg-[#16181C] rounded-lg p-2.5 border border-[#2F3336]">
                    <div className="text-[10px] text-[#71767B] mb-0.5">API Versiyonu</div>
                    <div className="text-[11px] text-[#E7E9EA]">v{account.pricingVersion}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Gemini Usage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-[#71767B] tracking-wider">GEMİNİ 2.0 FLASH</div>
              <button
                onClick={() => { if (confirm('Gemini kullanım verilerini sıfırla?')) { resetCostTracker(); setCostSummary(getCostSummary()) } }}
                className="text-[10px] text-[#71767B] hover:text-[#F91880] transition-colors"
              >
                Sıfırla
              </button>
            </div>
            <GeminiCard title="BUGÜN" usage={costSummary.today} period={new Date().toLocaleDateString('tr-TR')} />
            <GeminiCard title="SON 30 GÜN" usage={costSummary.last30Days} period="Aylık toplam" />

            {/* Pricing reference */}
            <div className="text-[10px] text-[#71767B] flex items-center gap-3">
              <span>Fiyat: Input $0.10/1M</span>
              <span>Output $0.40/1M</span>
            </div>
          </div>
        </div>

        {/* Daily chart - last 7 days */}
        {costSummary.dailyRecords.length > 1 && (
          <div className="mt-6 border-t border-[#2F3336] pt-4">
            <div className="text-[10px] font-bold text-[#71767B] tracking-wider mb-3">SON 7 GÜN</div>
            <div className="flex items-end gap-1 h-16">
              {costSummary.dailyRecords.slice(-7).map((r, i) => {
                const maxTokens = Math.max(...costSummary.dailyRecords.slice(-7).map(d => d.gemini.totalTokens), 1)
                const pct = (r.gemini.totalTokens / maxTokens) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-[#1D9BF0]/20 rounded-sm" style={{ height: `${Math.max(2, pct)}%` }}
                      title={`${r.date}: ${formatTokens(r.gemini.totalTokens)} token, ${r.gemini.calls} istek`}
                    />
                    <span className="text-[8px] text-[#71767B]">{r.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ X ACCOUNT CONNECTION ═══════════ */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-[#71767B] tracking-wider">X HESAP BAĞLANTISI</h2>
          <button
            onClick={() => setShowConnect(!showConnect)}
            className="text-[10px] px-3 py-1.5 rounded-lg border border-[#1D9BF0]/20 text-[#1D9BF0] hover:bg-[#1D9BF0]/10 font-bold transition-all"
          >
            {showConnect ? 'Kapat' : 'Hesap Bağla'}
          </button>
        </div>

        {xError && (
          <div className="bg-[#F91880]/10 rounded-xl p-3 border border-[#F91880]/20 mb-4">
            <div className="text-xs text-[#F91880]">{xError}</div>
          </div>
        )}

        {/* Connected accounts list */}
        {xLoading ? (
          <div className="text-xs text-[#71767B] animate-pulse">Yükleniyor...</div>
        ) : xAccounts.length === 0 ? (
          <div className="bg-[rgba(231,233,234,0.03)] rounded-xl p-6 border border-[#2F3336] text-center">
            <div className="text-sm text-[#71767B]">Bağlı hesap yok</div>
            <div className="text-[10px] text-[#71767B] mt-1">Tweet paylaşmak için bir X hesabı bağlayın</div>
          </div>
        ) : (
          <div className="space-y-2">
            {xAccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between bg-[rgba(231,233,234,0.03)] rounded-xl p-4 border border-[#2F3336]">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${acc.status === 'active' || acc.status === 'connected' ? 'bg-[#00BA7C]' : 'bg-[#FFD400]'}`} />
                  <div>
                    <div className="text-sm font-bold text-[#E7E9EA]">@{acc.xUsername}</div>
                    <div className="text-[10px] text-[#71767B]">{acc.status}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(acc.id, acc.xUsername)}
                  className="text-[10px] text-[#71767B] hover:text-[#F91880] transition-colors"
                >
                  Bağlantıyı Kes
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Connect form */}
        {showConnect && (
          <div className="mt-4 bg-[rgba(231,233,234,0.03)] rounded-xl p-4 border border-[#2F3336] space-y-3">
            <div className="text-[10px] font-bold text-[#71767B] tracking-wider">YENİ HESAP BAĞLA</div>
            <input
              type="text"
              placeholder="X kullanıcı adı (@ olmadan)"
              value={connectForm.username}
              onChange={e => setConnectForm(f => ({ ...f, username: e.target.value }))}
              className="w-full input-field px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="E-posta"
              value={connectForm.email}
              onChange={e => setConnectForm(f => ({ ...f, email: e.target.value }))}
              className="w-full input-field px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Şifre"
              value={connectForm.password}
              onChange={e => setConnectForm(f => ({ ...f, password: e.target.value }))}
              className="w-full input-field px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="2FA TOTP Secret (opsiyonel)"
              value={connectForm.totp}
              onChange={e => setConnectForm(f => ({ ...f, totp: e.target.value }))}
              className="w-full input-field px-3 py-2 text-sm"
            />
            <button
              onClick={handleConnect}
              disabled={connecting || !connectForm.username || !connectForm.email || !connectForm.password}
              className="btn btn-primary w-full justify-center disabled:opacity-50 text-xs"
            >
              {connecting ? 'Bağlanıyor...' : 'Hesabı Bağla'}
            </button>
            <div className="text-[10px] text-[#71767B]">
              Bilgiler Xquik API'ye gönderilir. Şifreler bu panelde saklanmaz.
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ AUTOMATIONS ═══════════ */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-[#71767B] tracking-wider">OTOMASYONLAR</h2>
          <span className="text-[10px] text-[#71767B]">Ücretsiz: max 2 flow</span>
        </div>

        {autoError && (
          <div className={`rounded-xl p-3 border mb-4 ${autoError === 'Test çalıştırıldı' ? 'bg-[#00BA7C]/10 border-[#00BA7C]/20' : 'bg-[#F91880]/10 border-[#F91880]/20'}`}>
            <div className={`text-xs ${autoError === 'Test çalıştırıldı' ? 'text-[#00BA7C]' : 'text-[#F91880]'}`}>{autoError}</div>
          </div>
        )}

        {autoLoading ? (
          <div className="text-xs text-[#71767B] animate-pulse">Yükleniyor...</div>
        ) : (
          <div className="space-y-3">
            {automations.length === 0 ? (
              <div className="bg-[rgba(231,233,234,0.03)] rounded-xl p-6 border border-[#2F3336] text-center">
                <div className="text-sm text-[#71767B]">Otomasyon yok</div>
                <div className="text-[10px] text-[#71767B] mt-1">Trend takibi veya zamanlı tweet için otomasyon oluşturun</div>
              </div>
            ) : (
              automations.map(flow => (
                <div key={flow.id} className="flex items-center justify-between bg-[rgba(231,233,234,0.03)] rounded-xl p-4 border border-[#2F3336]">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${flow.isActive ? 'bg-[#00BA7C] animate-pulse' : 'bg-[#71767B]'}`} />
                    <div>
                      <div className="text-sm font-bold text-[#E7E9EA]">{flow.name}</div>
                      <div className="text-[10px] text-[#71767B]">Tetik: {flow.triggerType} | {flow.isActive ? 'Aktif' : 'Pasif'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestAutomation(flow.id)}
                      className="text-[10px] text-[#1D9BF0] hover:text-[#1D9BF0]/80 transition-colors"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleToggleAutomation(flow)}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                        flow.isActive
                          ? 'text-[#FFD400] border-[#FFD400]/20 hover:bg-[rgba(231,233,234,0.1)]'
                          : 'text-[#00BA7C] border-[#00BA7C]/20 hover:bg-[rgba(231,233,234,0.1)]'
                      }`}
                    >
                      {flow.isActive ? 'Durdur' : 'Başlat'}
                    </button>
                    <button
                      onClick={() => handleDeleteAutomation(flow.id, flow.name)}
                      className="text-[10px] text-[#71767B] hover:text-[#F91880] transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Quick create buttons */}
            {automations.length < 2 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => handleCreateAutomation('Trend Tweet', 'schedule')}
                  disabled={creatingAuto}
                  className="btn w-full justify-center disabled:opacity-50 text-xs"
                >
                  {creatingAuto ? '...' : 'Zamanlı Tweet Flow'}
                </button>
                <button
                  onClick={() => handleCreateAutomation('Trend Takip', 'webhook')}
                  disabled={creatingAuto}
                  className="btn w-full justify-center disabled:opacity-50 text-xs"
                >
                  {creatingAuto ? '...' : 'Webhook Flow'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaign Info */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[#71767B] mb-5 tracking-wider">KAMPANYA BİLGİLERİ</h2>
        <div className="grid grid-cols-2 gap-5 text-sm">
          {[
            { label: 'Hesap', value: '@istbekliyor' },
            { label: 'Başlangıç', value: '19 Mart 2025' },
            { label: 'Bugün', value: `GÜN ${day}` },
            { label: 'Hashtag', value: '#İstanbulBekliyor' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[10px] text-[#71767B] tracking-wider font-semibold mb-1">{item.label.toUpperCase()}</div>
              <div className="text-[#E7E9EA] font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Colors */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[#71767B] mb-5 tracking-wider">MARKA RENKLERİ</h2>
        <div className="grid grid-cols-2 gap-5">
          {[
            { name: 'Marka Kırmızı', hex: '#E30A17', usage: 'Profil, banner' },
            { name: 'Altın Aksan', hex: '#D4A843', usage: 'Günlük görseller' },
            { name: 'Koyu Arka Plan', hex: '#0C0C12', usage: 'Dark mode' },
            { name: 'Kart Koyu', hex: '#16161E', usage: 'Dark mode kartlar' },
          ].map(c => (
            <div key={c.hex} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-[#2F3336] flex-shrink-0" style={{ backgroundColor: c.hex }} />
              <div>
                <div className="text-xs text-[#E7E9EA] font-semibold">{c.name}</div>
                <div className="text-[10px] text-[#71767B]">{c.hex}</div>
                <div className="text-[10px] text-[#71767B]">{c.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Template */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#1D9BF0] tracking-wider">NANO BANANA PRO PROMPT ŞABLONU</h2>
          <CopyBtn text={promptTemplate} label="Şablon Kopyala" />
        </div>
        <div className="bg-[rgba(231,233,234,0.03)] rounded-xl p-4 text-xs text-[#71767B] leading-relaxed border border-[#2F3336]">
          {promptTemplate}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] text-[#71767B]">
          <div><span className="font-semibold text-[#E7E9EA]">API:</span> aspectRatio "1:1"</div>
          <div><span className="font-semibold text-[#E7E9EA]">Resolution:</span> 2K</div>
          <div><span className="font-semibold text-[#E7E9EA]">Temperature:</span> 0.7</div>
        </div>
      </div>

      {/* Visual Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[#71767B] mb-5 tracking-wider">GÖRSEL ÜRETİM KURALLARI</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { num: '1', rule: 'Arka plan siyah veya koyu gri' },
            { num: '2', rule: 'Sahne İstanbul\'a ait mekân veya sembolik nesne' },
            { num: '3', rule: 'Tüm sahne siyah beyaz' },
            { num: '4', rule: 'TEK BİR eleman altın (#D4A843) renginde' },
            { num: '5', rule: '"GÜN [SAYI]" yazısı, temiz sans-serif' },
            { num: '6', rule: '1:1 kare format, 2K çözünürlük' },
          ].map(r => (
            <div key={r.num} className="flex items-start gap-3 text-sm p-3 bg-[rgba(231,233,234,0.03)] rounded-xl">
              <span className="w-7 h-7 rounded-lg bg-campaign-gold/10 text-campaign-gold text-xs font-bold flex items-center justify-center flex-shrink-0">{r.num}</span>
              <span className="text-[#E7E9EA] mt-0.5">{r.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Pool */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[#71767B] mb-5 tracking-wider">TEMA HAVUZU ({DAY_PLANS.length} Tema)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {DAY_PLANS.map((plan, i) => {
            const isActive = (day - 1) % DAY_PLANS.length === i
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive ? 'bg-[#1D9BF0]/[0.05] border border-[#1D9BF0]/15' : 'hover:bg-[rgba(231,233,234,0.1)]'
              }`}>
                <span className="text-[10px] text-[#71767B] w-5 text-right">{i + 1}</span>
                <span className="text-base">{plan.emoji}</span>
                <span className={`font-medium ${isActive ? 'text-[#1D9BF0]' : 'text-[#E7E9EA]'}`}>{plan.theme}</span>
                <span className="text-[10px] text-[#71767B] ml-auto truncate max-w-[140px]">{plan.scene}</span>
                {isActive && <span className="chip bg-[#1D9BF0]/10 text-[#1D9BF0] border-[#1D9BF0]/20 text-[10px]">BUGUN</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Campaign Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[#71767B] mb-2 tracking-wider">KAMPANYA KURALLARI</h2>
        <p className="text-[10px] text-[#71767B] mb-4">Marka kimliği ve içerik formatı</p>
        <div className="space-y-2.5 text-sm text-[#71767B]">
          {[
            'Tweet her zaman "GÜN [SAYI]." ile başlar',
            '2-4 satır kısa, şiirsel metin',
            'Sonda #İstanbulBekliyor hashtag\'i (tek hashtag)',
            'Her tweete 1:1 kare görsel ekle (siyah/beyaz + altın)',
            'Günde 1 ana tweet + gelen reply\'lara cevap',
            'Paylaşım saati: 09:00 TSİ',
            'Ton: yapıcı, umut dolu, asla saldırgan değil',
          ].map((rule, i) => (
            <div key={i} className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-[rgba(231,233,234,0.1)] transition-colors">
              <span className="w-6 h-6 rounded-md bg-campaign-gold/10 text-campaign-gold text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="mt-0.5">{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ ALGORITHM GUIDE ═══════════ */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-[#71767B] tracking-wider">X ALGORİTMA REHBERİ</h2>
            <p className="text-[10px] text-[#71767B] mt-1">Xquik canlı veri + x-algorithm-main kaynak kodu</p>
          </div>
          {algoData?.source && (
            <span className="text-[9px] px-2 py-1 rounded-lg bg-[#1D9BF0]/10 text-[#1D9BF0] border border-[#1D9BF0]/20">
              {algoData.source.substring(0, 40)}
            </span>
          )}
        </div>

        {algoLoading ? (
          <div className="text-xs text-[#71767B] animate-pulse text-center py-8">Algoritma verileri yükleniyor...</div>
        ) : !algoData ? (
          <div className="text-xs text-[#71767B] text-center py-8">Algoritma verileri yüklenemedi</div>
        ) : (
          <div className="space-y-6">
            {/* Content Rules */}
            {algoData.contentRules.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-[#71767B] tracking-wider mb-3">İÇERİK KURALLARI ({algoData.contentRules.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {algoData.contentRules.map((rule, i) => (
                    <div key={i} className="flex gap-2 items-start p-2.5 rounded-lg bg-[rgba(231,233,234,0.03)] border border-[#2F3336]">
                      <span className="w-5 h-5 rounded bg-[#1D9BF0]/10 text-[#1D9BF0] text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-[11px] text-[#E7E9EA] leading-relaxed">{rule.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scorer Weights */}
            {algoData.scorerWeights.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-[#71767B] tracking-wider mb-1">PHOENIX SKORLAMA SİNYALLERİ ({algoData.scorerWeights.length})</h3>
                <p className="text-[9px] text-[#71767B] mb-3">Ağırlıklar tahmin — transformer öğreniyor, sabit değerler yok</p>
                <div className="space-y-1.5">
                  {algoData.scorerWeights.map((sw, i) => {
                    const isPositive = sw.weight > 0
                    const isConfirmed = isConfirmedSignal(sw.signal)
                    const absWeight = Math.abs(sw.weight)
                    const maxWeight = Math.max(...algoData.scorerWeights.map(s => Math.abs(s.weight)))
                    const barWidth = `${Math.max(2, (absWeight / maxWeight) * 100)}%`
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-32 flex-shrink-0 flex items-center gap-1">
                          <span className="text-[10px] text-[#E7E9EA]">{sw.signal}</span>
                          {isConfirmed && <span className="text-[7px] px-1 rounded bg-[#00BA7C]/10 text-[#00BA7C]">kaynak</span>}
                        </div>
                        <div className="flex-1 h-2.5 bg-[rgba(231,233,234,0.03)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isPositive ? 'bg-[#00BA7C]/60' : 'bg-[#F91880]/60'}`} style={{ width: barWidth }} />
                        </div>
                        <span className={`w-10 text-right text-[10px] font-bold ${isPositive ? 'text-[#00BA7C]' : 'text-[#F91880]'}`}>
                          {sw.weight > 0 ? '+' : ''}{sw.weight}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Engagement Multipliers + Penalties side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {algoData.engagementMultipliers.length > 0 && (
                <div className="bg-[rgba(231,233,234,0.03)] rounded-xl p-4 border border-[#2F3336]">
                  <h3 className="text-[10px] font-bold text-[#71767B] tracking-wider mb-3">ENGAGEMENT ÇARPANLARI</h3>
                  <div className="space-y-1.5">
                    {algoData.engagementMultipliers.map((em, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-[#71767B]">{em.action}</span>
                        <span className="font-bold text-[#1D9BF0]">{em.multiplier}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {algoData.topPenalties.length > 0 && (
                <div className="bg-[#F91880]/5 rounded-xl p-4 border border-[#F91880]/10">
                  <h3 className="text-[10px] font-bold text-[#F91880] tracking-wider mb-3">CEZALAR</h3>
                  <div className="space-y-1.5">
                    {algoData.topPenalties.map((p, i) => (
                      <div key={i} className="flex gap-2 text-[11px] text-[#71767B]">
                        <span className="text-[#F91880] flex-shrink-0 font-bold">!</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Velocity */}
            {algoData.engagementVelocity && (
              <div className="bg-campaign-gold/5 rounded-xl p-4 border-l-4 border-l-campaign-gold">
                <h3 className="text-[10px] font-bold text-campaign-gold tracking-wider mb-1">ENGAGEMENT HIZI</h3>
                <p className="text-[11px] text-[#71767B] leading-relaxed">{algoData.engagementVelocity}</p>
              </div>
            )}

            {/* System Architecture */}
            <details className="group">
              <summary className="text-[10px] font-bold text-[#71767B] tracking-wider cursor-pointer hover:text-[#E7E9EA] transition-colors">
                SİSTEM MİMARİSİ (kaynak koddan)
              </summary>
              <div className="text-[10px] text-[#71767B] leading-loose space-y-0.5 mt-3 pl-2 border-l-2 border-[#2F3336]">
                {[
                  '1. Query Hydration → User Action Sequence + Features',
                  '2. Candidate Sources → Thunder (in-network) + Phoenix (OON)',
                  '3. Hydration → Core data, author info, media',
                  '4. Pre-Scoring Filters → Duplicate, age, self, muted',
                  '5. Grok Transformer → 19 sinyal logit → sigmoid → P(action)',
                  '6. Selection → Top K',
                  '7. Post-Selection → VF Filter (safety)',
                ].map((step, i) => (
                  <div key={i} className="py-0.5 hover:text-[#E7E9EA] transition-colors">{step}</div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Milestone Strategy */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[#71767B] mb-5 tracking-wider">MILESTONE STRATEJİSİ</h2>
        <div className="space-y-3 text-sm text-[#71767B]">
          {[
            { label: 'Her 50. gün', desc: 'Özet thread (son 50 günün en iyi görselleri)' },
            { label: 'Her 100. gün', desc: 'Özel görsel + daha uzun metin' },
            { label: 'Yıl dönümleri', desc: 'Özel kampanya (GÜN 366, 731, ...)' },
            { label: 'Bayramlar', desc: 'Bayram temalı görsel (ama mesaj aynı)' },
            { label: 'Gündem', desc: 'Gündemle bağlantılı tema (mahkeme, AB raporu)' },
          ].map((m, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="chip bg-campaign-gold/10 text-campaign-gold border-campaign-gold/20 w-28 text-center flex-shrink-0 text-[10px]">{m.label}</span>
              <span className="mt-0.5">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
