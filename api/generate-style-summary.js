// Serverless style summary generator — distills tweets into a comprehensive style guide
// POST /api/generate-style-summary { tweets: string[], username: string, language?: string }

import { setCorsHeaders } from './lib/cors.js'

export default async function handler(req, res) {
  setCorsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim()
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const { tweets = [], username = '', language = '' } = req.body
  if (tweets.length < 5) return res.status(400).json({ error: 'Need at least 5 tweets' })

  const slicedTweets = tweets.slice(0, 100)
  const numbered = slicedTweets.map((t, i) => `${i + 1}. ${t.replace(/https?:\/\/\S+/g, '').trim()}`).join('\n')

  const lang = language || 'tr'
  const langInstruction = lang === 'tr'
    ? 'Turkce yaz. Tweet orneklerini oldugu gibi kullan.'
    : `Write in ${lang.toUpperCase()}. Use actual tweet quotes as examples.`

  try {
    const prompt = `Analyze these ${slicedTweets.length} tweets from @${username} and create a comprehensive STYLE SUMMARY that captures how this person writes.

TWEETS:
${numbered}

Create a detailed style guide covering ALL of these:

1. CUMLE YAPISI: Tipik cumle uzunlugu, yapi tercihleri (kisa-kesik mi, uzun-akici mi, karma mi)
2. KELIME TERCIHLERI: Sik kullandigi kelimeler, baglaclari, edatlari, dolgu kelimeleri
3. CUMLE RITMI: Kisa vurus + uzun cumle karisimlari, tekrar kaliplari
4. ACILIS STILI: Tweetlere nasil basliyor (soru, iddia, gozlem, tepki, anekdot)
5. KAPANIS STILI: Tweetleri nasil bitiriyor (acik birakma, punchline, soru, nokta)
6. KARAKTERISTIK KALIPLAR: Bu kisiye ozgu tekrar eden ifade kaliplari (EN AZ 8 TANE, tweetlerden direkt alintilarla)
7. ARGO/SLANG: Kullandigi informal ifadeler ve bunlari NASIL kullandigi (cumle basi, sonu, vurgu icin)
8. MIZAH TEKNIGI: Ironi, abarti, understatement, absurt, kara mizah — somut orneklerle
9. ARGUMAN AKISI: Bir konuda nasil fikir belirtiyor, nasil savunuyor, nasil elestiriyor
10. DUYGU IFADESI: Ofkeyi, sevinci, hayal kirikligini nasil ifade ediyor
11. NOKTALAMA ALISKANLIKLARI: Virgul, nokta, uc nokta, unlem, soru isareti kullanim frekansi
12. ASLA YAPMAYACAGI SEYLER: Bu kisinin asla kullanmayacagi stilistik tercihler (en az 5)

${langInstruction}
Somut, spesifik, uygulanabilir yaz. Her madde icin tweetlerden gercek ornekler ver.
500-800 kelime arasi saf stil kilavuzu metni dondur. JSON degil, markdown degil, duz metin.`

    const GEMINI_BASE = (process.env.GEMINI_BASE_URL || '').replace(/\/+$/, '')
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'

    const geminiRes = await fetch(
      `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2400,
            thinkingConfig: { thinkingLevel: 'low' },
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      return res.status(500).json({ error: 'Gemini error', detail: err.error?.message })
    }

    const geminiData = await geminiRes.json()
    const summary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!summary || summary.length < 100) {
      return res.status(500).json({ error: 'Style summary generation failed', raw: summary.substring(0, 200) })
    }

    const geminiUsage = {
      promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
      completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
      calls: 1,
    }

    return res.status(200).json({ summary, geminiUsage, tweetCount: slicedTweets.length })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
