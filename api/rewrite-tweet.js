// Rewrite user's text in a chosen X profile's style.
// POST /api/rewrite-tweet { styleUsername, userText, count? }

import { setCorsHeaders } from './lib/cors.js'
import { XQUIK_BASE_URL, GEMINI_BASE_URL, GEMINI_MODEL } from './lib/endpoints.js'

function detectLanguage(tweets) {
  const text = tweets.join(' ').toLowerCase()
  const trChars = (text.match(/[çğıöşü]/g) || []).length
  const trWords = (text.match(/\b(ve|bir|bu|da|de|ile|için|ama|çok|var|yok|ben|sen|biz)\b/g) || []).length
  const enWords = (text.match(/\b(the|and|is|are|was|were|you|have|has|had|just|about|that|this|with|from)\b/g) || []).length
  const arChars = (text.match(/[\u0600-\u06FF]/g) || []).length
  if (arChars > text.length * 0.1) return 'ar'
  if (trChars > 2 || trWords > enWords * 1.5) return 'tr'
  if (enWords > 3) return 'en'
  return 'en'
}

export default async function handler(req, res) {
  setCorsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim()
  const XQUIK_KEY = (process.env.XQUIK_API_KEY || '').trim()
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  if (!XQUIK_KEY) return res.status(500).json({ error: 'XQUIK_API_KEY not configured' })

  const { styleUsername, userText, count = 3 } = req.body || {}
  if (!styleUsername || !userText || !userText.trim()) {
    return res.status(400).json({ error: 'styleUsername and userText are required' })
  }

  try {
    const styleRes = await fetch(
      `${XQUIK_BASE_URL}/styles/${encodeURIComponent(String(styleUsername).replace('@', ''))}`,
      { headers: { 'x-api-key': XQUIK_KEY } }
    )
    if (!styleRes.ok) {
      return res.status(400).json({ error: 'Style profile not found. Analyze the profile first.' })
    }
    const styleData = await styleRes.json()
    const styleTweets = (styleData.tweets || [])
      .filter(t => !t.text.startsWith('@') && t.text.length > 20)
      .map(t => t.text)
      .slice(0, 60)

    if (styleTweets.length < 3) {
      return res.status(400).json({ error: 'Not enough style data. Analyze the profile first.' })
    }

    const lang = detectLanguage(styleTweets)
    const examples = styleTweets.map((tw, i) => `${i + 1}. ${tw}`).join('\n')

    const prompts = {
      tr: {
        system: `Sen bir tweet yeniden yazarısın. Görevin: kullanıcının yazdığı metnin ANLAMINI KORU, ama verilen profilin ses tonunda, kelime seçiminde, cümle yapısında, uzunluğunda ve karakterinde yeniden yaz.`,
        user: `STİL ÖRNEKLERİ (@${styleUsername}'in gerçek tweetleri — bu tarzı birebir yakala):\n${examples}\n\nKULLANICININ METNİ (anlamını koru, stilini değiştir):\n"${userText.trim()}"\n\nKURALLAR:\n- ASLA orijinal metnin anlamını değiştirme, sadece STİLİ değiştir\n- Üstteki profilin uzunluk, noktalama, büyük/küçük harf, argo, emoji, hashtag alışkanlıklarını birebir taklit et\n- ASLA açıklama yazma, sadece yeniden yazılmış tweet\n- Profilin stili hashtag/emoji KULLANMIYORSA, sen de KULLANMA\n- Link ekleme\n\n${count} farklı versiyon üret. Her biri AYNI ANLAMI taşısın ama farklı açıdan, farklı kelime seçimiyle yazılsın. Sadece tweet metinlerini yaz. Her birini yeni satırda numara ile başlat (1. 2. 3.). Başka hiçbir şey yazma.`,
      },
      en: {
        system: `You are a tweet rewriter. Your job: PRESERVE the MEANING of the user's text, but rewrite it in the given profile's voice, word choice, sentence structure, length, and character.`,
        user: `STYLE EXAMPLES (@${styleUsername}'s real tweets — imitate this voice exactly):\n${examples}\n\nUSER'S TEXT (keep the meaning, change only the style):\n"${userText.trim()}"\n\nRULES:\n- NEVER change the original meaning, only change the STYLE\n- Exactly mimic the profile's length, punctuation, capitalization, slang, emoji, hashtag habits\n- NEVER write explanations, only the rewritten tweet\n- If the profile's style does NOT use hashtags/emojis, do NOT use them\n- No links\n\nProduce ${count} different versions. Each should carry the SAME MEANING but from a different angle with different word choices. Only write the tweet texts. Start each on a new line numbered (1. 2. 3.). Nothing else.`,
      },
    }
    const p = prompts[lang] || prompts.en

    const geminiUrl = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: p.system }] },
        contents: [{ role: 'user', parts: [{ text: p.user }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      return res.status(500).json({ error: 'Gemini API error', detail: err.error?.message })
    }

    const data = await geminiRes.json()
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const usage = data.usageMetadata || {}

    const rewrites = raw
      .split('\n')
      .map(line => line.replace(/^\d+[\.\)\/]\s*/, '').trim())
      .map(line => line.replace(/^["'`]|["'`]$/g, '').trim())
      .filter(line => line.length > 10)
      .slice(0, count)

    if (rewrites.length === 0) {
      return res.status(500).json({ error: 'Rewrite failed', raw })
    }

    return res.status(200).json({
      rewrites,
      language: lang,
      usage: {
        inputTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
      },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Rewrite failed', detail: err.message })
  }
}
