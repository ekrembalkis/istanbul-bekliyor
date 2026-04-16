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

const STORAGE_KEY = 'istanbul-bekliyor-instagram-preview-v2'

function buildPlaceholder(num: number): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440">
      <rect width="1080" height="1440" fill="#0a0a0a"/>
      <text x="540" y="800" text-anchor="middle" fill="rgba(255,255,255,0.06)" font-size="500" font-family="sans-serif" font-weight="900">${num}</text>
    </svg>
  `.trim()
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}


export const SAMPLE_ASSETS: PreviewAsset[] = [
  {
    id: crypto.randomUUID(),
    title: 'Meydan posteri',
    kind: 'post',
    dataUrl: buildPlaceholder(1),
    sourceRatio: 1,
    focalX: 50,
    focalY: 50,
    note: 'Kare post. Profil gridde yanlardan kırpılır.',
    accent: '#E30A17',
    highlight: false,
  },
  {
    id: crypto.randomUUID(),
    title: 'Sessiz yürüyüş',
    kind: 'post',
    dataUrl: buildPlaceholder(2),
    sourceRatio: 4 / 5,
    focalX: 55,
    focalY: 46,
    note: 'Dikey post. Gridde daha güvenli.',
    accent: '#D4A843',
    highlight: true,
  },
  {
    id: crypto.randomUUID(),
    title: 'Reel cover',
    kind: 'reel',
    dataUrl: buildPlaceholder(3),
    sourceRatio: 9 / 16,
    focalX: 50,
    focalY: 38,
    note: 'Reels sekmesinde tam boy, profil gridde merkez 3:4 alanı.',
    accent: '#F97316',
    highlight: true,
  },
  {
    id: crypto.randomUUID(),
    title: 'Akşam karesi',
    kind: 'post',
    dataUrl: buildPlaceholder(4),
    sourceRatio: 3 / 4,
    focalX: 50,
    focalY: 52,
    note: '3:4, yeni grid davranışına en yakın güvenli görünüm.',
    accent: '#22C55E',
    highlight: false,
  },
  {
    id: crypto.randomUUID(),
    title: 'Reel teaser',
    kind: 'reel',
    dataUrl: buildPlaceholder(5),
    sourceRatio: 9 / 16,
    focalX: 48,
    focalY: 42,
    note: 'Kapak metni orta bantta tutulmalı.',
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
      .filter((a): a is PreviewAsset => a !== null && a.dataUrl.length > 0)

    return safe.length > 0 ? safe : SAMPLE_ASSETS
  } catch (err) {
    console.error('Failed to load preview assets:', err)
    return SAMPLE_ASSETS
  }
}

export function savePreviewAssets(assets: PreviewAsset[]) {
  if (typeof window === 'undefined') return
  // Save metadata only — strip large dataUrl for uploaded images to avoid localStorage quota
  const slim = assets.map(a => ({
    ...a,
    dataUrl: a.dataUrl.startsWith('data:image/svg') ? a.dataUrl : '', // keep SVG placeholders, drop uploaded images
  }))
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {
    // Quota exceeded — clear old data and retry with metadata only
    try {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
    } catch { /* storage full, skip persist */ }
  }
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
    note: 'Yüklenen temsil görseli.',
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
  if (surface === 'profile') return '3 kolonlu profil grid. Dikey thumbnail crop davranışı.'
  if (surface === 'reels') return 'Reels sekmesi. 9:16 kapaklar tam boy gözükür.'
  return 'Kişisel Explore birebir kopyalanamaz. Bu yüzey gerçekçi bir simülasyondur.'
}
