// Serverless tweet generator: Gemini + Style DNA + Xquik Score Loop
// POST /api/generate-tweet { styleUsername, topic, tone, goal, count, cloneMode }

// ── Language detection heuristic (fallback when DNA has no language) ──
function detectLanguage(tweets) {
  const text = tweets.join(' ').toLowerCase()
  const trChars = (text.match(/[çğıöşü]/g) || []).length
  const trWords = (text.match(/\b(ve|bir|bu|da|de|ile|için|ama|çok|var|yok|ben|sen|biz|amk|aq|falan|valla)\b/g) || []).length
  const enWords = (text.match(/\b(the|and|is|are|was|were|you|have|has|had|just|about|that|this|with|from|not|but|my|your)\b/g) || []).length
  const arChars = (text.match(/[\u0600-\u06FF]/g) || []).length
  if (arChars > text.length * 0.1) return 'ar'
  if (trChars > 2 || trWords > enWords * 1.5) return 'tr'
  if (enWords > 3) return 'en'
  return 'en'
}

// ── Slang patterns per language ──
const SLANG_PATTERNS = {
  tr: /amk|aq|falan|valla|ya\b/i,
  en: /lol|lmao|bruh|ngl|fr\b|tbh|smh|af\b|lowkey|highkey|deadass|imo/i,
}

// ── Lowercase start regex per language ──
const LOWERCASE_REGEX = {
  tr: /^[a-zçğıöşü]/,
  _default: /^[a-z]/,
}

