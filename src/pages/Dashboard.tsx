import { getDayCount, formatDate, getDateForDay, getTimeBreakdown } from '../lib/utils'
import { getDayPlan, getNextMilestone, isMilestoneDay } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'

export default function Dashboard() {
  const day = getDayCount()
  const plan = getDayPlan(day)
  const time = getTimeBreakdown(day)
  const milestone = getNextMilestone(day)
  const isSpecial = isMilestoneDay(day)
  const today = getDateForDay(day)

  const displayName = `İSTANBUL BEKLİYOR · GÜN ${day}`
  const bio = `İstanbul ${day} gündür seçilmiş başkanını bekliyor. Her gün bir görsel. Her görsel bir ses. ⏳`

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-white dark:bg-dark-card border border-black/[0.06] dark:border-white/[0.06] shadow-card dark:shadow-dark-card transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-brand-red/[0.03] to-transparent rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-brand-gold/[0.04] to-transparent rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative px-8 py-12 sm:px-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-red/[0.06] border border-brand-red/10 mb-8">
            <span className="live-dot" />
            <span className="text-[11px] font-bold tracking-[3px] text-brand-red uppercase">Canlı Veri</span>
          </div>

          <div className="mb-4">
            <span className="stat-number text-8xl sm:text-9xl text-slate-850 dark:text-white animate-counter-pulse">{day}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-850 dark:text-white mb-1">
            Gündür <span className="text-brand-red">Özgürlüğünden Mahrum.</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto mt-4 leading-relaxed">
            İstanbul seçilmiş başkanını bekliyor. Her gün bir görsel, her görsel bir ses.
          </p>

          <div className="mt-8">
            <a href="#today" className="btn btn-primary px-6 py-2.5 text-sm rounded-full inline-flex items-center gap-2">
              Bugünkü görevi gör
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* 4-Column Stats Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { value: day, label: 'gün özgürlükten mahrum', color: 'text-slate-850 dark:text-white' },
          { value: time.months + (time.years * 12), label: 'ay toplam süre', color: 'text-brand-red' },
          { value: time.years, label: 'yıl geçti', color: 'text-slate-850 dark:text-white' },
          { value: time.days, label: 'gün bu ay içinde', color: 'text-brand-red' },
        ].map((stat, i) => (
          <div key={i} className="card p-6 text-center">
            <div className={`stat-number text-4xl sm:text-5xl mb-2 ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-400 font-medium tracking-wide">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Milestone Alert */}
      {isSpecial && (
        <div className="card border-l-4 border-l-brand-gold p-5 flex items-center gap-4 bg-brand-gold-light dark:bg-brand-gold/5">
          <span className="text-3xl">🏆</span>
          <div>
            <div className="font-bold text-brand-gold text-sm">Milestone Günü!</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">GÜN {day} — Özel içerik üretmeyi düşün (özet thread, daha uzun metin).</div>
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {milestone && milestone.day !== day && (
        <div className="card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">Sonraki milestone:</span>
            <span className="font-mono font-bold text-brand-red">{milestone.label}</span>
          </div>
          <div className="chip">
            <span className="font-mono font-bold text-brand-red">{milestone.day - day}</span>
            <span>gün kaldı</span>
          </div>
        </div>
      )}

      <div className="divider" />

      {/* Main Grid */}
      <div id="today" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Task */}
        <div className="card p-6">
          <div className="section-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Bugünün Görevi</h2>
              <span className="text-2xl">{plan.emoji}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-mono tracking-[3px] text-brand-gold font-semibold mb-1">{plan.theme.toUpperCase()}</div>
            <div className="text-[11px] text-slate-400 mb-4">Sahne: {plan.scene} · Altın: {plan.goldenElement}</div>
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line mb-4 max-h-40 overflow-y-auto border border-slate-100 dark:border-white/[0.06]">
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
            <div className="section-header">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Profil Güncelleme</h2>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">DISPLAY NAME</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 input-field rounded-lg px-3 py-2 text-sm font-mono text-brand-red truncate bg-slate-50 dark:bg-white/[0.03]">{displayName}</code>
                  <CopyBtn text={displayName} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-1.5">BIO</label>
                <div className="flex items-start gap-2">
                  <code className="flex-1 input-field rounded-lg px-3 py-2 text-xs font-mono text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-white/[0.03]">{bio}</code>
                  <CopyBtn text={bio} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Reminders */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">Hızlı Hatırlatma</h2>
            <div className="grid grid-cols-1 gap-2.5 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex gap-2.5 items-start"><span className="text-brand-red mt-0.5 text-xs font-bold">✕</span><span>Link koyma (ilk yanıta at)</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-emerald-500 mt-0.5 text-xs font-bold">✓</span><span>"GÜN {day}" ile başla</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-emerald-500 mt-0.5 text-xs font-bold">✓</span><span>Sonda soru sor (reply tetikler)</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-emerald-500 mt-0.5 text-xs font-bold">✓</span><span>Gelen reply'lara cevap ver (150× like)</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-emerald-500 mt-0.5 text-xs font-bold">✓</span><span>Sabah 09:00 TSİ'de paylaş</span></div>
              <div className="flex gap-2.5 items-start"><span className="text-emerald-500 mt-0.5 text-xs font-bold">✓</span><span>#İstanbulBekliyor ekle</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Workflow */}
      <section className="card p-6">
        <div className="section-header">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400">Günlük İş Akışı (30 dk)</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {[
            { step: '01', time: '5 dk', label: 'Panelden tema + prompt al', accent: 'border-l-blue-400' },
            { step: '02', time: '15 dk', label: "Nano Banana Pro'da görseli üret", accent: 'border-l-purple-400' },
            { step: '03', time: '5 dk', label: 'Tweet yaz + algoritma kontrol', accent: 'border-l-brand-gold' },
            { step: '04', time: '5 dk', label: "Paylaş + reply'lara cevap", accent: 'border-l-emerald-400' },
          ].map(s => (
            <div key={s.step} className={`bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 border-l-[3px] ${s.accent} hover:bg-slate-100/80 dark:hover:bg-white/[0.05] transition-colors`}>
              <div className="text-[10px] font-bold text-slate-400 tracking-widest mb-2">ADIM {s.step}</div>
              <div className="text-xs text-slate-400 mb-1">{s.time}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
