import { useState } from 'react'
import { getDayCount, formatDate, getDateForDay, getTimeBreakdown } from '../lib/utils'
import { getDayPlan, getNextMilestone, isMilestoneDay } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'
import { getPerformanceSummary, getPublishedTweets } from '../lib/publishTracker'
import { getLatestCheck } from '../lib/shadowBanHistory'
import { runQuickCheck } from '../lib/shadowBanDetector'
import type { ShadowBanRecord, OverallStatus } from '../lib/shadowBanDetector'
import { Link } from 'react-router-dom'

const SHADOW_STATUS: Record<OverallStatus, { label: string; color: string; dot: string }> = {
  clean: { label: 'Temiz', color: 'text-[#0A0A0A]', dot: 'bg-[#0A0A0A]' },
  suspicious: { label: 'Şüpheli', color: 'text-[#D4A843]', dot: 'bg-[#D4A843]' },
  likely_banned: { label: 'Muhtemel Ban', color: 'text-[#D4A843]', dot: 'bg-[#D4A843]' },
  confirmed_banned: { label: 'Shadow Ban', color: 'text-[#E30A17]', dot: 'bg-[#E30A17]' },
}

export default function Dashboard() {
  const day = getDayCount()
  const plan = getDayPlan(day)
  const time = getTimeBreakdown(day)
  const milestone = getNextMilestone(day)
  const isSpecial = isMilestoneDay(day)
  const today = getDateForDay(day)

  const [shadowResult, setShadowResult] = useState<ShadowBanRecord | null>(() => getLatestCheck('istbekliyor'))
  const [shadowLoading, setShadowLoading] = useState(false)

  const displayName = `İSTANBUL BEKLİYOR · GÜN ${day}`
  const bio = `İstanbul ${day} gündür seçilmiş başkanını bekliyor. Her gün bir görsel. Her görsel bir ses. ⏳`

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#FFFFFF] border-b border-[#0A0A0A] transition-colors">

        <div className="relative px-8 py-12 sm:px-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none bg-[#E30A17]/[0.06] border border-[#E30A17]/10 mb-8">
            <span className="live-dot" />
            <span className="text-[11px] font-bold tracking-[3px] text-[#E30A17] uppercase">Canlı Veri</span>
          </div>

          <div className="mb-4">
            <span className="stat-number text-8xl sm:text-9xl text-[#0A0A0A] animate-counter-pulse">{day}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-1">
            Gündür <span className="text-campaign-red">Özgürlüğünden Mahrum.</span>
          </h1>

          <p className="text-[rgba(10,10,10,0.4)] text-sm sm:text-base max-w-lg mx-auto mt-4 leading-relaxed">
            İstanbul seçilmiş başkanını bekliyor. Her gün bir görsel, her görsel bir ses.
          </p>

          <div className="mt-8">
            <a href="#today" className="btn btn-primary px-6 py-2.5 text-sm rounded-none inline-flex items-center gap-2">
              Bugünkü görevi gör
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* 4-Column Stats Bar */}
      <section className="grid grid-cols-2 gap-4">
        {[
          { value: day, label: 'gün özgürlükten mahrum', color: 'text-[#0A0A0A]' },
          { value: time.months + (time.years * 12), label: 'ay toplam süre', color: 'text-[#E30A17]' },
          { value: time.years, label: 'yıl geçti', color: 'text-[#0A0A0A]' },
          { value: time.days, label: 'gün bu ay içinde', color: 'text-[#E30A17]' },
        ].map((stat, i) => (
          <div key={i} className="card p-6 text-center">
            <div className={`stat-number text-4xl sm:text-5xl mb-2 ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[rgba(10,10,10,0.4)] font-medium tracking-wide">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Milestone Alert */}
      {isSpecial && (
        <div className="card border-l-4 border-l-campaign-gold p-5 flex items-center gap-4 bg-campaign-gold/5">
          <span className="text-3xl">🏆</span>
          <div>
            <div className="font-bold text-campaign-gold text-sm">Milestone Günü!</div>
            <div className="text-xs text-[rgba(10,10,10,0.4)]">GÜN {day} — Özel içerik üretmeyi düşün (özet thread, daha uzun metin).</div>
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {milestone && milestone.day !== day && (
        <div className="card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[rgba(10,10,10,0.4)] text-sm">Sonraki milestone:</span>
            <span className="font-bold text-[#E30A17]">{milestone.label}</span>
          </div>
          <div className="chip">
            <span className="font-bold text-[#E30A17]">{milestone.day - day}</span>
            <span>gün kaldı</span>
          </div>
        </div>
      )}

      <div className="divider" />

      {/* Main Grid */}
      <div id="today" className="grid grid-cols-1 gap-6">
        {/* Today's Task */}
        <div className="card p-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0A0A0A]">Bugünün Görevi</h2>
              <span className="text-2xl">{plan.emoji}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs tracking-[3px] text-campaign-gold font-semibold mb-1">{plan.theme.toUpperCase()}</div>
            <div className="text-[11px] text-[rgba(10,10,10,0.4)] mb-4">Sahne: {plan.scene} · Altın: {plan.goldenElement}</div>
            {plan.quote && (
              <div className="mb-4 p-3 rounded-none bg-[#E30A17]/5 border-l-4 border-l-[#E30A17]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[9px] font-bold text-[#E30A17] tracking-wider">GÜNÜN SÖZÜ</div>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-none bg-[#E30A17]/10 text-[#E30A17]/70 font-medium">{plan.quote.category}</span>
                </div>
                <p className="text-sm text-[#0A0A0A] italic leading-relaxed">
                  &ldquo;{plan.quote.text}&rdquo;
                </p>
                <div className="text-[10px] text-[rgba(10,10,10,0.4)] mt-1.5">— Ekrem İmamoğlu</div>
              </div>
            )}
            <div className="bg-[rgba(10,10,10,0.02)] rounded-none p-4 text-[#0A0A0A] text-sm leading-relaxed whitespace-pre-line mb-4 max-h-40 overflow-y-auto border border-[#0A0A0A]">
              {plan.tweetTemplate}
            </div>
            <div className="flex gap-2 flex-wrap">
              <CopyBtn text={plan.tweetTemplate} label="Tweet Kopyala" />
              <CopyBtn text={plan.prompt} label="Prompt Kopyala" />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Profile Updates */}
          <div className="card p-6">
            <div>
              <h2 className="text-lg font-bold text-[#0A0A0A]">Profil Güncelleme</h2>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-1.5">DISPLAY NAME</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 input-field rounded-none px-3 py-2 text-sm text-[#E30A17] truncate bg-[rgba(10,10,10,0.02)]">{displayName}</code>
                  <CopyBtn text={displayName} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider block mb-1.5">BIO</label>
                <div className="flex items-start gap-2">
                  <code className="flex-1 input-field rounded-none px-3 py-2 text-xs text-[rgba(10,10,10,0.4)] leading-relaxed bg-[rgba(10,10,10,0.02)]">{bio}</code>
                  <CopyBtn text={bio} />
                </div>
              </div>
            </div>
          </div>

          {/* Algorithm Rules */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-[rgba(10,10,10,0.4)] mb-1">Algoritma</h2>
            <p className="text-[10px] text-[rgba(10,10,10,0.4)] mb-3">Xquik canlı veri</p>
            <div className="grid grid-cols-1 gap-2 text-sm text-[rgba(10,10,10,0.4)]">
              <div className="flex gap-2.5 items-start"><span className="text-[#E30A17] mt-0.5 text-xs font-bold">!</span><span>Link koyma, reply'a taşı</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-[#E30A17] mt-0.5 text-xs font-bold">!</span><span>Emoji kullanma</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-[#E30A17] mt-0.5 text-xs font-bold">!</span><span>Em dash / çift tire kullanma</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-[#0A0A0A] mt-0.5 text-xs font-bold">+</span><span>Soru veya açık cümle ile bitir</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-[#0A0A0A] mt-0.5 text-xs font-bold">+</span><span>Reply'lara hızlıca cevap ver</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-[#0A0A0A] mt-0.5 text-xs font-bold">+</span><span>İlk 30 dakika aktif ol</span></div>
            </div>
          </div>

          {/* Campaign Rules */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-[rgba(10,10,10,0.4)] mb-1">Kampanya</h2>
            <p className="text-[10px] text-[rgba(10,10,10,0.4)] mb-3">Marka kimliği kuralları</p>
            <div className="grid grid-cols-1 gap-2 text-sm text-[rgba(10,10,10,0.4)]">
              <div className="flex gap-2.5 items-start"><span className="text-[#0A0A0A] mt-0.5 text-xs font-bold">+</span><span>"GÜN {day}" ile başla</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-[#0A0A0A] mt-0.5 text-xs font-bold">+</span><span>#İstanbulBekliyor ekle</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-[#0A0A0A] mt-0.5 text-xs font-bold">+</span><span>09:00 TSİ'de paylaş</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-[#0A0A0A] mt-0.5 text-xs font-bold">+</span><span>1:1 görsel ekle (siyah/beyaz + altın)</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Performance Summary ── */}
      {(() => {
        const published = getPublishedTweets()
        const perf = getPerformanceSummary()
        if (published.length === 0) return null
        return (
          <section className="card p-6">
            <div>
              <h2 className="text-sm font-bold text-[rgba(10,10,10,0.4)]">Yayın Performansı</h2>
              <span className="text-[10px] text-[rgba(10,10,10,0.4)]">{published.length} tweet yayınlandı</span>
            </div>
            {perf ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Toplam Like', value: perf.totalLikes.toLocaleString(), color: 'text-[#E30A17]' },
                    { label: 'Toplam Reply', value: perf.totalReplies.toLocaleString(), color: 'text-[#E30A17]' },
                    { label: 'Toplam RT', value: perf.totalRetweets.toLocaleString(), color: 'text-[#0A0A0A]' },
                    { label: 'Ort. Like', value: perf.avgLikes.toLocaleString(), color: 'text-[#D4A843]' },
                  ].map(s => (
                    <div key={s.label} className="bg-[rgba(10,10,10,0.02)] rounded-none p-3 border border-[#0A0A0A] text-center">
                      <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-[rgba(10,10,10,0.4)] mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                {perf.best && perf.best.engagement && (
                  <div className="bg-[#D4A843]/5 rounded-none p-4 border border-[#D4A843]/20">
                    <div className="text-[10px] font-bold text-[#D4A843] tracking-wider mb-2">EN İYİ TWEET</div>
                    <p className="text-sm text-[#0A0A0A]">{perf.best.text}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-[rgba(10,10,10,0.4)]">
                      <span>♥ {perf.best.engagement.likes}</span>
                      <span>↩ {perf.best.engagement.replies}</span>
                      <span>↻ {perf.best.engagement.retweets}</span>
                    </div>
                  </div>
                )}
                {perf.topTopics.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-wider mb-2">EN İYİ KONULAR</div>
                    <div className="flex flex-wrap gap-1.5">
                      {perf.topTopics.map(tp => (
                        <span key={tp.topic} className="text-[10px] px-2 py-1 rounded-none bg-[rgba(10,10,10,0.02)] text-[rgba(10,10,10,0.4)] border border-[#0A0A0A]">
                          {tp.topic} <span className="text-[#E30A17]">♥{tp.avgLikes}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-xs text-[rgba(10,10,10,0.4)]">
                Henüz engagement verisi yok. Yayınlanan tweetlerin performansı burada görünecek.
              </div>
            )}
          </section>
        )
      })()}

      {/* Shadow Ban Health Widget */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-[rgba(10,10,10,0.4)]">Hesap Sağlığı</h2>
            <p className="text-[10px] text-[rgba(10,10,10,0.4)] mt-0.5">@istbekliyor shadow ban kontrolü</p>
          </div>
          {shadowResult && (() => {
            const cfg = SHADOW_STATUS[shadowResult.overall]
            return (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[10px] text-[rgba(10,10,10,0.4)]">%{shadowResult.confidence}</span>
              </div>
            )
          })()}
        </div>

        {shadowResult ? (
          <div className="space-y-3">
            {/* Layer status pills */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(shadowResult.checks).map(([key, check]) => {
                const labels: Record<string, string> = {
                  monitorProbe: 'K1', searchBan: 'K2', ghostBan: 'K3',
                  engagementDrop: 'K4', profileVisible: 'K5',
                }
                const colors: Record<string, string> = {
                  pass: 'bg-[#0A0A0A]/10 text-[#0A0A0A] border-[#0A0A0A]/20',
                  fail: 'bg-[#E30A17]/10 text-[#E30A17] border-[#E30A17]/20',
                  inconclusive: 'bg-[#D4A843]/10 text-[#D4A843] border-[#D4A843]/20',
                  skipped: 'bg-[rgba(10,10,10,0.02)] text-[rgba(10,10,10,0.4)] border-[#0A0A0A]',
                  error: 'bg-[#E30A17]/10 text-[#E30A17] border-[#E30A17]/20',
                }
                const icons: Record<string, string> = {
                  pass: '\u2713', fail: '\u2717', inconclusive: '\u2014', skipped: '\u2022', error: '!',
                }
                return (
                  <span key={key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-none text-[10px] font-semibold border ${colors[check.status]}`}>
                    {labels[key]} {icons[check.status]}
                  </span>
                )
              })}
            </div>

            {/* Engagement line */}
            {shadowResult.engagement && (
              <div className="text-[11px] text-[rgba(10,10,10,0.4)]">
                Ort. {shadowResult.engagement.avgViews.toLocaleString()} view &middot; %{shadowResult.engagement.avgEngRate} engagement
                {shadowResult.engagement.trend === 'up' && <span className="text-[#0A0A0A] ml-1">{'\u2191'}</span>}
                {shadowResult.engagement.trend === 'down' && <span className="text-[#E30A17] ml-1">{'\u2193'}</span>}
                {shadowResult.engagement.trend === 'stable' && <span className="text-[rgba(10,10,10,0.4)] ml-1">{'\u2194'}</span>}
              </div>
            )}

            {/* Timestamp + actions */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[rgba(10,10,10,0.4)]">
                Son kontrol: {new Date(shadowResult.checkedAt).toLocaleString('tr-TR')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setShadowLoading(true)
                    try {
                      const res = await runQuickCheck('istbekliyor')
                      setShadowResult(res)
                    } catch (err) { console.error('Shadow check failed:', err) }
                    setShadowLoading(false)
                  }}
                  disabled={shadowLoading}
                  className="text-[10px] font-semibold text-[rgba(10,10,10,0.4)] hover:text-[#E30A17] transition-colors disabled:opacity-40"
                >
                  {shadowLoading ? 'Kontrol...' : 'Hızlı Kontrol'}
                </button>
                <Link to="/shadow-check" className="text-[10px] font-semibold text-[#E30A17] hover:text-[#B80813] transition-colors">
                  Detaylı Analiz &rarr;
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[rgba(10,10,10,0.4)]">Henüz kontrol yapılmadı</span>
            <button
              onClick={async () => {
                setShadowLoading(true)
                try {
                  const res = await runQuickCheck('istbekliyor')
                  setShadowResult(res)
                } catch (err) { console.error('Shadow check failed:', err) }
                setShadowLoading(false)
              }}
              disabled={shadowLoading}
              className="text-xs font-semibold text-[#E30A17] hover:text-[#B80813] transition-colors disabled:opacity-40"
            >
              {shadowLoading ? 'Kontrol...' : 'Şimdi Kontrol Et'}
            </button>
          </div>
        )}
      </section>

      {/* Daily Workflow */}
      <section className="card p-6">
        <div>
          <h2 className="text-sm font-bold text-[rgba(10,10,10,0.4)]">Günlük İş Akışı (30 dk)</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {[
            { step: '01', time: '5 dk', label: 'Panelden tema + prompt al', accent: 'border-l-[#E30A17]' },
            { step: '02', time: '15 dk', label: "Nano Banana Pro'da görseli üret", accent: 'border-l-purple-400' },
            { step: '03', time: '5 dk', label: 'Tweet yaz + algoritma kontrol', accent: 'border-l-campaign-gold' },
            { step: '04', time: '5 dk', label: "Paylaş + reply'lara cevap", accent: 'border-l-[#0A0A0A]' },
          ].map(s => (
            <div key={s.step} className={`bg-[rgba(10,10,10,0.02)] rounded-none p-4 border-l-[3px] ${s.accent} hover:bg-[rgba(10,10,10,0.05)] transition-colors`}>
              <div className="text-[10px] font-bold text-[rgba(10,10,10,0.4)] tracking-widest mb-2">ADIM {s.step}</div>
              <div className="text-xs text-[rgba(10,10,10,0.4)] mb-1">{s.time}</div>
              <div className="text-sm text-[#0A0A0A] font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
