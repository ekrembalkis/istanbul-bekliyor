// Serverless NBP image generator with İmamoğlu reference images
// POST /api/generate-image { dayNumber, theme, scene, goldenElement, quote }

import { loadReferences, buildReferenceParts } from './lib/referenceLoader.js'

const CHARACTER_DNA = `Middle-aged Turkish man with rectangular semi-rimless silver glasses, short dark hair with subtle gray at temples, clean-shaven, determined jawline, confident but warm expression. Wearing dark navy pinstripe suit over light blue dress shirt (no tie, open collar). Athletic-medium build. Dignified posture, hands often in pockets or clasped.`

// Map quote categories to visual emotion cues
const CATEGORY_EMOTIONS = {
  'Umut': 'hopeful, looking toward light, serene determination',
  'Demokrasi': 'dignified strength, standing tall among people, commanding presence',
  'Adalet': 'quiet defiance, unwavering resolve, intense focused gaze',
  'Direniş': 'bold resilience, wind in clothes, unshaken stance',
  'İstanbul': 'deep connection to the city, contemplative, overlooking the skyline',
  'Değerler': 'humble warmth, approachable, genuine expression',
  'Birlik': 'open arms, inclusive gesture, surrounded by implied community',
  'Cumhuriyet': 'patriotic solemnity, standing before national symbols',
  'Silivri': 'confined but unbroken, light falling on face through narrow opening',
  'Savunma': 'resolute speaker, powerful stance, courtroom gravitas',
}

function buildPrompt({ dayNumber, theme, scene, goldenElement, quote }) {
  const emotion = CATEGORY_EMOTIONS[quote?.category] || 'quiet strength, determined gaze'

  return `CHARACTER IDENTITY (maintain exact likeness from reference images):
${CHARACTER_DNA}

SCENE: ${scene}. The character is present in the scene — ${theme.toLowerCase()} theme.
EMOTION & POSE: ${emotion}
QUOTE CONTEXT: "${quote?.text || ''}" — the visual should evoke this sentiment.

GOLDEN ELEMENT: ${goldenElement} rendered in warm amber gold (#D4A843). This is the ONLY color in the image.
Everything else is in stark black and white with deep blacks and charcoal grays. High contrast.

Bold clean text reading "GUN ${dayNumber}" in large uppercase sans-serif font at the top of the frame.
Brutalist minimalist editorial photography. Cinematic lighting.
1:1 aspect ratio at 2K resolution.

CRITICAL RULES:
- The character must match the reference images EXACTLY — same face, glasses, build
- Only ONE element is golden (#D4A843), everything else is grayscale
- No other text besides "GUN ${dayNumber}"
- Photorealistic editorial style, NOT illustration or cartoon`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim()
  const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
  const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta'
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const { dayNumber, theme, scene, goldenElement, quote, customPrompt } = req.body

  if (!dayNumber || !theme || !scene) {
    return res.status(400).json({ error: 'dayNumber, theme, and scene are required' })
  }

  try {
    // 1. Load reference images (cached in memory across warm invocations)
    const references = await loadReferences()

    // 2. Build parts array: references + prompt
    const parts = []

    if (references.length > 0) {
      parts.push(...buildReferenceParts(references))
    }

    // 3. Add the generation prompt
    const prompt = customPrompt || buildPrompt({ dayNumber, theme, scene, goldenElement, quote })
    parts.push({ text: prompt })

    // 4. Call Gemini image generation
    const geminiRes = await fetch(
      `${GEMINI_BASE_URL}/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 1,
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      return res.status(500).json({
        error: 'Gemini image generation failed',
        detail: err.error?.message,
      })
    }

    const geminiData = await geminiRes.json()

    // 5. Extract image from response
    let imageBase64 = null
    let imageMimeType = 'image/png'
    let responseText = ''

    const responseParts = geminiData.candidates?.[0]?.content?.parts || []
    for (const part of responseParts) {
      if (part.inlineData?.data) {
        imageBase64 = part.inlineData.data
        imageMimeType = part.inlineData.mimeType || 'image/png'
      }
      if (part.text) {
        responseText += part.text
      }
    }

    if (!imageBase64) {
      return res.status(500).json({
        error: 'No image generated',
        detail: responseText || 'Gemini returned no image data',
        geminiUsage: {
          promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
          completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
          calls: 1,
        },
      })
    }

    // 6. Track usage
    const geminiUsage = {
      promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
      completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
      calls: 1,
    }

    // 7. Upload to Supabase Storage (if configured)
    let imageUrl = null
    const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim()
    const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim()

    if (supabaseUrl && supabaseKey) {
      const fileName = `images/day-${dayNumber}-${Date.now()}.png`
      const imageBuffer = Buffer.from(imageBase64, 'base64')

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/campaign-assets/${fileName}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': imageMimeType,
            'x-upsert': 'true',
          },
          body: imageBuffer,
        }
      )

      if (uploadRes.ok) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/campaign-assets/${fileName}`
      }
    }

    return res.status(200).json({
      imageBase64,
      imageMimeType,
      imageUrl,
      prompt,
      dayNumber,
      theme,
      refsUsed: references.length,
      geminiUsage,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Image generation failed', detail: error.message })
  }
}
