export type PreviewSurface = 'profile' | 'reels' | 'explore'
export type PreviewMediaKind = 'post' | 'reel'

export interface PreviewAsset {
  id: string
  title: string
  kind: PreviewMediaKind
  dataUrl: string
  sourceRatio: number
  focalX: number
  focalY: number
  note: string
  accent: string
  highlight: boolean
}

const STORAGE_KEY = 'istanbul-bekliyor-instagram-preview-v1'

function buildPlaceholder(title: string, accent: string, subtitle: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
        <linearGradient id="wash" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1200" rx="80" fill="url(#bg)" />
      <circle cx="950" cy="220" r="210" fill="url(#wash)" opacity="0.55" />
      <circle cx="300" cy="950" r="240" fill="${accent}" opacity="0.22" />
      <rect x="96" y="96" width="1008" height="1008" rx="48" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="8" />
      <text x="110" y="190" fill="white" font-size="60" font-family="Georgia, serif" font-weight="700">${escapeXml(title)}</text>
      <text x="110" y="280" fill="${accent}" font-size="28" font-family="'Courier New', monospace" letter-spacing="8">${escapeXml(subtitle)}</text>
      <text x="110" y="960" fill="rgba(255,255,255,0.78)" font-size="42" font-family="'Courier New', monospace">GRID / REELS / EXPLORE</text>
      <text x="110" y="1025" fill="rgba(255,255,255,0.45)" font-size="28" font-family="'Courier New', monospace">Placeholder for representative upload</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export const SAMPLE_ASSETS: PreviewAsset[] = [
  {
    id: crypto.randomUUID(),
    title: 'Meydan posteri',
    kind: 'post',
    dataUrl: buildPlaceholder('Meydan posteri', '#E30A17', 'POST / 1:1'),
    sourceRatio: 1,
    focalX: 50,
    focalY: 50,
    note: 'Kare post. Profil gridde yanlardan kirpilir.',
    accent: '#E30A17',
    highlight: false,
  },
  {
    id: crypto.randomUUID(),
    title: 'Sessiz yuruyus',
    kind: 'post',
    dataUrl: buildPlaceholder('Sessiz yuruyus', '#D4A843', 'POST / 4:5'),
    sourceRatio: 4 / 5,
    focalX: 55,
    focalY: 46,
    note: 'Dikey post. Gridde daha guvenli.',
    accent: '#D4A843',
    highlight: true,
  },
  {
    id: crypto.randomUUID(),
    title: 'Reel cover',
    kind: 'reel',
    dataUrl: buildPlaceholder('Reel cover', '#F97316', 'REEL / 9:16'),
    sourceRatio: 9 / 16,
    focalX: 50,
    focalY: 38,
    note: 'Reels sekmesinde tam boy, profil gridde merkez 3:4 alani.',
    accent: '#F97316',
    highlight: true,
  },
  {
    id: crypto.randomUUID(),
    title: 'Aksam karesi',
    kind: 'post',
    dataUrl: buildPlaceholder('Aksam karesi', '#22C55E', 'POST / 3:4'),
    sourceRatio: 3 / 4,
    focalX: 50,
    focalY: 52,
    note: '3:4, yeni grid davranisina en yakin guvenli gorunum.',
    accent: '#22C55E',
    highlight: false,
  },
  {
    id: crypto.randomUUID(),
    title: 'Reel teaser',
    kind: 'reel',
    dataUrl: buildPlaceholder('Reel teaser', '#38BDF8', 'REEL / 9:16'),
    sourceRatio: 9 / 16,
    focalX: 48,
    focalY: 42,
    note: 'Kapak metni orta bantta tutulmali.',
    accent: '#38BDF8',
    highlight: false,
  },
]

export function loadPreviewAssets(): PreviewAsset[] {
  if (typeof window === 'undefined') return SAMPLE_ASSETS

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return SAMPLE_ASSETS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return SAMPLE_ASSETS

    const safe = parsed
      .filter(value => value && typeof value === 'object')
      .map(value => normalizePreviewAsset(value as Partial<PreviewAsset>))
      .filter(Boolean) as PreviewAsset[]

    return safe.length > 0 ? safe : SAMPLE_ASSETS
  } catch {
    return SAMPLE_ASSETS
  }
}

export function savePreviewAssets(assets: PreviewAsset[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assets))
}

function isPreviewAsset(value: unknown): value is PreviewAsset {
  if (!value || typeof value !== 'object') return false
  const candidate = value as PreviewAsset

  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && (candidate.kind === 'post' || candidate.kind === 'reel')
    && typeof candidate.dataUrl === 'string'
    && typeof candidate.sourceRatio === 'number'
    && typeof candidate.focalX === 'number'
    && typeof candidate.focalY === 'number'
    && typeof candidate.note === 'string'
    && typeof candidate.accent === 'string'
    && typeof candidate.highlight === 'boolean'
}

function normalizePreviewAsset(value: Partial<PreviewAsset>): PreviewAsset | null {
  const candidate = {
    ...value,
    sourceRatio: typeof value.sourceRatio === 'number'
      ? value.sourceRatio
      : value.kind === 'reel'
        ? 9 / 16
        : 4 / 5,
  }

  return isPreviewAsset(candidate) ? candidate : null
}

export function moveAsset(list: PreviewAsset[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [picked] = next.splice(from, 1)
  next.splice(to, 0, picked)
  return next
}

export function duplicateAsset(asset: PreviewAsset): PreviewAsset {
  return {
    ...asset,
    id: crypto.randomUUID(),
    title: `${asset.title} copy`,
  }
}

export function createUploadAsset(fileName: string, dataUrl: string, sourceRatio: number): PreviewAsset {
  return {
    id: crypto.randomUUID(),
    title: fileName.replace(/\.[^.]+$/, ''),
    kind: 'post',
    dataUrl,
    sourceRatio,
    focalX: 50,
    focalY: 50,
    note: 'Yuklenen temsil gorseli.',
    accent: '#E30A17',
    highlight: false,
  }
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function readImageRatio(dataUrl: string) {
  return new Promise<number>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      if (!image.width || !image.height) {
        resolve(1)
        return
      }
      resolve(image.width / image.height)
    }
    image.onerror = () => reject(new Error('Image ratio could not be read'))
    image.src = dataUrl
  })
}

export function getRatioLabel(ratio: number) {
  const pairs = [
    { label: '1:1', value: 1 },
    { label: '4:5', value: 4 / 5 },
    { label: '3:4', value: 3 / 4 },
    { label: '9:16', value: 9 / 16 },
  ]

  const nearest = pairs.reduce((best, item) => {
    return Math.abs(item.value - ratio) < Math.abs(best.value - ratio) ? item : best
  }, pairs[0])

  return nearest.label
}

export function getSurfaceSummary(surface: PreviewSurface) {
  if (surface === 'profile') return '3 kolonlu profil grid. Dikey thumbnail crop davranisi.'
  if (surface === 'reels') return 'Reels sekmesi. 9:16 kapaklar tam boy gozukur.'
  return 'Kisisel Explore birebir kopyalanamaz. Bu yuzey gercekci bir simulasyondur.'
}
