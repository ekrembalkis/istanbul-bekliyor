// Serverless personality DNA analyzer — tests 3 approaches
// POST /api/analyze-personality { tweets: string[], approach: 1|2|3 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const { tweets = [], approach = 1 } = req.body
  if (tweets.length < 5) return res.status(400).json({ error: 'Need at least 5 tweets' })

  const numberedTweets = tweets.slice(0, 30).map((t, i) => `${i + 1}. ${t.replace(/https?:\/\/\S+/g, '').trim()}`).join('\n')

  try {
    let prompt

    if (approach === 1) {
      // APPROACH 1: Single-shot full DNA extraction
      prompt = `Bu ${tweets.length} tweet ayni kisiye ait. Bu kisinin KISILIK DNA'sini cikar.

TWEETLER:
${numberedTweets}

Asagidaki JSON yapisini doldur. Turkce yaz. Her alan dolu olmali.

{
  "identity": {
    "archetype": "bu kisi ne tip biri, 3-5 kelime ile tanimla",
    "worldview": "dunya gorusu, neye inanir, neyi savunur",
    "expertise": ["en cok konustugu 3 alan"]
  },
  "voice": {
    "toneSpectrum": "ana ses tonu (ornegin: sarkastik-keskin, samimi-duygusal, agresif-esprili)",
    "openingStyle": "tweetlere nasil baslar, ilk cumleyi nasil kurar",
    "closingStyle": "tweetleri nasil bitirir",
    "signaturePhrases": ["en az 5 imza kelime/kalip"],
    "humorStyle": "mizah tarzi (ornegin: kara mizah, ironi, abartma, duz espri)"
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
    "formality": "0-100 arasi sayi",
    "humor": "0-100 arasi sayi",
    "controversy": "0-100 arasi sayi",
    "empathy": "0-100 arasi sayi",
    "authenticity": "0-100 arasi sayi"
  }
}

SADECE JSON dondur, baska hicbir sey yazma. Aciklama ekleme.`

    } else if (approach === 2) {
      // APPROACH 2: Layered — first extract patterns, then synthesize
      prompt = `Bu ${tweets.length} tweet ayni kisiye ait. 3 adimda analiz et:

TWEETLER:
${numberedTweets}

ADIM 1 - GOZLEM: Bu tweetlerdeki tekrarlayan kaliplari, kelimeleri, yaklasim tarzlarini listele.
ADIM 2 - SENTEZ: Gozlemlerden bu kisinin kisiligini, dunya gorusunu, mizah tarzini cikar.
ADIM 3 - DNA: Asagidaki JSON'u doldur.

{
  "patterns_observed": ["gozlemlenen 5-8 kalip, ornegin: futbol konusunda agresif, kufur kullanir, ironi yapar"],
  "identity": {
    "archetype": "3-5 kelime ile tanimla",
    "worldview": "dunya gorusu",
    "expertise": ["3 alan"]
  },
  "voice": {
    "toneSpectrum": "ana ses tonu",
    "openingStyle": "nasil baslar",
    "closingStyle": "nasil bitirir",
    "signaturePhrases": ["5+ imza kalip"],
    "humorStyle": "mizah tarzi"
  },
  "reactions": {
    "toGoodNews": "tepki",
    "toBadNews": "tepki",
    "toControversy": "tepki"
  },
  "boundaries": {
    "neverDoes": ["3+ madde"],
    "alwaysDoes": ["3+ madde"]
  },
  "personalityTraits": {
    "formality": 0,
    "humor": 0,
    "controversy": 0,
    "empathy": 0,
    "authenticity": 0
  }
}

SADECE JSON dondur.`

    } else if (approach === 3) {
      // APPROACH 3: Topic-aware — group tweets by topic first, then extract per-topic personality
      prompt = `Bu ${tweets.length} tweet ayni kisiye ait. Konu bazli kisilik analizi yap.

TWEETLER:
${numberedTweets}

Once tweetleri konularina gore grupla, sonra her konudaki davranisi analiz et.

{
  "topicProfiles": [
    {
      "topic": "konu adi (ornegin: futbol, gunluk yasam, siyaset)",
      "tweetCount": 0,
      "tone": "bu konudaki ses tonu",
      "behavior": "bu konuda nasil davranir, 1-2 cumle",
      "examplePhrases": ["bu konudaki tipik ifadeler"]
    }
  ],
  "corePersonality": {
    "archetype": "3-5 kelime",
    "worldview": "dunya gorusu",
    "dominantTone": "tum konulardaki ortak ton",
    "signaturePhrases": ["5+ imza kalip"],
    "humorStyle": "mizah tarzi"
  },
  "contextualBehavior": {
    "whenHappy": "mutlu/heyecanli olunca ne yapar",
    "whenAngry": "sinirli olunca ne yapar",
    "whenBored": "sıkıldığında ne yapar"
  },
  "personalityTraits": {
    "formality": 0,
    "humor": 0,
    "controversy": 0,
    "empathy": 0,
    "authenticity": 0
  }
}

SADECE JSON dondur.`

    } else if (approach === 4) {
      // APPROACH 4: HYBRID (1+3) — Full DNA + topic profiles in single call
      prompt = `Bu ${tweets.length} tweet ayni kisiye ait. Hem genel kisilik DNA'sini cikar, hem de konu bazli davranis profillerini olustur.

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
    }

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
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    let dna = null
    try {
      dna = JSON.parse(jsonMatch?.[0] || '{}')
    } catch {
      dna = { raw: rawText }
    }

    const geminiUsage = {
      promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
      completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
    }

    return res.status(200).json({ approach, dna, geminiUsage, tweetCount: tweets.length })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