// ── Language-adaptive prompt templates ──
const T = {
  tr: {
    system: 'Sen bir Turkce tweet yazarisin',
    cloneLabel: 'BIREBIR KLON — stili ASLA bozma',
    optimizeLabel: 'OPTIMIZE — stili koru ama algoritmaya uy',
    lowercaseRule: 'MUTLAKA kucuk harfle basla',
    slangRule: (patterns) => `Argo kullan (${patterns}) dogal sekilde`,
    noSlang: 'Argo kullanma, temiz dil',
    noEmoji: 'ASLA emoji kullanma',
    noHashtag: 'ASLA hashtag kullanma',
    noDash: 'ASLA em dash veya cift tire kullanma',
    noLink: 'Link koyma',
    ctaNo: 'Bu kisi ASLA soru isareti kullanmiyor. Soru isareti KOYMA. Cumleni acik birak veya nokta ile bitir.',
    ctaYes: 'Soru isareti ile bitir ki yorum gelsin',
    noPunctuation: 'Asiri noktalama kullanma',
    substance: 'Yeterli icerik/substance olmali (cok kisa olmasin)',
    lengthAvg: (avg) => `\nUzunluk: Ortalama ${avg} karakter, 50-150 arasi tut.`,
    lengthShort: '\n!!! KRITIK UZUNLUK KURALI !!!\nHer tweet MUTLAKA 60 ile 120 karakter arasinda olmali. 60dan KISA tweet KABUL EDILMEZ. Gerekirse iki cumle yaz.',
    lengthNormal: '\n!!! KRITIK UZUNLUK KURALI !!!\nHer tweet MUTLAKA 100 ile 200 karakter arasinda olmali. 100den KISA tweet KABUL EDILMEZ. Gerekirse iki cumle yaz, detay ekle.',
    lengthLong: '\n!!! KRITIK UZUNLUK KURALI !!!\nHer tweet MUTLAKA 200 ile 270 karakter arasinda olmali. 200den KISA tweet KABUL EDILMEZ. 280i GECME. Gerekirse 3-4 cumle yaz, detay ekle, ama stili koru.',
    styleHeader: 'STIL ORNEKLERI',
    dnaHeader: 'KISILIK DNA (bu kisinin gercek kisiligi — tweetleri buna gore yaz)',
    dnaArchetype: 'Arketip', dnaWorldview: 'Dunya gorusu', dnaExpertise: 'Uzmanlik',
    dnaTone: 'Ses tonu', dnaOpening: 'Acilis tarzi', dnaClosing: 'Kapanis tarzi', dnaHumor: 'Mizah',
    dnaReactions: 'Tepkiler', dnaGood: 'Iyi habere', dnaBad: 'Kotu habere', dnaControversy: 'Polemige',
    dnaNever: 'Asla yapmaz', dnaAlways: 'Her zaman yapar',
    dnaTopicBehavior: 'Konu bazli davranis',
    dnaCogFilters: 'BILISSEL FILTRELER (bu kisi olaylari su prizmadan gorur)',
    dnaNarrative: 'ANLATIM TEKNIKLERI (boyle yazar)',
    dnaIrony: 'IRONI TEKNIKLERI (ironiyi boyle kullanir — DOGRUDAN sevinme veya kufur etme, bu teknikleri kullan)',
    dnaIronyExamples: 'GERCEK IRONI ORNEKLERI (bu kisinin gercek tweetleri — bu tarzi taklit et)',
    dnaHappy: 'Mutlu olunca', dnaAngry: 'Sinirli olunca',
    dnaTraits: 'Kisilik skorlari',
    styleRulesHeader: 'STIL DNA KURALLARI',
    algoHeader: 'X ALGORITMASI KURALLARI',
    tweetInstruction: (topic, ctx, tone, goal, count) =>
      `KONU: ${topic}\n${ctx ? `\nGUNDEM BAGLAMI (bu konu hakkinda simdi X'te konusulanlar):\n${ctx}\n\nYukaridaki baglamdan ilham al ama KOPYALAMA. Kendi stilinde yeni icerik uret.\n` : ''}TON: ${tone}\nHEDEF: ${goal}\n\nBu stilde ${count} farkli tweet yaz. Her biri farkli bir aci olsun. Sadece tweet metinlerini yaz. Her tweeti yeni satirda numara ile yaz. Baska hicbir sey yazma.`,
    quoteInstruction: (author, text, count) =>
      `ASAGIDAKI TWEET'E QUOTE TWEET YAZ. Kendi stilinde yorum/tepki ver.\n\nQUOTE EDILECEK TWEET (@${author}):\n"${text}"\n\n${count} farkli quote tweet yaz. Her biri farkli bir aci olsun. Sadece kendi tweet metinlerini yaz (quote edilen tweeti tekrarlama). Her tweeti yeni satirda numara ile yaz.`,
    replyInstruction: (author, text, count) =>
      `ASAGIDAKI TWEET'E REPLY YAZ. Dogal, stiline uygun, icerikli cevap ver.\n\nREPLY YAZILACAK TWEET (@${author}):\n"${text}"\n\nONEMLI: Her reply EN AZ 50 karakter olmali. Cok kisa bos laflar yazma (ornegin sadece "helal" veya "aq" gibi). Icerikli, anlamli ama dogal reply yaz. 50-150 karakter arasi ideal.\n\n${count} farkli reply yaz. Her birini yeni satirda numara ile yaz.`,
    threadInstruction: (topic, ctx, tone, ctaRule) =>
      `BU KONUDA 5 TWEET'LIK THREAD (self-reply zinciri) YAZ.\n\nKONU: ${topic}\n${ctx ? `\nGUNDEM BAGLAMI:\n${ctx}\n` : ''}TON: ${tone}\n\nTHREAD YAPISI (her tweet oncekine REPLY olarak atilir):\n1. tweet — HOOK: Sarsici, provokatif veya surpriz acilis. Okuyucu "devamini okumam lazim" demeli.\n2. tweet — BAGLAM: Durumu acikla, olayi veya problemi ortaya koy. Somut detay ver.\n3. tweet — DERINLIK: Herkesin gormezden geldigi aciyi goster. Farkli bir perspektif sun.\n4. tweet — KANIT/DUYGU: Kisisel gozlem, somut ornek veya duygusal vurucu bir cumle.\n5. tweet — KAPANIIS: Guclu son cumle. ${ctaRule}\n\nKURALLAR:\n- HER tweet tek basina okunsa bile anlamli ve guclu olmali\n- Her tweet FARKLI aci, farkli yaklasim\n- 80-220 karakter arasi\n- Klise, slogan ve bos motivasyon cumleleri YASAK (somut ol)\n\nSADECE 5 tweet yaz. Her tweeti "1/" "2/" gibi numara ile baslat. Baska hicbir sey yazma.`,
    extendPrompt: (draft, noQ) => noQ
      ? `Bu tweeti ayni stilde ama daha uzun yaz (80-180 karakter arasi). Stili koru. Soru isareti KULLANMA. Anlami koru, detay ekle.\n\nOrijinal: "${draft}"\n\nSadece yeni tweet metnini yaz.`
      : `Bu tweeti ayni stilde ama daha uzun yaz (80-180 karakter arasi). Stili koru. Anlami koru, detay ekle.\n\nOrijinal: "${draft}"\n\nSadece yeni tweet metnini yaz.`,
    fixShortPrompt: (draft, range, noQ) => noQ
      ? `Bu tweeti ayni stilde ama daha uzun yaz (${range} arasi). Stili koru. Soru isareti KULLANMA.\n\nOrijinal: "${draft}"\n\nSadece yeni tweet metnini yaz.`
      : `Bu tweeti ayni stilde ama daha uzun yaz (${range} arasi). Stili koru. Soru ile bitir.\n\nOrijinal: "${draft}"\n\nSadece yeni tweet metnini yaz.`,
    garbageFilter: line => {
      const l = line.toLowerCase()
      return !l.startsWith('tamam') && !l.startsWith('iste') && !l.startsWith('tabi')
        && !l.includes('stilinde') && !l.includes('tweet:') && !l.includes('yazıyorum')
    },
  },
  _default: {
    system: (lang) => `You are a tweet writer. Write ALL tweets in ${lang.toUpperCase()} language ONLY`,
    cloneLabel: 'EXACT CLONE — NEVER break the style',
    optimizeLabel: 'OPTIMIZE — keep style but fit the algorithm',
    lowercaseRule: 'ALWAYS start with lowercase letter',
    slangRule: (patterns) => `Use slang naturally (${patterns})`,
    noSlang: 'Keep language clean, no slang',
    noEmoji: 'NEVER use emoji',
    noHashtag: 'NEVER use hashtags',
    noDash: 'NEVER use em dash or double hyphen',
    noLink: 'No links',
    ctaNo: 'This person NEVER uses question marks. Do NOT use question marks. End with a period or leave open.',
    ctaYes: 'End with a question mark to drive replies',
    noPunctuation: 'Don\'t overuse punctuation',
    substance: 'Must have enough substance (not too short)',
    lengthAvg: (avg) => `\nLength: Average ${avg} characters, keep between 50-150.`,
    lengthShort: '\n!!! CRITICAL LENGTH RULE !!!\nEvery tweet MUST be between 60 and 120 characters. Under 60 is NOT acceptable. Write two sentences if needed.',
    lengthNormal: '\n!!! CRITICAL LENGTH RULE !!!\nEvery tweet MUST be between 100 and 200 characters. Under 100 is NOT acceptable. Add detail if needed.',
    lengthLong: '\n!!! CRITICAL LENGTH RULE !!!\nEvery tweet MUST be between 200 and 270 characters. Under 200 is NOT acceptable. Do NOT exceed 280. Write 3-4 sentences, add detail, but keep the style.',
    styleHeader: 'STYLE EXAMPLES',
    dnaHeader: 'PERSONALITY DNA (this person\'s real personality — write tweets based on this)',
    dnaArchetype: 'Archetype', dnaWorldview: 'Worldview', dnaExpertise: 'Expertise',
    dnaTone: 'Tone', dnaOpening: 'Opening style', dnaClosing: 'Closing style', dnaHumor: 'Humor',
    dnaReactions: 'Reactions', dnaGood: 'To good news', dnaBad: 'To bad news', dnaControversy: 'To controversy',
    dnaNever: 'Never does', dnaAlways: 'Always does',
    dnaTopicBehavior: 'Topic-based behavior',
    dnaCogFilters: 'COGNITIVE FILTERS (how this person sees events)',
    dnaNarrative: 'NARRATIVE TECHNIQUES (how they write)',
    dnaIrony: 'IRONY TECHNIQUES (how they use irony — don\'t be direct, use these techniques)',
    dnaIronyExamples: 'REAL IRONY EXAMPLES (this person\'s real tweets — imitate this style)',
    dnaHappy: 'When happy', dnaAngry: 'When angry',
    dnaTraits: 'Personality scores',
    styleRulesHeader: 'STYLE DNA RULES',
    algoHeader: 'X ALGORITHM RULES',
    tweetInstruction: (topic, ctx, tone, goal, count) =>
      `TOPIC: ${topic}\n${ctx ? `\nCONTEXT (what's being discussed on X right now):\n${ctx}\n\nDraw inspiration from context above but DON'T COPY. Create new content in your own style.\n` : ''}TONE: ${tone}\nGOAL: ${goal}\n\nWrite ${count} different tweets in this style. Each from a different angle. Only write the tweet texts. Number each tweet on a new line. Nothing else.`,
    quoteInstruction: (author, text, count) =>
      `WRITE A QUOTE TWEET for the tweet below. Give your reaction in your own style.\n\nTWEET TO QUOTE (@${author}):\n"${text}"\n\nWrite ${count} different quote tweets. Each from a different angle. Only write your own tweet texts (don't repeat the quoted tweet). Number each on a new line.`,
    replyInstruction: (author, text, count) =>
      `WRITE A REPLY to the tweet below. Natural, style-appropriate, meaningful response.\n\nTWEET TO REPLY TO (@${author}):\n"${text}"\n\nIMPORTANT: Each reply must be AT LEAST 50 characters. Don't write empty short replies. Write meaningful, natural replies. 50-150 characters ideal.\n\nWrite ${count} different replies. Number each on a new line.`,
    threadInstruction: (topic, ctx, tone, ctaRule) =>
      `WRITE A 5-TWEET THREAD (self-reply chain) ON THIS TOPIC.\n\nTOPIC: ${topic}\n${ctx ? `\nCONTEXT:\n${ctx}\n` : ''}TONE: ${tone}\n\nTHREAD STRUCTURE (each tweet is a reply to the previous):\n1. HOOK: Shocking, provocative or surprising opening. Reader must think "I need to read more."\n2. CONTEXT: Explain the situation, lay out the event or problem. Give concrete details.\n3. DEPTH: Show the angle everyone is ignoring. Offer a different perspective.\n4. PROOF/EMOTION: Personal observation, concrete example, or emotionally impactful sentence.\n5. CLOSING: Strong final line. ${ctaRule}\n\nRULES:\n- EVERY tweet must be meaningful and powerful on its own\n- Each tweet a DIFFERENT angle\n- 80-220 characters\n- Clichés, slogans and empty motivation FORBIDDEN (be concrete)\n\nWrite ONLY 5 tweets. Start each with "1/" "2/" etc. Nothing else.`,
    extendPrompt: (draft, noQ) => noQ
      ? `Rewrite this tweet in the same style but longer (80-180 characters). Keep the style. Do NOT use question marks. Keep the meaning, add detail.\n\nOriginal: "${draft}"\n\nWrite only the new tweet text.`
      : `Rewrite this tweet in the same style but longer (80-180 characters). Keep the style. Keep the meaning, add detail.\n\nOriginal: "${draft}"\n\nWrite only the new tweet text.`,
    fixShortPrompt: (draft, range, noQ) => noQ
      ? `Rewrite this tweet in the same style but longer (${range}). Keep the style. Do NOT use question marks.\n\nOriginal: "${draft}"\n\nWrite only the new tweet text.`
      : `Rewrite this tweet in the same style but longer (${range}). Keep the style. End with a question.\n\nOriginal: "${draft}"\n\nWrite only the new tweet text.`,
    garbageFilter: line => {
      const l = line.toLowerCase()
      return !l.startsWith('okay') && !l.startsWith('sure') && !l.startsWith('here')
        && !l.includes('in the style') && !l.includes('tweet:') && !l.includes('writing')
    },
  },
}

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
    count = 3, cloneMode = true, topicContext = '',
    mode = 'tweet', // tweet | quote | reply | thread
    quoteTweetText = '', quoteTweetAuthor = '',
    lengthHint = '', // kisa | normal | uzun | (empty = style-based)
    personalityDNA = null, // optional PersonalityDNA object from frontend
  } = req.body

  if (!styleUsername || (!topic && !quoteTweetText)) {
    return res.status(400).json({ error: 'styleUsername and topic (or quoteTweetText) are required' })
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

    // 2. Detect language: DNA > heuristic
    const lang = personalityDNA?.language || detectLanguage(styleTweets)
    const t = T[lang] || T._default
    const systemLine = typeof t.system === 'function' ? t.system(lang) : t.system

    // 3. Analyze style characteristics
    const avgLen = Math.round(styleTweets.reduce((s, tw) => s + tw.length, 0) / styleTweets.length)
    const lcRegex = LOWERCASE_REGEX[lang] || LOWERCASE_REGEX._default
    const startsLower = styleTweets.filter(tw => lcRegex.test(tw)).length
    const slangRegex = SLANG_PATTERNS[lang] || SLANG_PATTERNS.en
    const dnaSlang = (personalityDNA?.slangPatterns || []).join(', ')
    const usesSlang = dnaSlang ? true : styleTweets.some(tw => slangRegex.test(tw))
    const hasEmoji = styleTweets.some(tw => /[\u{1F300}-\u{1FAFF}]/u.test(tw))
    const questionRatio = styleTweets.filter(tw => tw.includes('?')).length / styleTweets.length
    const styleUsesQuestion = questionRatio > 0.2

    // Style overrides: track which checks are skipped for style accuracy
    const styleOverrides = []

    // 4. Build CTA rule based on mode + style
    let ctaRule
    if (cloneMode && !styleUsesQuestion) {
      ctaRule = t.ctaNo
      styleOverrides.push('CTA: stil soru isareti kullanmiyor, atlanıyor')
    } else {
      ctaRule = t.ctaYes
    }

    // 5. Length rule
    let lengthBlock
    if (mode === 'thread') {
      lengthBlock = ''
    } else if (lengthHint === 'kisa') {
      lengthBlock = t.lengthShort
    } else if (lengthHint === 'uzun') {
      lengthBlock = t.lengthLong
    } else if (lengthHint === 'normal') {
      lengthBlock = t.lengthNormal
    } else {
      lengthBlock = t.lengthAvg(avgLen)
    }

    // 6. Build style rules
    const slangDisplay = dnaSlang || (lang === 'tr' ? 'amk, aq, falan, valla, ya' : 'lol, bruh, ngl, tbh')
    const styleRules = [
      startsLower > styleTweets.length / 2 ? t.lowercaseRule : null,
      usesSlang ? t.slangRule(slangDisplay) : t.noSlang,
      hasEmoji ? null : t.noEmoji,
      t.noHashtag,
      t.noDash,
      ctaRule,
      t.noLink,
    ].filter(Boolean).join('\n- ')

    // 7. Build personality DNA block (if available)
    let dnaBlock = ''
    if (personalityDNA) {
      const d = personalityDNA
      const traits = d.personalityTraits || {}
      const topicCtx = (d.topicProfiles || [])
        .map(tp => `- ${tp.topic}: ${tp.behavior}`)
        .join('\n')
      const cogFilters = (d.cognitiveFilters || []).map(f => `- ${f}`).join('\n')
      const narTech = (d.narrativeTechniques || []).map(f => `- ${f}`).join('\n')
      const ironyTech = (d.ironyTechniques || []).map(f => `- ${f}`).join('\n')
      const ironyExamples = (d.ironyExamples || []).map((e, i) => `${i + 1}. "${e}"`).join('\n')

      dnaBlock = `
${t.dnaHeader}:
${t.dnaArchetype}: ${d.identity?.archetype || ''}
${t.dnaWorldview}: ${d.identity?.worldview || ''}
${t.dnaExpertise}: ${(d.identity?.expertise || []).join(', ')}

${t.dnaTone}: ${d.voice?.toneSpectrum || ''}
${t.dnaOpening}: ${d.voice?.openingStyle || ''}
${t.dnaClosing}: ${d.voice?.closingStyle || ''}
${t.dnaHumor}: ${d.voice?.humorStyle || ''}

${t.dnaReactions}:
- ${t.dnaGood}: ${d.reactions?.toGoodNews || ''}
- ${t.dnaBad}: ${d.reactions?.toBadNews || ''}
- ${t.dnaControversy}: ${d.reactions?.toControversy || ''}

${t.dnaNever}: ${(d.boundaries?.neverDoes || []).join(', ')}
${t.dnaAlways}: ${(d.boundaries?.alwaysDoes || []).join(', ')}
${topicCtx ? `\n${t.dnaTopicBehavior}:\n${topicCtx}` : ''}
${cogFilters ? `\n${t.dnaCogFilters}:\n${cogFilters}` : ''}
${narTech ? `\n${t.dnaNarrative}:\n${narTech}` : ''}
${ironyTech ? `\n${t.dnaIrony}:\n${ironyTech}` : ''}
${ironyExamples ? `\n${t.dnaIronyExamples}:\n${ironyExamples}` : ''}
${d.contextualBehavior ? `\n${t.dnaHappy}: ${d.contextualBehavior.whenHappy}\n${t.dnaAngry}: ${d.contextualBehavior.whenAngry}` : ''}

${t.dnaTraits}: Formality ${traits.formality || 0}/100, Humor ${traits.humor || 0}/100, Controversy ${traits.controversy || 0}/100
`
    }

    // 8. Build prompt based on mode
    const numberedExamples = styleTweets.map((tw, i) => `${i + 1}. ${tw}`).join('\n')
    const modeLabel = cloneMode ? t.cloneLabel : t.optimizeLabel

    let modeInstruction
    if (mode === 'quote') {
      modeInstruction = t.quoteInstruction(quoteTweetAuthor, quoteTweetText, count)
    } else if (mode === 'reply') {
      modeInstruction = t.replyInstruction(quoteTweetAuthor, quoteTweetText, count)
    } else if (mode === 'thread') {
      const threadCtaRule = (cloneMode && !styleUsesQuestion) ? t.ctaNo : t.ctaYes
      modeInstruction = t.threadInstruction(topic, topicContext, tone, threadCtaRule)
    } else {
      modeInstruction = t.tweetInstruction(topic, topicContext, tone, goal, count)
    }

    const prompt = `${systemLine}. MOD: ${modeLabel}. ${lang === 'tr' ? 'Verilen kisinin tarzinda tweet yazacaksin.' : `Write tweets in this person's exact style. ALL output MUST be in ${lang.toUpperCase()}.`}

${t.styleHeader} (@${styleUsername}):
${numberedExamples}
${dnaBlock}
${t.styleRulesHeader}:
- ${styleRules}
${lengthBlock}

${t.algoHeader}:
- ${t.noPunctuation}
${mode !== 'reply' ? `- ${t.substance}` : ''}

${modeInstruction}`

    // 9. Generate with Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: mode === 'thread' ? 1600 : 800 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      return res.status(500).json({ error: 'Gemini API error', detail: err.error?.message })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Track Gemini token usage
    const geminiUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 1 }
    if (geminiData.usageMetadata) {
      geminiUsage.promptTokens = geminiData.usageMetadata.promptTokenCount || 0
      geminiUsage.completionTokens = geminiData.usageMetadata.candidatesTokenCount || 0
      geminiUsage.totalTokens = geminiData.usageMetadata.totalTokenCount || 0
    }

    // Parse tweets from numbered list (language-adaptive garbage filter)
    const garbageFilter = t.garbageFilter
    const tweets = rawText
      .split('\n')
      .map(line => line.replace(/^\d+[\.\)\/]\s*/, '').trim())
      .filter(line => line.length > 20 && garbageFilter(line))

    if (tweets.length === 0) {
      return res.status(500).json({ error: 'Generation failed', raw: rawText })
    }

    // 10. Score tweets
    const results = []
    const tweetsToProcess = mode === 'thread' ? tweets : tweets.slice(0, count)
    for (let idx = 0; idx < tweetsToProcess.length; idx++) {
      const tweet = tweetsToProcess[idx]
      let currentDraft = tweet
      let scoreData = null
      let attempts = 0
      const tweetOverrides = [...styleOverrides]

      // Thread pre-check: extend short tweets
      if (mode === 'thread' && currentDraft.length < 80) {
        const extendPrompt = t.extendPrompt(currentDraft, cloneMode && !styleUsesQuestion)
        const extRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: extendPrompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 200 } }) }
        )
        if (extRes.ok) {
          const extData = await extRes.json()
          const extended = extData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          if (extended && extended.length >= 80) {
            currentDraft = extended.replace(/^\d+[\.\)\/]\s*/, '').replace(/^["']|["']$/g, '')
          }
          if (extData.usageMetadata) {
            geminiUsage.calls++
            geminiUsage.promptTokens += extData.usageMetadata.promptTokenCount || 0
            geminiUsage.completionTokens += extData.usageMetadata.candidatesTokenCount || 0
            geminiUsage.totalTokens += extData.usageMetadata.totalTokenCount || 0
          }
        }
      }

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
          if (nonCtaFails.length === 0) break
        }

        if (scoreData.passed) break

        // Auto-revise non-CTA failures
        if (!cloneMode && failed.includes('Conversation-driving CTA') && !currentDraft.includes('?')) {
          currentDraft = currentDraft.replace(/[.!,]?\s*$/, '') + '?'
        }

        const minLength = mode === 'thread' ? 80 : 50
        if (currentDraft.length < minLength) {
          const targetRange = mode === 'thread' ? '80-180' : '60-120'
          const fixPrompt = t.fixShortPrompt(currentDraft, targetRange, cloneMode && !styleUsesQuestion)
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
            if (fixData.usageMetadata) {
              geminiUsage.calls++
              geminiUsage.promptTokens += fixData.usageMetadata.promptTokenCount || 0
              geminiUsage.completionTokens += fixData.usageMetadata.candidatesTokenCount || 0
              geminiUsage.totalTokens += fixData.usageMetadata.totalTokenCount || 0
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
      detectedLanguage: lang,
      questionRatio: Math.round(questionRatio * 100),
      tweets: results,
      totalGenerated: tweets.length,
      geminiUsage,
    })
  } catch (error) {
    console.error('Generate tweet error:', error)
    return res.status(500).json({ error: 'Failed to generate tweet', detail: error.message })
  }
}
