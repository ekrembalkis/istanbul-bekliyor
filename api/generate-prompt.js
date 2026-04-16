// Serverless NBP prompt generator: Gemini 2.0 Flash + Campaign Visual DNA
// POST /api/generate-prompt { theme, scene, goldenElement, dayNumber, mode, existingPrompt?, topicContext? }

const SYSTEM_PROMPT = `Sen bir Nano Banana Pro gorsel prompt muhendisisin. Istanbul Bekliyor kampanyasi icin gunluk gorsel promptlari yaziyorsun.

GORSEL FORMUL (ASLA degistirme):
- Minimalist siyah beyaz fotograf
- TEK bir eleman altin/amber renkte (#D4A843)
- "GUN [sayi]" yazisi: buyuk, temiz, sans-serif, karenin ust kisminda
- 1:1 kare format, 2K cozunurluk
- Brutalist, minimalist, editorial estetik
- Derin siyah, koyu gri tonlar, yuksek kontrast
- Negatif alan bol kullan

PROMPT DILI: Ingilizce (Nano Banana Pro Ingilizce anliyor)

PROMPT YAPISI (bu siraya uy):
1. Gorsel tipi ve sahne ("Minimalist photograph of..." veya "Minimalist editorial photograph of...")
2. Sahne detaylari (kompozisyon, perspektif, isik yonu, atmosfer)
3. Siyah beyaz vurgusu ("shot in stark black and white")
4. Altin eleman tanimi (renk kodu #D4A843 dahil, "warm amber gold" ifadesi kullan)
5. Kontrast vurgusu ("Everything else is deep black and charcoal gray")
6. Kamera/lens detayi (35mm, 50mm, 85mm, 135mm veya 200mm — sahneye uygun sec)
7. "Bold clean text reading \\"GUN [sayi]\\" in large uppercase sans-serif font at the top of the frame"
8. Stil: "Brutalist minimalist style" veya "Brutalist minimalist editorial style"
9. "1:1 aspect ratio at 2K resolution"

YASAKLAR:
- Renkli gorsel (altin disinda)
- Keyword listesi (dogal Ingilizce cumleler yaz)
- 600 karakteri gecme
- Insan yuzu veya taninabilir kisi
- Marka/logo
- Emoji veya ozel karakter
- "4k, masterpiece, trending" gibi kalite keyword'leri

GUNDEM BAGLAMI: Eger gundem bilgisi verilmisse, sahneyi o baglamla incelikle iliskilendir ama kampanya gorsel formulunden SAPMA.`

import { setCorsHeaders } from './lib/cors.js'

export default async function handler(req, res) {
  setCorsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim()
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const {
    theme, scene, goldenElement, dayNumber,
    mode = 'generate',
    existingPrompt = '',
    topicContext = '',
  } = req.body

  if (!theme || !scene || !goldenElement || !dayNumber) {
    return res.status(400).json({ error: 'theme, scene, goldenElement, and dayNumber are required' })
  }

  try {
    // Build user prompt based on mode
    let userPrompt
    if (mode === 'refine') {
      userPrompt = `Asagidaki mevcut Nano Banana Pro prompt'u iyilestir. Ayni temayi ve altin elemani koru ama sahne kompozisyonunu, isik yonlendirmesini ve atmosferi daha etkileyici ve sinematik yap.

Mevcut prompt:
"${existingPrompt}"

Tema: ${theme}
Sahne: ${scene}
Altin eleman: ${goldenElement}
Gun numarasi: ${dayNumber}
${topicContext ? `\nGundem baglami: ${topicContext}\n` : ''}
Iyilestirilmis prompt'u yaz. Sadece Ingilizce prompt metnini dondur, baska hicbir sey yazma.`
    } else {
      userPrompt = `Bu tema icin orijinal bir Nano Banana Pro gorsel prompt'u yaz.

Tema: ${theme}
Sahne: ${scene}
Altin eleman: ${goldenElement}
Gun numarasi: ${dayNumber}
${topicContext ? `\nGundem baglami: ${topicContext}\n` : ''}
Sadece Ingilizce prompt metnini dondur, baska hicbir sey yazma.`
    }

    // Call Gemini 2.0 Flash
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      return res.status(500).json({ error: 'Gemini API error', detail: err.error?.message })
    }

    const geminiData = await geminiRes.json()
    let prompt = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Track usage
    const geminiUsage = {
      promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
      completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
      calls: 1,
    }

    // Clean up response
    prompt = prompt
      .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
      .replace(/^["']|["']$/g, '')      // Remove wrapping quotes
      .replace(/^\s*prompt:\s*/i, '')    // Remove "prompt:" prefix
      .trim()

    if (!prompt || prompt.length < 50) {
      return res.status(500).json({ error: 'Prompt generation failed — response too short', geminiUsage })
    }

    // Post-process validation: ensure critical elements exist
    if (!prompt.includes('#D4A843') && !prompt.includes('D4A843')) {
      prompt += ' The golden element glows with warm amber color (#D4A843).'
    }
    if (!/GUN|GÜN/i.test(prompt)) {
      prompt += ` Bold clean text reading "GUN ${dayNumber}" in large uppercase sans-serif font at the top of the frame.`
    }
    if (!prompt.includes('1:1')) {
      prompt += ' 1:1 aspect ratio at 2K resolution.'
    }

    // Trim if too long
    if (prompt.length > 700) {
      prompt = prompt.substring(0, 697) + '...'
    }

    return res.status(200).json({
      prompt,
      mode,
      theme,
      dayNumber,
      geminiUsage,
    })
  } catch (error) {
    console.error('Generate prompt error:', error)
    return res.status(500).json({ error: 'Failed to generate prompt', detail: error.message })
  }
}
