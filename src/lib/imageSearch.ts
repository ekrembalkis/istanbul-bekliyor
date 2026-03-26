export interface SearchImage {
  id: string
  url: string
  thumbnail: string
  title: string
  source: string
  width: number
  height: number
}

export async function searchImages(query: string, count = 10): Promise<SearchImage[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const params = new URLSearchParams({ q, num: String(count) })
  const res = await fetch(`/api/serpapi?${params}`)

  if (!res.ok) return []

  const data = await res.json()
  if (!data.images_results?.length) return []

  return data.images_results.map((img: any, i: number) => ({
    id: `serp-${Date.now()}-${i}`,
    url: img.original,
    thumbnail: img.thumbnail,
    title: img.title || q,
    source: img.source || 'Google Images',
    width: img.original_width || 0,
    height: img.original_height || 0,
  }))
}
