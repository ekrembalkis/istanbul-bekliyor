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

export default function Sidebar() {
  const day = getDayCount()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="flex h-full flex-col justify-between py-4">
      {/* Logo */}
      <div>
        <NavLink to="/" className="flex items-center gap-3 p-3 hover:bg-[rgba(227,10,23,0.15)] transition-colors">
          <img src="/logo.png" alt="İstanbul Bekliyor" className="w-8 h-8 flex-shrink-0" />
          <span className="font-display text-sm tracking-[4px] text-[#EBEBEB] hidden lg:block uppercase">İSTANBUL<br/>BEKLİYOR</span>
        </NavLink>

        {/* Nav Items */}
        <nav className="mt-4 space-y-0.5">
          {mainNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-4 px-3 py-3 transition-colors font-mono text-xs tracking-[2px] ${
                  isActive
                    ? 'font-bold text-[#E30A17] border-l-3 border-[#E30A17] bg-[rgba(227,10,23,0.1)]'
                    : 'text-[rgba(235,235,235,0.5)] hover:text-[#EBEBEB] hover:bg-[rgba(227,10,23,0.08)] border-l-3 border-transparent'
                }`
              }
            >
              <svg className="w-[22px] h-[22px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                {item.icon}
              </svg>
              <span className="hidden lg:block">{item.label}</span>
            </NavLink>
          ))}

          {/* Daha Fazla */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(o => !o)}
              className="flex w-full items-center gap-4 px-3 py-3 text-[rgba(235,235,235,0.5)] hover:text-[#EBEBEB] hover:bg-[rgba(227,10,23,0.08)] transition-colors font-mono text-xs tracking-[2px] border-l-3 border-transparent"
            >
              <svg className="w-[22px] h-[22px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span className="hidden lg:block">DAHA FAZLA</span>
            </button>
            {moreOpen && <MoreMenu onClose={() => setMoreOpen(false)} />}
          </div>
        </nav>

        {/* Üret CTA */}
        <NavLink
          to="/style"
          className="mt-6 flex items-center justify-center gap-2 bg-[#E30A17] text-white font-mono text-xs tracking-[3px] uppercase py-3 border-3 border-[#EBEBEB] transition-all hover:bg-[#B80813] w-[52px] h-[52px] lg:w-full lg:h-auto lg:px-4 box-border"
          style={{ boxShadow: '3px 3px 0 rgba(235,235,235,0.3)' }}
        >
          <svg className="w-6 h-6 lg:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="hidden lg:block font-bold">ÜRET</span>
        </NavLink>
      </div>

      {/* Profile */}
      <div className="p-3 hover:bg-[rgba(227,10,23,0.08)] transition-colors cursor-pointer border-t border-[rgba(235,235,235,0.1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E30A17] flex items-center justify-center flex-shrink-0 border-2 border-[#EBEBEB]">
            <svg width="16" height="16" viewBox="0 0 60 60" fill="none">
              <path d="M15 8 L45 8 L45 12 L33 28 L33 32 L45 48 L45 52 L15 52 L15 48 L27 32 L27 28 L15 12 Z" fill="white" />
            </svg>
          </div>
          <div className="hidden lg:block min-w-0">
            <div className="font-mono text-[11px] font-bold text-[#EBEBEB] tracking-[2px] truncate">İSTANBUL BEKLİYOR</div>
            <div className="font-mono text-[10px] text-[rgba(235,235,235,0.4)] tracking-[1px]">@istbekliyor · GÜN {day}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
