// Serverless tweet generator: Gemini + Style DNA + Xquik Score Loop
// POST /api/generate-tweet { styleUsername, topic, tone, goal, count, cloneMode }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY
  const XQUIK_KEY = process.env.XQUIK_API_KEY
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  if (!XQUIK_KEY) return res.status(500).json({ error: 'XQUIK_API_KEY not configured' })

  const {
    styleUsername, topic,
    tone = 'sarkastik, samimi', goal = 'engagement',
    count = 3, cloneMode = true, topicContext = ''
  } = req.body

  if (!styleUsername || !topic) {
    return res.status(400).json({ error: 'styleUsername and topic are required' })
  }

  try {
    // 1. Fetch style tweets from Xquik
    const styleRes = await fetch(
      `https://xquik.com/api/v1/styles/${encodeURIComponent(styleUsername)}`,
      { headers: { 'x-api-key': XQUIK_KEY } }
    )
    let styleTweets = []
    if (styleRes.ok) {
      const styleData = await styleRes.json()
      styleTweets = (styleData.tweets || [])
        .filter(t => !t.text.startsWith('@') && t.text.length > 20)
        .slice(0, 15)
        .map(t => t.text)
    }

    if (styleTweets.length < 3) {
      return res.status(400).json({ error: 'Not enough style data. Analyze the profile first.' })
    }

    // 2. Analyze style characteristics
    const avgLen = Math.round(styleTweets.reduce((s, t) => s + t.length, 0) / styleTweets.length)
    const startsLower = styleTweets.filter(t => /^[a-zçğıöşü]/.test(t)).length
    const usesSlang = styleTweets.some(t => /amk|aq|falan|valla|ya\b/i.test(t))
    const hasEmoji = styleTweets.some(t => /[\u{1F300}-\u{1FAFF}]/u.test(t))
    const questionRatio = styleTweets.filter(t => t.includes('?')).length / styleTweets.length
    const styleUsesQuestion = questionRatio > 0.2

    // Style overrides: track which checks are skipped for style accuracy
    const styleOverrides = []

    // 3. Build CTA rule based on mode + style
    let ctaRule
    if (cloneMode && !styleUsesQuestion) {
      // Birebir Klon: style doesn't use ?, don't force it
      ctaRule = 'Bu kisi ASLA soru isareti kullanmiyor. Soru isareti KOYMA. Cumleni acik birak veya nokta ile bitir.'
      styleOverrides.push('CTA: stil soru isareti kullanmiyor, atlanıyor')
    } else {
      // Optimize mode or style naturally uses ?
      ctaRule = 'Soru isareti ile bitir ki yorum gelsin'
    }

    const styleRules = [
      startsLower > styleTweets.length / 2 ? 'MUTLAKA kucuk harfle basla' : null,
      `Ortalama uzunluk ${avgLen} karakter, 50-150 arasi tut`,
      usesSlang ? 'Argo kullan (amk, aq, falan, valla, ya) dogal sekilde' : 'Argo kullanma, temiz dil',
      hasEmoji ? null : 'ASLA emoji kullanma',
      'ASLA hashtag kullanma',
      'ASLA em dash veya cift tire kullanma',
      ctaRule,
      'Link koyma',
    ].filter(Boolean).join('\n- ')

    // 4. Build prompt
    const numberedExamples = styleTweets.map((t, i) => `${i + 1}. ${t}`).join('\n')
    const modeLabel = cloneMode ? 'BIREBIR KLON — stili ASLA bozma' : 'OPTIMIZE — stili koru ama algoritmaya uy'
    const prompt = `Sen bir Turkce tweet yazarisin. MOD: ${modeLabel}. Verilen kisinin tarzinda tweet yazacaksin.

STIL ORNEKLERI (@${styleUsername}):
${numberedExamples}

STIL DNA KURALLARI:
- ${styleRules}

X ALGORITMASI KURALLARI:
- 50-280 karakter arasi optimal
- Medya eklenecek (photo)
- Asiri noktalama kullanma
- Yeterli icerik/substance olmali (cok kisa olmasin)

KONU: ${topic}
${topicContext ? `\nGUNDEM BAGLAMI (bu konu hakkinda simdi X'te konusulanlar):\n${topicContext}\n\nYukaridaki baglamdan ilham al ama KOPYALAMA. Kendi stilinde yeni icerik uret.\n` : ''}
TON: ${tone}
HEDEF: ${goal}

Bu stilde ${count} farkli tweet yaz. Her biri farkli bir aci olsun. Sadece tweet metinlerini yaz. Her tweeti yeni satirda numara ile yaz. Baska hicbir sey yazma.`

    // 5. Generate with Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 800 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      return res.status(500).json({ error: 'Gemini API error', detail: err.error?.message })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse tweets from numbered list
    const tweets = rawText
      .split('\n')
      .map(line => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(line => line.length > 20 && !line.toLowerCase().startsWith('tamam') && !line.toLowerCase().startsWith('iste'))

    if (tweets.length === 0) {
      return res.status(500).json({ error: 'Generation failed', raw: rawText })
    }

    // 6. Score each tweet and auto-revise if needed
    const results = []
    for (const tweet of tweets.slice(0, count)) {
      let currentDraft = tweet
      let scoreData = null
      let attempts = 0
      const tweetOverrides = [...styleOverrides]

      while (attempts < 3) {
        attempts++
        const scoreRes = await fetch('https://xquik.com/api/v1/compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': XQUIK_KEY },
          body: JSON.stringify({ step: 'score', draft: currentDraft, hasMedia: true, hasLink: false }),
        })

        if (!scoreRes.ok) break

        scoreData = await scoreRes.json()
        const failed = (scoreData.checklist || []).filter(c => !c.passed).map(c => c.factor)

        // In clone mode: if only CTA fails and style doesn't use ?, accept as-is
        if (cloneMode && !styleUsesQuestion) {
          const nonCtaFails = failed.filter(f => !f.includes('CTA'))
          if (nonCtaFails.length === 0) {
            // Only CTA failed — this is expected in clone mode, accept it
            break
          }
        }

        if (scoreData.passed) break

        // Auto-revise non-CTA failures
        if (!cloneMode && failed.includes('Conversation-driving CTA') && !currentDraft.includes('?')) {
          currentDraft = currentDraft.replace(/[.!,]?\s*$/, '') + '?'
        }

        if (failed.includes('Optimal length (50-280 characters)') && currentDraft.length < 50) {
          const fixPrompt = cloneMode && !styleUsesQuestion
            ? `Bu tweeti ayni stilde ama daha uzun yaz (60-120 karakter arasi). Stili koru. Soru isareti KULLANMA.\n\nOrijinal: "${currentDraft}"\n\nSadece yeni tweet metnini yaz.`
            : `Bu tweeti ayni stilde ama daha uzun yaz (60-120 karakter arasi). Stili koru. Soru ile bitir.\n\nOrijinal: "${currentDraft}"\n\nSadece yeni tweet metnini yaz.`
          const fixRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: fixPrompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
              }),
            }
          )
          if (fixRes.ok) {
            const fixData = await fixRes.json()
            const fixed = fixData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            if (fixed && fixed.length > 40) {
              currentDraft = fixed.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, '')
            }
          }
        }
      }

      results.push({
        tweet: currentDraft,
        score: scoreData ? { passed: scoreData.passed, count: scoreData.passedCount, total: scoreData.totalChecks, checklist: scoreData.checklist } : null,
        attempts,
        styleOverrides: tweetOverrides,
      })
    }

    return res.status(200).json({
      style: styleUsername,
      topic,
      tone,
      goal,
      cloneMode,
      questionRatio: Math.round(questionRatio * 100),
      tweets: results,
      totalGenerated: tweets.length,
    })
  } catch (error) {
    console.error('Generate tweet error:', error)
    return res.status(500).json({ error: 'Failed to generate tweet', detail: error.message })
  }
}
