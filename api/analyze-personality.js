// Serverless personality DNA analyzer — Hybrid approach (full DNA + topic profiles)
// POST /api/analyze-personality { tweets: string[] }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const { tweets = [] } = req.body
  if (tweets.length < 5) return res.status(400).json({ error: 'Need at least 5 tweets' })

  const numberedTweets = tweets.slice(0, 30).map((t, i) => `${i + 1}. ${t.replace(/https?:\/\/\S+/g, '').trim()}`).join('\n')

  try {
    const prompt = `Bu ${tweets.length} tweet ayni kisiye ait. Hem genel kisilik DNA'sini cikar, hem de konu bazli davranis profillerini olustur.

TWEETLER:
${numberedTweets}

Asagidaki JSON yapisini eksiksiz doldur. Turkce yaz.

{
  "identity": {
    "archetype": "bu kisi ne tip biri, 3-5 kelime",
    "worldview": "dunya gorusu, neye inanir, neyi savunur, hangi tarafta",
    "expertise": ["en cok konustugu 3 alan"]
  },
  "voice": {
    "toneSpectrum": "ana ses tonu",
    "openingStyle": "tweetlere nasil baslar",
    "closingStyle": "tweetleri nasil bitirir",
    "signaturePhrases": ["en az 5 imza kelime/kalip"],
    "humorStyle": "mizah tarzi"
  },
  "reactions": {
    "toGoodNews": "iyi habere nasil tepki verir",
    "toBadNews": "kotu habere nasil tepki verir",
    "toControversy": "polemige nasil tepki verir"
  },
  "boundaries": {
    "neverDoes": ["asla yapmadiglari, en az 3 madde"],
    "alwaysDoes": ["her zaman yaptiklari, en az 3 madde"]
  },
  "personalityTraits": {
    "formality": "0-100",
    "humor": "0-100",
    "controversy": "0-100",
    "empathy": "0-100",
    "authenticity": "0-100"
  },
  "topicProfiles": [
    {
      "topic": "konu adi",
      "tone": "bu konudaki ses tonu",
      "behavior": "bu konuda nasil davranir, 1-2 cumle",
      "typicalReaction": "bu konuda bir haber/olay olunca nasil tepki verir"
    }
  ],
  "contextualBehavior": {
    "whenHappy": "mutlu olunca ne yapar",
    "whenAngry": "sinirli olunca ne yapar",
    "whenBored": "sikildigi zaman ne yapar"
  }
}

SADECE JSON dondur, aciklama ekleme.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      return res.status(500).json({ error: 'Gemini error', detail: err.error?.message })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    let dna = null
    try {
      dna = JSON.parse(jsonMatch?.[0] || '{}')
    } catch {
      dna = null
    }

    if (!dna || !dna.identity) {
      return res.status(500).json({ error: 'DNA extraction failed', raw: rawText.substring(0, 200) })
    }

    const geminiUsage = {
      promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
      completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
      calls: 1,
    }

    return res.status(200).json({ dna, geminiUsage, tweetCount: tweets.length })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
