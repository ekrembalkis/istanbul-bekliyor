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
        <div>
          <h1 className="text-2xl font-bold text-[#E7E9EA]">Takvim</h1>
        </div>
        <div className="chip">GUN {today}</div>
      </div>

      <div className="card p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-[rgba(231,233,234,0.1)] flex items-center justify-center text-[#71767B] hover:text-[#E7E9EA] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-bold text-[#E7E9EA] capitalize">{monthLabel}</h2>
            {!isCurrentMonth && (
              <button onClick={goToday} className="text-[10px] text-[#1D9BF0] hover:underline mt-0.5">Bugune don</button>
            )}
          </div>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-[rgba(231,233,234,0.1)] flex items-center justify-center text-[#71767B] hover:text-[#E7E9EA] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center text-[10px] font-bold text-[#71767B] tracking-wider py-1">{w}</div>
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
                    ? 'bg-[#1D9BF0] text-white scale-105 ring-2 ring-[#1D9BF0]/30'
                    : isToday
                      ? 'bg-[#1D9BF0]/10 border-2 border-[#1D9BF0] text-[#1D9BF0]'
                      : isMilestone
                        ? 'bg-brand-gold/10 border border-brand-gold/30 text-brand-gold'
                        : isBeforeCampaign
                          ? 'text-[rgba(231,233,234,0.1)] cursor-default'
                          : isPast
                            ? 'bg-[rgba(231,233,234,0.03)] text-[#71767B] hover:bg-[rgba(231,233,234,0.1)]'
                            : 'text-[#E7E9EA] hover:bg-[rgba(231,233,234,0.06)]'
                }`}
              >
                {/* Calendar date */}
                <span className={`text-xs font-medium ${isSelected ? 'text-white/70' : ''}`}>{calDay}</span>

                {/* Campaign day number */}
                {!isBeforeCampaign && (
                  <span className={`text-[9px] font-bold leading-none ${
                    isSelected ? 'text-white' : isToday ? 'text-[#1D9BF0]' : isMilestone ? 'text-brand-gold' : 'text-[#71767B]'
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
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#1D9BF0]" />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#2F3336]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#71767B]">
            <div className="w-3 h-3 rounded bg-[#1D9BF0]/10 border-2 border-[#1D9BF0]" />
            <span>Bugun</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#71767B]">
            <div className="w-3 h-3 rounded bg-brand-gold/10 border border-brand-gold/30" />
            <span>Milestone</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#71767B]">
            <div className="w-3 h-3 rounded bg-[rgba(231,233,234,0.03)]" />
            <span>Gecmis</span>
          </div>
        </div>
      </div>

      {/* Selected day detail card */}
      {selectedDay && selectedPlan && selectedCampaignDay && selectedCampaignDay > 0 && (
        <div className={`card overflow-hidden animate-fade-in ${
          selectedMilestone ? 'border-l-4 border-l-brand-gold' : 'border-l-4 border-l-[#1D9BF0]'
        }`}>
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{selectedPlan.emoji}</span>
                  <h3 className="text-lg font-bold text-[#E7E9EA]">{selectedPlan.theme}</h3>
                  {selectedMilestone && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-brand-gold/10 text-brand-gold border border-brand-gold/20 font-bold">MILESTONE</span>
                  )}
                  {selectedCampaignDay === today && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#1D9BF0]/10 text-[#1D9BF0] border border-[#1D9BF0]/20 font-bold">BUGUN</span>
                  )}
                </div>
                <div className="text-xs text-[#71767B]">
                  {selectedDate?.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${selectedCampaignDay === today ? 'text-[#1D9BF0]' : selectedMilestone ? 'text-brand-gold' : 'text-[#E7E9EA]'}`}>
                  {selectedCampaignDay}
                </div>
                <div className="text-[9px] text-[#71767B] tracking-widest font-bold">GUN</div>
              </div>
            </div>

            {/* Scene */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-[#71767B] tracking-wider mb-1">SAHNE</div>
              <p className="text-sm text-[#E7E9EA]">{selectedPlan.scene} — altin eleman: {selectedPlan.goldenElement}</p>
            </div>

            {/* Quote */}
            {selectedPlan.quote && (
              <div className="mb-4 p-4 rounded-xl bg-[#1D9BF0]/5 border-l-4 border-l-[#1D9BF0]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-[10px] font-bold text-[#1D9BF0] tracking-wider">SOZ</div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#1D9BF0]/10 text-[#1D9BF0]/70 font-medium">{selectedPlan.quote.category}</span>
                </div>
                <p className="text-sm text-[#E7E9EA] italic leading-relaxed">
                  &ldquo;{selectedPlan.quote.text}&rdquo;
                </p>
                <div className="text-[10px] text-[#71767B] mt-2">— Ekrem Imamoglu</div>
              </div>
            )}

            {/* Tweet template */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-bold text-[#71767B] tracking-wider">TWEET</div>
                <CopyBtn text={selectedPlan.tweetTemplate} label="Kopyala" />
              </div>
              <div className="bg-[rgba(231,233,234,0.03)] rounded-xl p-3 text-sm text-[#E7E9EA] whitespace-pre-line leading-relaxed border border-[#2F3336]">
                {selectedPlan.tweetTemplate}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-bold text-[#71767B] tracking-wider">NANO BANANA PRO PROMPT</div>
                <CopyBtn text={selectedPlan.prompt} label="Kopyala" />
              </div>
              <details className="group">
                <summary className="text-[10px] text-[#1D9BF0] cursor-pointer hover:text-[#1A8CD8]">Prompt'u goster</summary>
                <div className="mt-2 bg-[rgba(231,233,234,0.03)] rounded-xl p-3 text-[11px] text-[#71767B] leading-relaxed border border-[#2F3336]">
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
