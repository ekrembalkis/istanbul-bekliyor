import { flushSync } from 'react-dom'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'ib-theme'

function safeGet(): ThemeChoice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : null
  } catch {
    return null
  }
}
function safeSet(v: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, v)
  } catch {
    /* private mode */
  }
}

const mq = () =>
  typeof window === 'undefined'
    ? null
    : window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme(): ThemeChoice {
  return safeGet() ?? 'system'
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === 'system') return mq()?.matches ? 'dark' : 'light'
  return choice
}

export function setTheme(choice: ThemeChoice): ResolvedTheme {
  const resolved = resolveTheme(choice)
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.dataset.themeChoice = choice
  safeSet(choice)
  return resolved
}

export function toggleTheme(): ThemeChoice {
  const order: ThemeChoice[] = ['light', 'system', 'dark']
  const current = getTheme()
  const next = order[(order.indexOf(current) + 1) % order.length]
  setTheme(next)
  return next
}

export function watchSystem(onChange: (resolved: ResolvedTheme) => void): () => void {
  const m = mq()
  if (!m) return () => {}
  const handler = () => {
    if (getTheme() === 'system') {
      const next = m.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', next)
      onChange(next)
    }
  }
  m.addEventListener('change', handler)
  return () => m.removeEventListener('change', handler)
}

/** Call on app startup to apply stored choice. */
export function initTheme() {
  setTheme(getTheme())
}

interface RevealOrigin {
  x: number
  y: number
}

/**
 * View Transitions API circular reveal from origin coordinates.
 * Falls back to instant swap on unsupported browsers / reduced motion.
 */
export function applyThemeWithTransition(
  next: ThemeChoice,
  origin: RevealOrigin,
  reactStateUpdate: () => void,
): void {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = document.startViewTransition

  if (!start || reduced) {
    reactStateUpdate()
    setTheme(next)
    return
  }

  const w = window.innerWidth
  const h = window.innerHeight
  const radius = Math.hypot(
    Math.max(origin.x, w - origin.x),
    Math.max(origin.y, h - origin.y),
  )
  const root = document.documentElement
  root.style.setProperty('--vt-x', `${origin.x}px`)
  root.style.setProperty('--vt-y', `${origin.y}px`)
  root.style.setProperty('--vt-r', `${radius}px`)

  start.call(document, () => {
    flushSync(() => {
      reactStateUpdate()
    })
    setTheme(next)
  })
}
