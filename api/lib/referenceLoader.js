// Reference image loader with module-level memory cache
// Fetches İmamoğlu reference photos from Supabase Storage, converts to base64, caches in memory

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const BUCKET = 'campaign-assets'
const REF_PREFIX = 'references'

// Reference image definitions — labels help Gemini understand each angle
const REFERENCE_IMAGES = [
  { file: 'ref-front.jpg', label: 'Front-facing portrait, direct eye contact, light blue shirt, dark navy suit' },
  { file: 'ref-3q-right.jpg', label: '3/4 right angle, semi-rimless glasses, serious expression' },
  { file: 'ref-3q-left.webp', label: '3/4 left angle, speaking at podium, dark suit' },
  { file: 'ref-full.jpg', label: 'Full body standing pose, dark navy pinstripe suit, light blue shirt, confident posture' },
]

// Module-level cache — survives across warm invocations on Vercel
const cache = new Map()
let cacheTimestamp = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

async function fetchAsBase64(url) {
  const res = await fetch(url, {
    headers: SUPABASE_KEY ? { Authorization: `Bearer ${SUPABASE_KEY}` } : {},
  })
  if (!res.ok) {
    console.warn(`Failed to fetch reference: ${url} (${res.status})`)
    return null
  }
  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return { data: base64, mimeType: contentType }
}

export async function loadReferences() {
  // Return from cache if still fresh
  if (cache.size > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return [...cache.values()]
  }

  if (!SUPABASE_URL) {
    console.warn('SUPABASE_URL not configured — skipping reference images')
    return []
  }

  const results = []

  // Fetch all references in parallel
  const fetches = REFERENCE_IMAGES.map(async (ref) => {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${REF_PREFIX}/${ref.file}`
    const imageData = await fetchAsBase64(url)
    if (imageData) {
      const entry = { label: ref.label, file: ref.file, ...imageData }
      cache.set(ref.file, entry)
      return entry
    }
    return null
  })

  const loaded = await Promise.all(fetches)
  for (const entry of loaded) {
    if (entry) results.push(entry)
  }

  if (results.length > 0) {
    cacheTimestamp = Date.now()
  }

  return results
}

// Build the parts array section for reference images
export function buildReferenceParts(references) {
  const parts = []
  references.forEach((ref, i) => {
    parts.push({ text: `Reference image ${i + 1} (${ref.label}):` })
    parts.push({ inlineData: { data: ref.data, mimeType: ref.mimeType } })
  })
  return parts
}
