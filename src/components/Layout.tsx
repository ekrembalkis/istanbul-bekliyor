import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { getDayCount } from '../lib/utils'
import { ThemeToggle } from './ThemeToggle'

const navItems = [
  { to: '/', label: 'Panel' },
  { to: '/planner', label: 'Planla' },
  { to: '/calendar', label: 'Takvim' },
  { to: '/preview', label: 'Onizleme' },
  { to: '/archive', label: 'Arşiv' },
  { to: '/style', label: 'Üret' },
  { to: '/shadow-check', label: 'Shadow Ban' },
  { to: '/settings', label: 'Ayarlar' },
]

export default function Layout() {
  const day = getDayCount()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-dark-bg transition-colors duration-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-dark-card/95 backdrop-blur-sm border-b border-black/[0.06] dark:border-white/[0.06] shadow-nav">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <img src="/logo.png" alt="İstanbul Bekliyor" className="w-9 h-9 rounded-lg shadow-sm group-hover:shadow-md transition-shadow" />
              <span className="text-[15px] font-bold tracking-tight text-slate-800 dark:text-white">İstanbul Bekliyor</span>
            </NavLink>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-brand-red bg-brand-red/[0.06]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/[0.06]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right: Theme Toggle + Day Counter + Mobile Toggle */}
            <div className="flex items-center gap-2.5">
              <ThemeToggle />

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-red/[0.06] border border-brand-red/10">
                <span className="live-dot flex-shrink-0" />
                <span className="font-mono text-sm font-bold text-brand-red">{day}</span>
                <span className="text-[10px] font-semibold text-brand-red/50 tracking-widest">GÜN</span>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {mobileOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                  }
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-dark-card animate-slide-up">
            <div className="px-4 py-3 space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? 'text-brand-red bg-brand-red/[0.06]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-black/[0.04] dark:border-white/[0.04] bg-white dark:bg-dark-card mt-12 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-5 h-5 bg-brand-red rounded flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 60 60" fill="none">
                <path d="M15 8 L45 8 L45 12 L33 28 L33 32 L45 48 L45 52 L15 52 L15 48 L27 32 L27 28 L15 12 Z" fill="white" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>19 Mart 2025'ten beri</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="font-mono">@istbekliyor</span>
            <span>#İstanbulBekliyor</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
