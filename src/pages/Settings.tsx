import { useState, useEffect } from 'react'
import { getDayCount } from '../lib/utils'
import { DAY_PLANS } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'
import { getAccount, getConnectedAccounts, connectXAccount, disconnectXAccount } from '../lib/xquik'
import type { XquikAccount, XAccount } from '../lib/xquik'
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
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-slate-500 dark:text-slate-300">{formatTokens(value)}</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  )
}

function GeminiCard({ title, usage, period }: { title: string; usage: GeminiUsage; period: string }) {
  const cost = calculateGeminiCost(usage)
  return (
    <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold text-slate-400 tracking-wider">{title}</div>
          <div className="text-[10px] text-slate-400">{period}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCost(cost)}</div>
          <div className="text-[10px] text-slate-400">{usage.calls} istek</div>
        </div>
      </div>
      <div className="space-y-2">
        <UsageBar label="Input tokens" value={usage.promptTokens} max={Math.max(usage.promptTokens, usage.completionTokens)} color="bg-blue-400" />
        <UsageBar label="Output tokens" value={usage.completionTokens} max={Math.max(usage.promptTokens, usage.completionTokens)} color="bg-indigo-400" />
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
      <div className="section-header">
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Ayarlar</h1>
      </div>

      {/* ═══════════ COST TRACKER ═══════════ */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">API KULLANIM PANELİ</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Xquik Subscription */}
          <div className="space-y-4">
            <div className="text-[10px] font-bold text-slate-400 tracking-wider">XQUIK ABONELİK</div>
            {accountLoading ? (
              <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-6 border border-slate-100 dark:border-white/[0.06] text-center">
                <div className="text-xs text-slate-400 animate-pulse">Yükleniyor...</div>
              </div>
            ) : accountError ? (
              <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/20">
                <div className="text-xs text-red-600 dark:text-red-400">{accountError}</div>
              </div>
            ) : account ? (
              <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06] space-y-4">
                {/* Status + Plan */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Xquik Pro
                    </span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                {/* Usage gauge */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400">Dönem Kullanımı</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{usagePct}%</span>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usagePct > 80 ? 'bg-red-500' : usagePct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(2, usagePct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                    <span>{usagePct}% kullanıldı</span>
                    <span>{100 - usagePct}% kaldı</span>
                  </div>
                </div>

                {/* Period + Monitors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-dark-card rounded-lg p-2.5 border border-slate-100 dark:border-white/[0.06]">
                    <div className="text-[10px] text-slate-400 mb-0.5">Dönem</div>
                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      {period ? new Date(period.start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-'}
                      {' — '}
                      {period ? new Date(period.end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '-'}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-dark-card rounded-lg p-2.5 border border-slate-100 dark:border-white/[0.06]">
                    <div className="text-[10px] text-slate-400 mb-0.5">Kalan Gün</div>
                    <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">{daysLeft} gün</div>
                  </div>
                  <div className="bg-white dark:bg-dark-card rounded-lg p-2.5 border border-slate-100 dark:border-white/[0.06]">
                    <div className="text-[10px] text-slate-400 mb-0.5">Monitörler</div>
                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                      {account.monitorsUsed} / {account.monitorsAllowed}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-dark-card rounded-lg p-2.5 border border-slate-100 dark:border-white/[0.06]">
                    <div className="text-[10px] text-slate-400 mb-0.5">API Versiyonu</div>
                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">v{account.pricingVersion}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Gemini Usage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider">GEMİNİ 2.0 FLASH</div>
              <button
                onClick={() => { if (confirm('Gemini kullanım verilerini sıfırla?')) { resetCostTracker(); setCostSummary(getCostSummary()) } }}
                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
              >
                Sıfırla
              </button>
            </div>
            <GeminiCard title="BUGÜN" usage={costSummary.today} period={new Date().toLocaleDateString('tr-TR')} />
            <GeminiCard title="SON 30 GÜN" usage={costSummary.last30Days} period="Aylık toplam" />

            {/* Pricing reference */}
            <div className="text-[10px] text-slate-400 flex items-center gap-3">
              <span>Fiyat: Input $0.10/1M</span>
              <span>Output $0.40/1M</span>
            </div>
          </div>
        </div>

        {/* Daily chart - last 7 days */}
        {costSummary.dailyRecords.length > 1 && (
          <div className="mt-6 border-t border-slate-100 dark:border-white/[0.06] pt-4">
            <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">SON 7 GÜN</div>
            <div className="flex items-end gap-1 h-16">
              {costSummary.dailyRecords.slice(-7).map((r, i) => {
                const maxTokens = Math.max(...costSummary.dailyRecords.slice(-7).map(d => d.gemini.totalTokens), 1)
                const pct = (r.gemini.totalTokens / maxTokens) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-blue-100 dark:bg-blue-500/20 rounded-sm" style={{ height: `${Math.max(2, pct)}%` }}
                      title={`${r.date}: ${formatTokens(r.gemini.totalTokens)} token, ${r.gemini.calls} istek`}
                    />
                    <span className="text-[8px] text-slate-400">{r.date.slice(5)}</span>
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
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wider">X HESAP BAĞLANTISI</h2>
          <button
            onClick={() => setShowConnect(!showConnect)}
            className="text-[10px] px-3 py-1.5 rounded-lg border border-brand-red/20 text-brand-red hover:bg-brand-red/10 font-bold transition-all"
          >
            {showConnect ? 'Kapat' : 'Hesap Bağla'}
          </button>
        </div>

        {xError && (
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-3 border border-red-200 dark:border-red-500/20 mb-4">
            <div className="text-xs text-red-600 dark:text-red-400">{xError}</div>
          </div>
        )}

        {/* Connected accounts list */}
        {xLoading ? (
          <div className="text-xs text-slate-400 animate-pulse">Yükleniyor...</div>
        ) : xAccounts.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-6 border border-slate-100 dark:border-white/[0.06] text-center">
            <div className="text-sm text-slate-400">Bağlı hesap yok</div>
            <div className="text-[10px] text-slate-400 mt-1">Tweet paylaşmak için bir X hesabı bağlayın</div>
          </div>
        ) : (
          <div className="space-y-2">
            {xAccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${acc.status === 'active' || acc.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">@{acc.xUsername}</div>
                    <div className="text-[10px] text-slate-400">{acc.status}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(acc.id, acc.xUsername)}
                  className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                >
                  Bağlantıyı Kes
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Connect form */}
        {showConnect && (
          <div className="mt-4 bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06] space-y-3">
            <div className="text-[10px] font-bold text-slate-400 tracking-wider">YENİ HESAP BAĞLA</div>
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
            <div className="text-[10px] text-slate-400">
              Bilgiler Xquik API'ye gönderilir. Şifreler bu panelde saklanmaz.
            </div>
          </div>
        )}
      </div>

      {/* Campaign Info */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">KAMPANYA BİLGİLERİ</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
          {[
            { label: 'Hesap', value: '@istbekliyor' },
            { label: 'Başlangıç', value: '19 Mart 2025' },
            { label: 'Bugün', value: `GÜN ${day}` },
            { label: 'Hashtag', value: '#İstanbulBekliyor' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[10px] text-slate-400 tracking-wider font-semibold mb-1">{item.label.toUpperCase()}</div>
              <div className="text-slate-700 dark:text-slate-200 font-mono font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Colors */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">MARKA RENKLERİ</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { name: 'Marka Kırmızı', hex: '#E30A17', usage: 'Profil, banner' },
            { name: 'Altın Aksan', hex: '#D4A843', usage: 'Günlük görseller' },
            { name: 'Koyu Arka Plan', hex: '#0C0C12', usage: 'Dark mode' },
            { name: 'Kart Koyu', hex: '#16161E', usage: 'Dark mode kartlar' },
          ].map(c => (
            <div key={c.hex} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-white/10 flex-shrink-0 shadow-card" style={{ backgroundColor: c.hex }} />
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{c.name}</div>
                <div className="text-[10px] font-mono text-slate-400">{c.hex}</div>
                <div className="text-[10px] text-slate-400">{c.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Template */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-brand-red tracking-wider">NANO BANANA PRO PROMPT ŞABLONU</h2>
          <CopyBtn text={promptTemplate} label="Şablon Kopyala" />
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 text-xs font-mono text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-white/[0.06]">
          {promptTemplate}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] text-slate-400">
          <div><span className="font-semibold text-slate-500 dark:text-slate-300">API:</span> aspectRatio "1:1"</div>
          <div><span className="font-semibold text-slate-500 dark:text-slate-300">Resolution:</span> 2K</div>
          <div><span className="font-semibold text-slate-500 dark:text-slate-300">Temperature:</span> 0.7</div>
        </div>
      </div>

      {/* Visual Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">GÖRSEL ÜRETİM KURALLARI</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { num: '1', rule: 'Arka plan siyah veya koyu gri' },
            { num: '2', rule: 'Sahne İstanbul\'a ait mekân veya sembolik nesne' },
            { num: '3', rule: 'Tüm sahne siyah beyaz' },
            { num: '4', rule: 'TEK BİR eleman altın (#D4A843) renginde' },
            { num: '5', rule: '"GÜN [SAYI]" yazısı, temiz sans-serif' },
            { num: '6', rule: '1:1 kare format, 2K çözünürlük' },
          ].map(r => (
            <div key={r.num} className="flex items-start gap-3 text-sm p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl">
              <span className="w-7 h-7 rounded-lg bg-brand-gold/10 text-brand-gold text-xs font-bold flex items-center justify-center flex-shrink-0">{r.num}</span>
              <span className="text-slate-600 dark:text-slate-300 mt-0.5">{r.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Pool */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">TEMA HAVUZU ({DAY_PLANS.length} Tema)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {DAY_PLANS.map((plan, i) => {
            const isActive = (day - 1) % DAY_PLANS.length === i
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive ? 'bg-brand-red/[0.05] dark:bg-brand-red/[0.08] border border-brand-red/15' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
              }`}>
                <span className="text-[10px] font-mono text-slate-400 w-5 text-right">{i + 1}</span>
                <span className="text-base">{plan.emoji}</span>
                <span className={`font-medium ${isActive ? 'text-brand-red' : 'text-slate-600 dark:text-slate-300'}`}>{plan.theme}</span>
                <span className="text-[10px] text-slate-400 ml-auto truncate max-w-[140px]">{plan.scene}</span>
                {isActive && <span className="chip bg-brand-red/10 text-brand-red border-brand-red/20 text-[10px]">BUGÜN</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Campaign Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">KAMPANYA KURALLARI</h2>
        <p className="text-[10px] text-slate-400 mb-4">Marka kimliği ve içerik formatı</p>
        <div className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
          {[
            'Tweet her zaman "GÜN [SAYI]." ile başlar',
            '2-4 satır kısa, şiirsel metin',
            'Sonda #İstanbulBekliyor hashtag\'i (tek hashtag)',
            'Her tweete 1:1 kare gorsel ekle (siyah/beyaz + altin)',
            'Gunde 1 ana tweet + gelen reply\'lara cevap',
            'Paylasim saati: 09:00 TSI',
            'Ton: yapici, umut dolu, asla saldirgan degil',
          ].map((rule, i) => (
            <div key={i} className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
              <span className="w-6 h-6 rounded-md bg-brand-gold/10 text-brand-gold text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="mt-0.5">{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ ALGORITHM GUIDE ═══════════ */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wider">X ALGORİTMA REHBERİ</h2>
            <p className="text-[10px] text-slate-400 mt-1">Xquik canlı veri + x-algorithm-main kaynak kodu</p>
          </div>
          {algoData?.source && (
            <span className="text-[9px] px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 border border-blue-200 dark:border-blue-500/20">
              {algoData.source.substring(0, 40)}
            </span>
          )}
        </div>

        {algoLoading ? (
          <div className="text-xs text-slate-400 animate-pulse text-center py-8">Algoritma verileri yükleniyor...</div>
        ) : !algoData ? (
          <div className="text-xs text-slate-400 text-center py-8">Algoritma verileri yüklenemedi</div>
        ) : (
          <div className="space-y-6">
            {/* Content Rules */}
            {algoData.contentRules.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-3">İÇERİK KURALLARI ({algoData.contentRules.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {algoData.contentRules.map((rule, i) => (
                    <div key={i} className="flex gap-2 items-start p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                      <span className="w-5 h-5 rounded bg-brand-red/10 text-brand-red text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{rule.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scorer Weights */}
            {algoData.scorerWeights.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">PHOENIX SKORLAMA SİNYALLERİ ({algoData.scorerWeights.length})</h3>
                <p className="text-[9px] text-slate-400 mb-3">Ağırlıklar tahmin — transformer öğreniyor, sabit değerler yok</p>
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
                          <span className="text-[10px] text-slate-600 dark:text-slate-300">{sw.signal}</span>
                          {isConfirmed && <span className="text-[7px] px-1 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">kaynak</span>}
                        </div>
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isPositive ? 'bg-emerald-500/60' : 'bg-red-500/60'}`} style={{ width: barWidth }} />
                        </div>
                        <span className={`w-10 text-right text-[10px] font-mono font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
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
                <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border border-slate-100 dark:border-white/[0.06]">
                  <h3 className="text-[10px] font-bold text-slate-400 tracking-wider mb-3">ENGAGEMENT ÇARPANLARI</h3>
                  <div className="space-y-1.5">
                    {algoData.engagementMultipliers.map((em, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">{em.action}</span>
                        <span className="font-mono font-bold text-brand-red">{em.multiplier}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {algoData.topPenalties.length > 0 && (
                <div className="bg-red-50 dark:bg-red-500/5 rounded-xl p-4 border border-red-100 dark:border-red-500/10">
                  <h3 className="text-[10px] font-bold text-red-500 tracking-wider mb-3">CEZALAR</h3>
                  <div className="space-y-1.5">
                    {algoData.topPenalties.map((p, i) => (
                      <div key={i} className="flex gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="text-red-500 flex-shrink-0 font-bold">!</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Velocity */}
            {algoData.engagementVelocity && (
              <div className="bg-brand-gold/5 rounded-xl p-4 border-l-4 border-l-brand-gold">
                <h3 className="text-[10px] font-bold text-brand-gold tracking-wider mb-1">ENGAGEMENT HIZI</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{algoData.engagementVelocity}</p>
              </div>
            )}

            {/* System Architecture */}
            <details className="group">
              <summary className="text-[10px] font-bold text-slate-400 tracking-wider cursor-pointer hover:text-slate-600 transition-colors">
                SİSTEM MİMARİSİ (kaynak koddan)
              </summary>
              <div className="font-mono text-[10px] text-slate-400 leading-loose space-y-0.5 mt-3 pl-2 border-l-2 border-slate-100 dark:border-white/[0.06]">
                {[
                  '1. Query Hydration → User Action Sequence + Features',
                  '2. Candidate Sources → Thunder (in-network) + Phoenix (OON)',
                  '3. Hydration → Core data, author info, media',
                  '4. Pre-Scoring Filters → Duplicate, age, self, muted',
                  '5. Grok Transformer → 19 sinyal logit → sigmoid → P(action)',
                  '6. Selection → Top K',
                  '7. Post-Selection → VF Filter (safety)',
                ].map((step, i) => (
                  <div key={i} className="py-0.5 hover:text-slate-700 dark:hover:text-white transition-colors">{step}</div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Milestone Strategy */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">MILESTONE STRATEJİSİ</h2>
        <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
          {[
            { label: 'Her 50. gün', desc: 'Özet thread (son 50 günün en iyi görselleri)' },
            { label: 'Her 100. gün', desc: 'Özel görsel + daha uzun metin' },
            { label: 'Yıl dönümleri', desc: 'Özel kampanya (GÜN 366, 731, ...)' },
            { label: 'Bayramlar', desc: 'Bayram temalı görsel (ama mesaj aynı)' },
            { label: 'Gündem', desc: 'Gündemle bağlantılı tema (mahkeme, AB raporu)' },
          ].map((m, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="chip bg-brand-gold/10 text-brand-gold border-brand-gold/20 w-28 text-center flex-shrink-0 text-[10px]">{m.label}</span>
              <span className="mt-0.5">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
