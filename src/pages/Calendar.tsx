import { getDayCount, formatDate, getDateForDay } from '../lib/utils'
import { getDayPlan, isMilestoneDay } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'

export default function Calendar() {
  const today = getDayCount()
  const days = Array.from({ length: 30 }, (_, i) => {
    const dayNum = today + i
    const plan = getDayPlan(dayNum)
    const date = getDateForDay(dayNum)
    const milestone = isMilestoneDay(dayNum)
    return { dayNum, plan, date, isToday: i === 0, milestone }
  })

  const weekday = (d: Date) => d.toLocaleDateString('tr-TR', { weekday: 'short' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">30 Günlük Takvim</h1>
        <div className="text-xs text-white/25 font-mono">GÜN {today} — GÜN {today + 29}</div>
      </div>

      <div className="space-y-1.5">
        {days.map(({ dayNum, plan, date, isToday, milestone }) => (
          <div key={dayNum} className={`flex items-center gap-4 p-3.5 transition-all group ${
            isToday
              ? 'glass-card-lite border-gradient rounded-xl'
              : milestone
                ? 'glass-card-lite border-gradient-gold rounded-xl'
                : 'glass-card-lite rounded-xl'
          }`}>
            {/* Day Number */}
            <div className="w-14 text-center flex-shrink-0">
              <div className={`text-lg font-bold font-mono ${isToday ? 'gradient-text' : milestone ? 'text-brand-gold' : 'text-white/45'}`}>{dayNum}</div>
              <div className="text-[9px] text-white/15">GÜN</div>
            </div>

            {/* Date */}
            <div className="w-16 flex-shrink-0 text-center">
              <div className="text-xs font-mono text-white/25">{weekday(date)}</div>
              <div className="text-[10px] text-white/15">{date.getDate()}/{date.getMonth() + 1}</div>
            </div>

            {/* Theme */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base">{plan.emoji}</span>
                <span className="font-medium text-sm text-white/65">{plan.theme}</span>
                {isToday && <span className="glass-chip !bg-brand-red/15 text-brand-red">BUGÜN</span>}
                {milestone && !isToday && <span className="glass-chip !bg-brand-gold/15 text-brand-gold">MILESTONE</span>}
              </div>
              <div className="text-[10px] text-white/15 mt-0.5 truncate">{plan.scene}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyBtn text={plan.tweetTemplate} label="Tweet" />
              <CopyBtn text={plan.prompt} label="Prompt" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
