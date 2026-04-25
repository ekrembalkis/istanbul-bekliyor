import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getDayCount } from '../lib/utils'
import {
  applyThemeWithTransition,
  getTheme,
  watchSystem,
  type ThemeChoice,
} from '../lib/themeToggle'
import MoreMenu from './MoreMenu'

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Aydınlık tema' },
  { value: 'system', label: 'Sistem teması' },
  { value: 'dark', label: 'Karanlık tema' },
]

function ThemeIcon({ value }: { value: ThemeChoice }) {
  if (value === 'light') {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="12" y1="2.5" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="21.5" />
          <line x1="2.5" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="21.5" y2="12" />
          <line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
          <line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
          <line x1="5.2" y1="18.8" x2="6.9" y2="17.1" />
          <line x1="17.1" y1="6.9" x2="18.8" y2="5.2" />
        </g>
      </svg>
    )
  }
  if (value === 'dark') {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
        <path
          d="M20.5 14.5A8 8 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="16.5" x2="12" y2="20" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ThemeSegmentedControl() {
  const [choice, setChoice] = useState<ThemeChoice>(() =>
    typeof window === 'undefined' ? 'system' : getTheme(),
  )
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    return watchSystem(() => {})
  }, [])

  const select = (next: ThemeChoice, el: HTMLElement) => {
    if (next === choice) return
    const r = el.getBoundingClientRect()
    applyThemeWithTransition(
      next,
      { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      () => setChoice(next),
    )
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = THEME_OPTIONS.findIndex(o => o.value === choice)
    let nextIdx = -1
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIdx = (idx + 1) % THEME_OPTIONS.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIdx = (idx - 1 + THEME_OPTIONS.length) % THEME_OPTIONS.length
        break
      case 'Home':
        nextIdx = 0
        break
      case 'End':
        nextIdx = THEME_OPTIONS.length - 1
        break
      default:
        return
    }
    e.preventDefault()
    const target = buttonRefs.current[nextIdx]
    if (target) {
      target.focus()
      select(THEME_OPTIONS[nextIdx].value, target)
    }
  }

  return (
    <div
      className="theme-seg shrink-0"
      role="radiogroup"
      aria-label="Tema seçimi"
      onKeyDown={onKeyDown}
    >
      {THEME_OPTIONS.map((opt, i) => {
        const active = choice === opt.value
        return (
          <button
            key={opt.value}
            ref={el => {
              buttonRefs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            tabIndex={active ? 0 : -1}
            onClick={e => select(opt.value, e.currentTarget)}
          >
            <ThemeIcon value={opt.value} />
          </button>
        )
      })}
    </div>
  )
}

const mainNav = [
  {
    to: '/', label: 'PANEL', end: true,
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
  },
  {
    to: '/planner', label: 'PLANLA',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />,
  },
  {
    to: '/calendar', label: 'TAKVİM',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />,
  },
  {
    to: '/archive', label: 'ARŞİV',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />,
  },
]

export default function TopNavbar() {
  const day = getDayCount()
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[rgba(241,236,228,0.08)] relative">
      {/* Editorial mast accent — small red block at far left */}
      <div className="absolute left-0 bottom-[-1px] h-[3px] w-24 bg-[#e22b35]" aria-hidden="true" />
      <div className="max-w-[1280px] mx-auto px-4 lg:px-6">
        <div className="flex items-center h-16 gap-2">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 px-2 py-1 hover:bg-[rgba(226,43,53,0.12)] transition-colors shrink-0">
            <img src="/logo.png" alt="İstanbul Bekliyor" className="w-7 h-7" />
            <span className="font-mono text-[11px] tracking-[0.22em] text-[#f1ece4] uppercase hidden sm:block">
              <span className="font-semibold">İSTANBUL</span>
              <span className="text-[rgba(241,236,228,0.5)]"> · BEKLİYOR</span>
            </span>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5 ml-6">
            {mainNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 transition-colors font-mono text-[10px] tracking-[0.22em] ${
                    isActive
                      ? 'font-medium text-[#e22b35] border-b border-[#e22b35]'
                      : 'text-[rgba(241,236,228,0.5)] hover:text-[#f1ece4] border-b border-transparent'
                  }`
                }
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Daha Fazla */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 text-[rgba(241,236,228,0.5)] hover:text-[#f1ece4] transition-colors font-mono text-[10px] tracking-[0.22em] border-b border-transparent"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                <span>DAHA FAZLA</span>
              </button>
              {moreOpen && <MoreMenu onClose={() => setMoreOpen(false)} />}
            </div>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ÜRET CTA */}
          <NavLink
            to="/style"
            className="flex items-center gap-2 bg-[#e22b35] text-white font-mono text-[10px] tracking-[0.22em] uppercase px-4 py-2 rounded-full border border-[#e22b35] transition-colors hover:bg-[#b81c25] hover:border-[#b81c25] shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="hidden sm:block font-medium">ÜRET</span>
          </NavLink>

          {/* Theme segmented control (light / system / dark) */}
          <ThemeSegmentedControl />

          {/* Day counter pill — editorial */}
          <div className="hidden md:flex items-center gap-2 pl-3 pr-3 py-1.5 rounded-full border border-[rgba(241,236,228,0.12)] bg-[rgba(226,43,53,0.08)] shrink-0">
            <span className="live-dot shrink-0" />
            <span className="font-display italic text-[#e22b35] text-[18px] leading-none tabular-nums">{day}</span>
            <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(241,236,228,0.55)]">GÜN</span>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            className="md:hidden flex items-center justify-center w-10 h-10 text-[#f1ece4] hover:bg-[rgba(226,43,53,0.12)] transition-colors rounded-full"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-[rgba(241,236,228,0.08)] bg-[#0a0a0a]" role="navigation" aria-label="Mobil menü">
          <nav className="px-4 py-3 space-y-1">
            {mainNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[0.22em] transition-colors ${
                    isActive
                      ? 'font-medium text-[#e22b35] bg-[rgba(226,43,53,0.08)]'
                      : 'text-[rgba(241,236,228,0.55)] hover:text-[#f1ece4]'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </NavLink>
            ))}
            {/* Extra mobile links */}
            {[
              { to: '/haberler', label: 'HABERLER' },
              { to: '/shadow-check', label: 'SHADOW BAN' },
              { to: '/check', label: 'ALGO KONTROL' },
              { to: '/settings', label: 'AYARLAR' },
            ].map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[0.22em] transition-colors ${
                    isActive
                      ? 'font-medium text-[#e22b35] bg-[rgba(226,43,53,0.08)]'
                      : 'text-[rgba(241,236,228,0.55)] hover:text-[#f1ece4]'
                  }`
                }
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          {/* Mobile profile */}
          <div className="px-4 py-3 border-t border-[rgba(241,236,228,0.08)] flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(241,236,228,0.12)] bg-[rgba(226,43,53,0.08)]">
              <span className="live-dot" />
              <span className="font-display italic text-[#e22b35] text-[16px] leading-none tabular-nums">{day}</span>
              <span className="font-mono text-[9px] tracking-[0.28em] text-[rgba(241,236,228,0.55)]">GÜN</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.22em] text-[rgba(241,236,228,0.55)]">@istbekliyor</span>
          </div>
        </div>
      )}
    </header>
  )
}
