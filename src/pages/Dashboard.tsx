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
    <div className="space-y-6">
      {/* Hero Day Counter */}
      <div className="glass-card-static border-gradient rounded-2xl p-8 relative overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-red/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-gold/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative">
          <div className="text-xs font-mono tracking-[8px] text-white/20 mb-3">İSTANBUL BEKLİYOR</div>
          <div className="flex items-end gap-4">
            <div className="text-8xl font-black font-mono gradient-text tracking-tighter leading-none">{day}</div>
            <div className="text-lg text-white/25 font-semibold mb-2">GÜN</div>
          </div>

          <div className="flex gap-4 mt-6">
            {[
              { v: time.years, l: 'YIL' },
              { v: time.months, l: 'AY' },
              { v: time.days, l: 'GÜN' },
            ].map(i => (
              <div key={i.l} className="glass-chip px-4 py-2 text-center">
                <div className="text-xl font-bold font-mono text-white/60">{i.v}</div>
                <div className="text-[9px] tracking-[3px] text-white/20 mt-0.5">{i.l}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-white/20 mt-4 font-mono">{formatDate(today)}</div>
        </div>
      </div>

      {/* Milestone Alert */}
      {isSpecial && (
        <div className="glass-card border-gradient-gold rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <div className="font-bold text-brand-gold text-sm">Milestone Günü!</div>
            <div className="text-xs text-white/35">GÜN {day} — Özel içerik üretmeyi düşün (özet thread, daha uzun metin).</div>
          </div>
        </div>
      )}

      {/* Next Milestone */}
      {milestone && milestone.day !== day && (
        <div className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white/20">Sonraki milestone:</span>
            <span className="font-mono font-bold text-brand-gold">{milestone.label}</span>
          </div>
          <div className="text-sm font-mono text-white/25">{milestone.day - day} gün kaldı</div>
        </div>
      )}

      <div className="gradient-divider" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Task */}
        <div className="glass-card border-gradient rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Bugünün Görevi</h2>
            <span className="text-2xl">{plan.emoji}</span>
          </div>
          <div className="text-xs font-mono tracking-[3px] text-brand-gold/60 mb-1">{plan.theme.toUpperCase()}</div>
          <div className="text-[10px] text-white/20 mb-3">Sahne: {plan.scene} · Altın: {plan.goldenElement}</div>
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 text-white/45 text-sm leading-relaxed whitespace-pre-line mb-4 max-h-40 overflow-y-auto">
            {plan.tweetTemplate}
          </div>
          <div className="flex gap-2 flex-wrap">
            <CopyBtn text={plan.tweetTemplate} label="Tweet Kopyala" />
            <CopyBtn text={plan.prompt} label="Prompt Kopyala" />
          </div>
        </div>

        {/* Profile Updates */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Profil Güncelleme</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-white/30 tracking-wider block mb-1.5">DISPLAY NAME</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 glass-input rounded-lg px-3 py-2 text-sm font-mono text-brand-gold truncate">{displayName}</code>
                  <CopyBtn text={displayName} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/30 tracking-wider block mb-1.5">BIO</label>
                <div className="flex items-start gap-2">
                  <code className="flex-1 glass-input rounded-lg px-3 py-2 text-xs font-mono text-white/45 leading-relaxed">{bio}</code>
                  <CopyBtn text={bio} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Reminders */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-bold mb-3 text-white/60">Hızlı Hatırlatma</h2>
            <div className="grid grid-cols-1 gap-2 text-sm text-white/40">
              <div className="flex gap-2 items-start"><span className="text-brand-red mt-0.5 text-xs">✕</span><span>Link koyma (ilk yanıta at)</span></div>
              <div className="flex gap-2 items-start"><span className="text-green-400 mt-0.5 text-xs">✓</span><span>"GÜN {day}" ile başla</span></div>
              <div className="flex gap-2 items-start"><span className="text-green-400 mt-0.5 text-xs">✓</span><span>Sonda soru sor (reply tetikler)</span></div>
              <div className="flex gap-2 items-start"><span className="text-green-400 mt-0.5 text-xs">✓</span><span>Gelen reply'lara cevap ver (150× like)</span></div>
              <div className="flex gap-2 items-start"><span className="text-green-400 mt-0.5 text-xs">✓</span><span>Sabah 09:00 TSİ'de paylaş</span></div>
              <div className="flex gap-2 items-start"><span className="text-green-400 mt-0.5 text-xs">✓</span><span>#İstanbulBekliyor ekle</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Workflow */}
      <div className="glass-card-static rounded-2xl p-6">
        <h2 className="text-sm font-bold mb-4 text-white/60">Günlük İş Akışı (30 dk)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { step: '1', time: '5 dk', label: 'Panelden tema + prompt al', color: 'border-blue-400/30' },
            { step: '2', time: '15 dk', label: 'Nano Banana Pro\'da görseli üret', color: 'border-purple-400/30' },
            { step: '3', time: '5 dk', label: 'Tweet yaz + algoritma kontrol', color: 'border-brand-gold/30' },
            { step: '4', time: '5 dk', label: 'Paylaş + reply\'lara cevap', color: 'border-green-400/30' },
          ].map(s => (
            <div key={s.step} className={`glass-card rounded-xl p-4 border-l-2 ${s.color}`}>
              <div className="glass-chip inline-block mb-2">ADIM {s.step}</div>
              <div className="text-xs text-white/25 mb-1">{s.time}</div>
              <div className="text-sm text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
