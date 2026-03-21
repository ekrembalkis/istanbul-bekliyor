import { useState, useEffect } from 'react'
import { getDayCount } from '../lib/utils'
import { DAY_PLANS } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'
import { getAccount } from '../lib/xquik'
import type { XquikAccount } from '../lib/xquik'
import { getCostSummary, calculateGeminiCost, resetCostTracker } from '../lib/costTracker'
import type { GeminiUsage } from '../lib/costTracker'

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

  useEffect(() => {
    getAccount()
      .then(setAccount)
      .catch(e => setAccountError(e.message))
      .finally(() => setAccountLoading(false))
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

      {/* Algorithm Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">ALGORITMA KURALLARI</h2>
        <p className="text-[10px] text-slate-400 mb-4">Xquik canlı veri — X algoritmasına göre</p>
        <div className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
          {[
            { text: 'Dış link koyma, reply\'a taşı', type: 'error' },
            { text: 'Emoji kullanma', type: 'error' },
            { text: 'Em dash / çift tire kullanma (AI tespiti)', type: 'error' },
            { text: 'Soru veya açık cümle ile bitir (reply tetikler)', type: 'tip' },
            { text: 'Reply\'lara hızla cevap ver (en güçlü sinyal)', type: 'tip' },
            { text: 'İlk 30 dakikada aktif ol', type: 'tip' },
            { text: 'Paylaşıma değer içerik yaz (DM ile paylaşılabilir)', type: 'tip' },
            { text: 'Görsel ekle (photo_expand sinyali)', type: 'tip' },
          ].map((rule, i) => (
            <div key={i} className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
              <span className={`w-6 h-6 rounded-md text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                rule.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
              }`}>{rule.type === 'error' ? '!' : '+'}</span>
              <span className="mt-0.5">{rule.text}</span>
            </div>
          ))}
        </div>
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

      {/* Supabase Config */}
      <div className="card border-l-4 border-l-brand-gold p-6 bg-brand-gold-light dark:bg-brand-gold/5">
        <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4 tracking-wider">SUPABASE YAPILANDIRMA</h2>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          <code className="chip text-brand-red text-[10px]">.env</code> dosyasına ekle:
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl p-4 font-mono text-xs text-slate-500 dark:text-slate-400 leading-loose border border-brand-gold/15">
          <div>VITE_SUPABASE_URL=https://[project-id].supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=eyJ...</div>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          SQL şeması: <code className="chip text-[10px]">supabase/schema.sql</code>
        </div>
      </div>
    </div>
  )
}
