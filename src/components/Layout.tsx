import { NavLink, Outlet } from 'react-router-dom'
import { getDayCount } from '../lib/utils'

const navItems = [
  { to: '/', label: 'Panel', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/planner', label: 'Planla', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { to: '/check', label: 'Kontrol', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { to: '/calendar', label: 'Takvim', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/archive', label: 'Arşiv', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { to: '/algorithm', label: 'Algoritma', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { to: '/settings', label: 'Ayarlar', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

export default function Layout() {
  const day = getDayCount()

  return (
    <div className="min-h-screen flex">
      {/* Glass Sidebar */}
      <aside className="w-56 glass-sidebar flex flex-col flex-shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shadow-lg shadow-brand-red/20">
              <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
                <path d="M15 8 L45 8 L45 12 L33 28 L33 32 L45 48 L45 52 L15 52 L15 48 L27 32 L27 28 L15 12 Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold leading-tight tracking-wide">İSTANBUL</div>
              <div className="text-xs text-brand-gold font-semibold tracking-wider">BEKLİYOR</div>
            </div>
          </div>
          {/* Day counter with gradient border */}
          <div className="mt-4 text-center border-gradient rounded-xl py-3 bg-brand-red/5">
            <span className="font-mono text-3xl font-black gradient-text">{day}</span>
            <span className="text-[10px] text-white/25 ml-1.5 tracking-[3px]">GÜN</span>
          </div>
        </div>

        <div className="gradient-divider" />

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.06] text-white border-l-2 border-brand-red shadow-glass'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`
              }
            >
              <NavIcon d={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="gradient-divider" />

        {/* Footer */}
        <div className="p-4 space-y-2">
          <div className="text-[10px] text-white/15 font-mono text-center">@istbekliyor</div>
          <div className="text-[10px] text-white/10 text-center">19 Mart 2025'ten beri</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 max-w-5xl overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
