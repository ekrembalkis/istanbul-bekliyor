// NBP image generation service — calls /api/generate-image with reference images
import { trackGeminiUsage } from './costTracker'
import type { GeminiUsage } from './costTracker'
import type { Quote } from '../data/quotes'

export interface ImageGenRequest {
  dayNumber: number
  theme: string
  scene: string
  goldenElement: string
  quote: Quote
  customPrompt?: string
}

export interface ImageGenResponse {
  imageBase64: string
  imageMimeType: string
  imageUrl: string | null
  prompt: string
  dayNumber: number
  theme: string
  refsUsed: number
  geminiUsage: GeminiUsage
}

export async function generateDailyImage(req: ImageGenRequest): Promise<ImageGenResponse> {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Görsel üretimi başarısız')
  }

  const data: ImageGenResponse = await res.json()

  if (data.geminiUsage) {
    trackGeminiUsage(data.geminiUsage)
  }

  return data
}
