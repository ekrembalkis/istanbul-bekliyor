export type Theme = 'light' | 'dark'

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return (localStorage.getItem('ib-theme') as Theme) || 'light'
}

export function setTheme(theme: Theme) {
  localStorage.setItem('ib-theme', theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'light' ? 'dark' : 'light'
  setTheme(next)
  return next
}

/** Call on app startup to apply saved theme */
export function initTheme() {
  setTheme(getTheme())
}
