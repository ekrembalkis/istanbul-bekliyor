import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getDayCount } from '../lib/utils'
import MoreMenu from './MoreMenu'

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
    <header className="sticky top-0 z-50 bg-[#0A0A0A] border-b-3 border-[#0A0A0A]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-6">
        <div className="flex items-center h-16 gap-2">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 px-2 py-1 hover:bg-[rgba(227,10,23,0.15)] transition-colors shrink-0">
            <img src="/logo.png" alt="İstanbul Bekliyor" className="w-7 h-7" />
            <span className="font-display text-[11px] tracking-[3px] text-[#EBEBEB] uppercase hidden sm:block">İSTANBUL BEKLİYOR</span>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5 ml-6">
            {mainNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 transition-colors font-mono text-[10px] tracking-[2px] ${
                    isActive
                      ? 'font-bold text-[#E30A17] border-b-2 border-[#E30A17]'
                      : 'text-[rgba(235,235,235,0.5)] hover:text-[#EBEBEB] border-b-2 border-transparent'
                  }`
                }
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  {item.icon}
                </svg>
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Daha Fazla */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 text-[rgba(235,235,235,0.5)] hover:text-[#EBEBEB] transition-colors font-mono text-[10px] tracking-[2px] border-b-2 border-transparent"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
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
            className="flex items-center gap-2 bg-[#E30A17] text-white font-mono text-[10px] tracking-[2px] uppercase px-4 py-2 border-2 border-[#EBEBEB] transition-all hover:bg-[#B80813] shrink-0"
            style={{ boxShadow: '2px 2px 0 rgba(235,235,235,0.3)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="hidden sm:block font-bold">ÜRET</span>
          </NavLink>

          {/* Profile Badge */}
          <div className="hidden md:flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[rgba(227,10,23,0.08)] transition-colors shrink-0">
            <div className="w-8 h-8 bg-[#E30A17] flex items-center justify-center border-2 border-[#EBEBEB]">
              <svg width="12" height="12" viewBox="0 0 60 60" fill="none">
                <path d="M15 8 L45 8 L45 12 L33 28 L33 32 L45 48 L45 52 L15 52 L15 48 L27 32 L27 28 L15 12 Z" fill="white" />
              </svg>
            </div>
            <div className="hidden lg:block">
              <div className="font-mono text-[9px] font-bold text-[#EBEBEB] tracking-[1px]">GÜN {day}</div>
            </div>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden flex items-center justify-center w-10 h-10 text-[#EBEBEB] hover:bg-[rgba(227,10,23,0.15)] transition-colors"
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
        <div className="md:hidden border-t-2 border-[rgba(235,235,235,0.1)] bg-[#0A0A0A]">
          <nav className="px-4 py-3 space-y-1">
            {mainNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[2px] transition-colors ${
                    isActive
                      ? 'font-bold text-[#E30A17] bg-[rgba(227,10,23,0.1)]'
                      : 'text-[rgba(235,235,235,0.5)] hover:text-[#EBEBEB]'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
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
                  `flex items-center gap-3 px-3 py-2.5 font-mono text-xs tracking-[2px] transition-colors ${
                    isActive
                      ? 'font-bold text-[#E30A17] bg-[rgba(227,10,23,0.1)]'
                      : 'text-[rgba(235,235,235,0.5)] hover:text-[#EBEBEB]'
                  }`
                }
              >
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          {/* Mobile profile */}
          <div className="px-4 py-3 border-t border-[rgba(235,235,235,0.1)] flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E30A17] flex items-center justify-center border-2 border-[#EBEBEB]">
              <svg width="12" height="12" viewBox="0 0 60 60" fill="none">
                <path d="M15 8 L45 8 L45 12 L33 28 L33 32 L45 48 L45 52 L15 52 L15 48 L27 32 L27 28 L15 12 Z" fill="white" />
              </svg>
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold text-[#EBEBEB] tracking-[1px]">@istbekliyor</div>
              <div className="font-mono text-[9px] text-[rgba(235,235,235,0.4)]">GÜN {day}</div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
