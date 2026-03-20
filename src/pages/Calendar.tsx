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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">30 Günlük Takvim</h1>
        </div>
        <div className="chip font-mono">
          GÜN {today} — GÜN {today + 29}
        </div>
      </div>

      <div className="card overflow-hidden">
        {days.map(({ dayNum, plan, date, isToday, milestone }, idx) => (
          <div key={dayNum} className={`flex items-center gap-4 px-5 py-4 transition-all group ${
            idx !== 0 ? 'border-t border-slate-100 dark:border-white/[0.04]' : ''
          } ${
            isToday
              ? 'bg-brand-red/[0.03] dark:bg-brand-red/[0.06] border-l-[3px] border-l-brand-red'
              : milestone
                ? 'bg-brand-gold-light dark:bg-brand-gold/[0.05] border-l-[3px] border-l-brand-gold'
                : 'hover:bg-slate-50 dark:hover:bg-white/[0.02] border-l-[3px] border-l-transparent'
          }`}>
            <div className="w-14 text-center flex-shrink-0">
              <div className={`text-lg font-bold font-mono ${isToday ? 'text-brand-red' : milestone ? 'text-brand-gold' : 'text-slate-700 dark:text-slate-300'}`}>{dayNum}</div>
              <div className="text-[9px] text-slate-400 font-semibold tracking-widest">GÜN</div>
            </div>

            <div className="w-16 flex-shrink-0 text-center">
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">{weekday(date)}</div>
              <div className="text-[10px] text-slate-400">{date.getDate()}/{date.getMonth() + 1}</div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base">{plan.emoji}</span>
                <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{plan.theme}</span>
                {isToday && <span className="chip bg-brand-red/10 text-brand-red border-brand-red/20 text-[10px]">BUGÜN</span>}
                {milestone && !isToday && <span className="chip bg-brand-gold/10 text-brand-gold border-brand-gold/20 text-[10px]">MILESTONE</span>}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{plan.scene}</div>
            </div>

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
