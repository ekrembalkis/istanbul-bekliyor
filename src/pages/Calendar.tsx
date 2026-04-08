import { useState } from 'react'
import { getDayCount, getDateForDay } from '../lib/utils'
import { getDayPlan, isMilestoneDay } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = lastDay.getDate()
  return { firstDay, daysInMonth, startWeekday }
}

export default function Calendar() {
  const today = getDayCount()
  const todayDate = new Date()
  const [viewYear, setViewYear] = useState(todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const { daysInMonth, startWeekday } = getMonthData(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null)
  }

  const goToday = () => {
    setViewYear(todayDate.getFullYear())
    setViewMonth(todayDate.getMonth())
    setSelectedDay(null)
  }

  // Build calendar grid cells
  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Get campaign day number for a calendar date
  const getCampaignDay = (calDay: number) => {
    const date = new Date(viewYear, viewMonth, calDay)
    return getDayCount(date)
  }

  const isCurrentMonth = viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth()

  // Selected day detail
  const selectedCampaignDay = selectedDay ? getCampaignDay(selectedDay) : null
  const selectedPlan = selectedCampaignDay && selectedCampaignDay > 0 ? getDayPlan(selectedCampaignDay) : null
  const selectedDate = selectedDay ? new Date(viewYear, viewMonth, selectedDay) : null
  const selectedMilestone = selectedCampaignDay ? isMilestoneDay(selectedCampaignDay) : false

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Takvim</h1>
        </div>
        <div className="chip font-mono">GÜN {today}</div>
      </div>

      <div className="card p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white capitalize">{monthLabel}</h2>
            {!isCurrentMonth && (
              <button onClick={goToday} className="text-[10px] text-brand-red hover:underline mt-0.5">Bugüne dön</button>
            )}
          </div>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center text-[10px] font-bold text-slate-400 tracking-wider py-1">{w}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((calDay, i) => {
            if (calDay === null) return <div key={`e${i}`} className="aspect-square" />

            const campaignDay = getCampaignDay(calDay)
            const isFuture = campaignDay > today
            const isPast = campaignDay < today && campaignDay > 0
            const isToday = isCurrentMonth && calDay === todayDate.getDate()
            const isMilestone = campaignDay > 0 && isMilestoneDay(campaignDay)
            const plan = campaignDay > 0 ? getDayPlan(campaignDay) : null
            const isSelected = selectedDay === calDay
            const isBeforeCampaign = campaignDay <= 0

            return (
              <button
                key={calDay}
                onClick={() => setSelectedDay(isSelected ? null : calDay)}
                disabled={isBeforeCampaign}
                className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center gap-0.5 transition-all relative ${
                  isSelected
                    ? 'bg-brand-red text-white shadow-lg scale-105 ring-2 ring-brand-red/30'
                    : isToday
                      ? 'bg-brand-red/10 border-2 border-brand-red text-brand-red'
                      : isMilestone
                        ? 'bg-brand-gold/10 border border-brand-gold/30 text-brand-gold'
                        : isBeforeCampaign
                          ? 'text-slate-200 dark:text-white/[0.1] cursor-default'
                          : isPast
                            ? 'bg-slate-50 dark:bg-white/[0.02] text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}
              >
                {/* Calendar date */}
                <span className={`text-xs font-medium ${isSelected ? 'text-white/70' : ''}`}>{calDay}</span>

                {/* Campaign day number */}
                {!isBeforeCampaign && (
                  <span className={`text-[9px] font-mono font-bold leading-none ${
                    isSelected ? 'text-white' : isToday ? 'text-brand-red' : isMilestone ? 'text-brand-gold' : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {campaignDay}
                  </span>
                )}

                {/* Theme emoji */}
                {plan && !isBeforeCampaign && (
                  <span className="text-[10px] leading-none">{plan.emoji}</span>
                )}

                {/* Today dot */}
                {isToday && !isSelected && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-red" />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <div className="w-3 h-3 rounded bg-brand-red/10 border-2 border-brand-red" />
            <span>Bugün</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <div className="w-3 h-3 rounded bg-brand-gold/10 border border-brand-gold/30" />
            <span>Milestone</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <div className="w-3 h-3 rounded bg-slate-50 dark:bg-white/[0.04]" />
            <span>Geçmiş</span>
          </div>
        </div>
      </div>

      {/* Selected day detail card */}
      {selectedDay && selectedPlan && selectedCampaignDay && selectedCampaignDay > 0 && (
        <div className={`card overflow-hidden animate-fade-in ${
          selectedMilestone ? 'border-l-4 border-l-brand-gold' : 'border-l-4 border-l-brand-red'
        }`}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{selectedPlan.emoji}</span>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{selectedPlan.theme}</h3>
                  {selectedMilestone && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-brand-gold/10 text-brand-gold border border-brand-gold/20 font-bold">MILESTONE</span>
                  )}
                  {selectedCampaignDay === today && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-brand-red/10 text-brand-red border border-brand-red/20 font-bold">BUGÜN</span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {selectedDate?.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold font-mono ${selectedCampaignDay === today ? 'text-brand-red' : selectedMilestone ? 'text-brand-gold' : 'text-slate-700 dark:text-slate-300'}`}>
                  {selectedCampaignDay}
                </div>
                <div className="text-[9px] text-slate-400 tracking-widest font-bold">GÜN</div>
              </div>
            </div>

            {/* Scene */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">SAHNE</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedPlan.scene} — altın eleman: {selectedPlan.goldenElement}</p>
            </div>

            {/* Quote */}
            {selectedPlan.quote && (
              <div className="mb-4 p-4 rounded-xl bg-brand-red/5 border-l-4 border-l-brand-red">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-[10px] font-bold text-brand-red tracking-wider">SÖZ</div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-brand-red/10 text-brand-red/70 font-medium">{selectedPlan.quote.category}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">
                  &ldquo;{selectedPlan.quote.text}&rdquo;
                </p>
                <div className="text-[10px] text-slate-400 mt-2">— Ekrem İmamoğlu</div>
              </div>
            )}

            {/* Tweet template */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-bold text-slate-400 tracking-wider">TWEET</div>
                <CopyBtn text={selectedPlan.tweetTemplate} label="Kopyala" />
              </div>
              <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed border border-slate-100 dark:border-white/[0.06]">
                {selectedPlan.tweetTemplate}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-bold text-slate-400 tracking-wider">NANO BANANA PRO PROMPT</div>
                <CopyBtn text={selectedPlan.prompt} label="Kopyala" />
              </div>
              <details className="group">
                <summary className="text-[10px] text-blue-500 cursor-pointer hover:text-blue-600">Prompt'u göster</summary>
                <div className="mt-2 bg-slate-50 dark:bg-white/[0.03] rounded-xl p-3 text-[11px] font-mono text-slate-400 leading-relaxed border border-slate-100 dark:border-white/[0.06]">
                  {selectedPlan.prompt}
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
