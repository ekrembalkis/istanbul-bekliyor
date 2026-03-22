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
    const prompt = `These ${tweets.length} tweets belong to the same person. Extract their personality DNA and topic-based behavior profiles.

TWEETS:
${numberedTweets}

Fill in the JSON structure below completely. IMPORTANT: Write ALL values in the SAME LANGUAGE as the tweets above. If tweets are in Turkish, write in Turkish. If in English, write in English. Match the tweet language exactly.

{
  "language": "ISO 639-1 language code of the tweets (e.g. tr, en, ar, es, fr, de, ja, ko, pt)",
  "identity": {
    "archetype": "what type of person is this, 3-5 words",
    "worldview": "their worldview, what they believe in, what they defend",
    "expertise": ["top 3 topics they talk about"]
  },
  "voice": {
    "toneSpectrum": "main tone of voice",
    "openingStyle": "how they start tweets",
    "closingStyle": "how they end tweets",
    "signaturePhrases": ["at least 5 signature words/phrases in original language"],
    "humorStyle": "humor style"
  },
  "reactions": {
    "toGoodNews": "how they react to good news",
    "toBadNews": "how they react to bad news",
    "toControversy": "how they react to controversy"
  },
  "boundaries": {
    "neverDoes": ["things they never do, at least 3"],
    "alwaysDoes": ["things they always do, at least 3"]
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
      "topic": "topic name",
      "tone": "tone for this topic",
      "behavior": "how they behave on this topic, 1-2 sentences",
      "typicalReaction": "typical reaction to news about this topic"
    }
  ],
  "slangPatterns": ["slang/informal expressions this person uses, in original language. e.g. Turkish: amk, aq, valla. English: lol, bruh, ngl. List actual patterns from tweets."],
  "cognitiveFilters": [
    "through what lens does this person see events? e.g. 'connects everything to football', 'reduces serious topics to personal experience'. At least 2 filters."
  ],
  "narrativeTechniques": [
    "how does this person tell stories / be funny? e.g. 'gives concrete details (names, numbers, places)', 'makes absurd personal confessions'. Extract from tweets, at least 3."
  ],
  "ironyTechniques": [
    "how does this person use irony? e.g. 'understatement', 'reframing (presents good news as bad)', 'absurd context shifting'. Extract from tweets, at least 2."
  ],
  "ironyExamples": [
    "pick 3 REAL irony/humor examples from the tweets and write them as-is. These will be few-shot examples for the model."
  ],
  "contextualBehavior": {
    "whenHappy": "what they do when happy",
    "whenAngry": "what they do when angry",
    "whenBored": "what they do when bored"
  }
}

Return ONLY JSON, no explanation.`

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
