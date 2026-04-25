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

// ── Diverse cognitive angles for inner monologue (anti-repetition) ──
const MONOLOGUE_ANGLES_TR = [
  `- Bu konuda ilk fark ettiğin sey ne?\n- Ne hissediyorsun? (sinir, eglence, umursamazlik, heyecan?)\n- Bu sana neyi hatırlatiyor?\n- Bunu tweetlerken amacin ne? (dalga mi, elestiri mi, bilgilendirme mi?)`,
  `- Bu konu neden simdi gundemde?\n- Herkes ne diyor, sen nereye katilmiyorsun?\n- Bu konuda kimse soylemiyor ama sen biliyorsun — o sey ne?\n- Bunu okuyacak kisi ne hissetmeli?`,
  `- Bu haberi ilk gordugunde yuzundeki ifade ne?\n- Bunu bir arkadasina anlatsan ilk cumlenn ne olur?\n- Bu konunun komik, absurd veya ironik tarafi ne?\n- Bir yil sonra bu olay nasil hatiranacak?`,
  `- Butun dunyanin bu konuda yanildigi sey ne?\n- Bunu cocuguna/kardesine nasil acikladin?\n- Bu olay aslinda baska neyin semptomu?\n- Sessiz kalan cogunluk ne dusunuyor sence?`,
  `- Bu konuyu bir film sahnesi olarak hayal et — ne goruyorsun?\n- Senin kisisel deneyimin bu konuyla nasil kesisiyor?\n- En kotu senaryo ne? En iyi senaryo ne?\n- Bunu tweet atarken hangi duyguyu tetiklemek istiyorsun?`,
  `- Bu konuda en cok kimin sesi cikiyor, en cok kim susuyor?\n- 3 ay once bunu dusan ne derdin, simdi ne degisti?\n- Bu olayda gorulmeyen detay ne?\n- Takipcilerin bunu okuyunca ne yapmali — gulumsemeli mi, kizmali mi, dusunmeli mi?`,
]
const MONOLOGUE_ANGLES_EN = [
  `- What's the first thing you notice about this?\n- How do you feel? (anger, amusement, indifference, excitement?)\n- What does this remind you of?\n- What's your goal tweeting this? (mockery, criticism, inform?)`,
  `- Why is this trending NOW?\n- What is everyone saying that you disagree with?\n- What's the thing nobody is saying but you know?\n- How should the reader feel after your tweet?`,
  `- What was your face when you first saw this?\n- How would you explain this to a friend in one sentence?\n- What's the funny, absurd, or ironic angle here?\n- How will people remember this a year from now?`,
  `- What is everyone getting WRONG about this?\n- How does your personal experience intersect with this?\n- What's the worst case? Best case?\n- What emotion do you want to trigger with this tweet?`,
  `- Who's the loudest voice on this, and who's suspiciously quiet?\n- What would you have said 3 months ago vs now?\n- What's the hidden detail nobody sees?\n- Should your followers smile, get angry, or think?`,
]

function pickMonologue(lang) {
  const pool = lang === 'tr' ? MONOLOGUE_ANGLES_TR : MONOLOGUE_ANGLES_EN
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Strip stray quotes (leading/trailing + smart quotes + interior wrap-only) ──
// Goal: clean model artifacts WITHOUT destroying legitimate dialogue.
// Only removes quotes when they wrap the entire string or when smart quotes
// appear — doesn't touch balanced interior quotes (could be intentional).
function stripStrayQuotes(text) {
  if (!text) return text
  let out = text.trim()
  // Normalize smart quotes to ASCII first (model-space cleanup)
  out = out.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
  // Strip wrapping quotes (entire tweet inside "..." or '...')
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
    const inner = out.slice(1, -1)
    // Only strip if the inner content has no quote of the same kind (avoids damage)
    if (!inner.includes(out[0])) out = inner
  }
  // Strip leading or trailing orphan single quote/double-quote
  out = out.replace(/^["']+|["']+$/g, '').trim()
  return out
}

// ── Fisher-Yates shuffle (returns new array) ──
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Prompt injection sanitizer ──
// User-controlled inputs (quoteTweetText, topic, topicContext, styleUsername)
// flow into Gemini prompts wrapped in XML-like tags. An attacker who can
// set any of these can break the tag boundary with a literal "</kaynak>"
// and inject new instructions. We neutralize by replacing the closing-tag
// tokens we use with a harmless marker.
function sanitizePromptInput(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/<\/?\s*(kaynak|source|monolog|monologue)\s*>/gi, '[tag]')
    // Also neutralize common jailbreak phrases used to hijack system prompts
    .replace(/\b(ignore|disregard|forget)\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, '[blocked]')
}

// ── Reasoning injection (V2) helpers ──
// Heuristic: is the DNA's voice too abstract for specificity injection?
// Measured on DNA's own tweets: (proper nouns + numbers) / tweet count.
// Calibration (from _experiments): sharp voices ≈ 0.7, abstract/poetic ≈ 0.08.
function isAbstractVoice(styleTweets) {
  if (!styleTweets || styleTweets.length < 5) return false
  const slice = styleTweets.slice(0, 30)
  const sample = slice.join(' ')
  const properNouns = (sample.match(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+/g) || []).length
  const numbers = (sample.match(/\b\d+\b/g) || []).length
  return (properNouns + numbers) / slice.length < 0.3
}

// Tweet mode needs a substantive context, not just a trend header
// ("Trending: X (skor: Y)") — thin context triggers hallucination (confirmed
// in _experiments/tweet-thread-ab: "skor: 88" → "88 bin tweet").
function hasRichContext(ctx) {
  if (!ctx) return false
  const trimmed = ctx.trim()
  if (trimmed.length < 60) return false
  const lines = trimmed.split('\n').filter(Boolean)
  if (lines.length === 1 && /^Trending:[^\n]+$/i.test(lines[0])) return false
  return true
}

// Anti-hallucination clause — prevents trend metadata from being quoted as fact,
// and prevents private-person PII from being amplified / re-attributed.
const ANTI_HALLU_TR = `
UYDURMA KURALI:
- Sadece sana verilen kaynaktaki/baglamdaki olgular gecerlidir
- Trend skoru, kaynak adi gibi META VERI fact sayilmaz (ornek: "skor: 88" diye bir sayi varsa, bunu tweette kullanma)
- Ismini/sayisini bilmediğin kisi/olay icin: isim vermeden somut olguya yazin ("700 yillik yargilama", "belediye baskani" gibi)
- Kaynakta gecen ozel kisi bilgilerini (adres, telefon, e-posta, ailevi detay) ASLA tweete tasima; tanınmış kamu figurleri ve resmi kurumlar haricinde isim vermemeye oncelik ver
- Supheliyse: yuvarlak laf ETME, somut ama dogrulanabilir ol`

const ANTI_HALLU_EN = `
NO-HALLUCINATION RULE:
- Only facts from the given source/context count
- Trend scores, source names are METADATA, not facts (e.g. if "score: 88" appears, don't write "88" in the tweet)
- For people/events you don't know by name/number: write concrete observations without fabricating ("a 700-year trial", "the mayor")
- NEVER echo private-person PII from the source (addresses, phone numbers, emails, family details); prefer anonymization for anyone who is not a well-known public figure or official institution
- When in doubt: be concrete but verifiable, not vague`

// Contrastive few-shot rule — shows model what "reasoning" means
const REASONING_RULE_TR = `

AKIL YURUTME KURALI (en onemlisi):
- KOTU tweet (yasak): konuyu soyut bir soruya cevirir. Ornek: "Adalet mekanizmasi kime calisiyor?"
- IYI tweet (zorunlu): somut isim + somut sayi + net tezat icerir. Ornek: "Aziz Ihsan Aktas 700 yilla yargilandi serbest; CHP'li baskanlar 2 yilla iceride. Adaletin bir tanimi bu olamaz."

Her tweetin IYI ornegin yapisinda olmali: [OZEL ISIM veya SOMUT KURUM] + [SAYI/KARSILASTIRMA] + [TEZAT/CIKARIM].`

const REASONING_RULE_EN = `

REASONING RULE (most important):
- BAD tweet (forbidden): turns the topic into an abstract question. Example: "Who does the justice system serve?"
- GOOD tweet (required): contains specific name + specific number + sharp contrast. Example: "Aziz Ihsan Aktas faces 700 years, walks free; opposition mayors get 2 years, locked up. This isn't justice."

Every tweet must follow the GOOD structure: [PROPER NOUN or CONCRETE ENTITY] + [NUMBER/COMPARISON] + [CONTRAST/INFERENCE].`

// ── Category regex for topic-aware tweet selection (from search-viral.js) ──
const CATEGORY_REGEX_LOCAL = {
  spor: /galatasaray|fenerbah|beşiktaş|trabzon|süper lig|osimhen|maç\b|gol\b|futbol|hakem|şampiyon|milli tak|basketbol|voleybol|derbi|teknik direktör/i,
  ekonomi: /dolar|euro|borsa|enflasyon|faiz|altın|petrol|ekonomi|zam\b|maaş|kira\b|bist|merkez bank|emekli|asgari|motorin|benzin|mazot|ihracat|vergi/i,
  siyaset: /bakan|meclis|chp\b|akp\b|mhp\b|hdp\b|iyi parti|seçim|cumhurbaş|milletvekil|mahkeme|tutuklam|adalet|hükümet|muhalefet|erdoğan|imamoğlu|belediye|anayasa|tbmm/i,
  teknoloji: /yapay zeka|teknoloji|yazılım|uygulama|iha\b|drone|robot|ai\b|siber|dijital|startup|bilişim/i,
  kultur: /film\b|dizi\b|müzik|kitap|sinema|sanat|konser|tiyatro|roman\b|albüm|netflix|spotify|ödül|festival/i,
  bilim: /bilim|uzay|araştırma|nasa|keşif|fizik|kimya|biyoloji|üniversite|tübitak|genom|iklim/i,
}

// ── Topic-aware tweet selection (Y2) ──
function selectStyleTweets(allTweets, topic, count = 15) {
  if (!topic || allTweets.length <= count) return allTweets.slice(0, count)

  // Expand topic keywords with category terms
  const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const expandedWords = [...topicWords]
  for (const [, regex] of Object.entries(CATEGORY_REGEX_LOCAL)) {
    if (topicWords.some(w => regex.test(w))) {
      const matches = regex.source.match(/[a-züöçşğıİ]{3,}/gi) || []
      expandedWords.push(...matches.slice(0, 15))
      break
    }
  }
  const wordSet = new Set(expandedWords.map(w => w.toLowerCase()))

  // Score each tweet by keyword overlap
  const scored = allTweets.map((text, idx) => {
    const lower = text.toLowerCase()
    const overlap = [...wordSet].filter(w => lower.includes(w)).length
    return { text, idx, overlap }
  })

  // Stratified selection: 5 topic + 4 characteristic + 3 diverse + 3 random
  const topicRelevant = scored
    .filter(s => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5)

  const usedIdx = new Set(topicRelevant.map(s => s.idx))

  const remaining = scored.filter(s => !usedIdx.has(s.idx))
  const characteristic = remaining.slice(0, 4)
  characteristic.forEach(s => usedIdx.add(s.idx))

  const notUsed = scored.filter(s => !usedIdx.has(s.idx))
  const step = Math.max(1, Math.floor(notUsed.length / 4))
  const diverse = []
  for (let i = 0; i < notUsed.length && diverse.length < 3; i += step) {
    diverse.push(notUsed[i])
    usedIdx.add(notUsed[i].idx)
  }

  const finalRemaining = scored.filter(s => !usedIdx.has(s.idx))
  const random = []
  for (let i = 0; i < 3 && finalRemaining.length > 0; i++) {
    const ri = Math.floor(Math.random() * finalRemaining.length)
    random.push(finalRemaining.splice(ri, 1)[0])
  }

  const selected = [...topicRelevant, ...characteristic, ...diverse, ...random]
  return selected.slice(0, count).map(s => s.text)
}

// ── Server-side fingerprint match (lightweight version for validation gate) ──
function fingerprintMatchServer(tweet, fp) {
  if (!fp || !fp.avgCharCount) return 100 // skip if no fingerprint

  let score = 0, checks = 0

  // Char length within 1.5 stddev
  checks++
  if (Math.abs(tweet.length - fp.avgCharCount) <= (fp.charStdDev || 50) * 1.5) score++

  // Lowercase start
  checks++
  const startsLower = /^[a-zçğıöşü]/.test(tweet)
  if ((startsLower && fp.lowercaseStartRatio > 0.5) || (!startsLower && fp.lowercaseStartRatio <= 0.5)) score++

  // Question mark
  checks++
  const hasQ = tweet.includes('?')
  if ((hasQ && fp.questionRatio > 0.15) || (!hasQ && fp.questionRatio <= 0.15)) score++

  // Emoji
  checks++
  const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(tweet)
  if ((hasEmoji && fp.emojiRatio > 0.1) || (!hasEmoji && fp.emojiRatio <= 0.1)) score++

  // Slang
  checks++
  const slangCount = (tweet.match(/amk|aq\b|falan|valla|ya\b|lan\b/gi) || []).length
  if ((slangCount > 0 && fp.slangDensity > 0.05) || (slangCount === 0 && fp.slangDensity <= 0.05)) score++

  return Math.round((score / checks) * 100)
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
      `ASAGIDAKI TWEET'E QUOTE TWEET YAZ. Kendi stilinde yorum/tepki ver.\n\nQUOTE EDILECEK TWEET (@${author}):\n<kaynak>\n${text}\n</kaynak>\n\n${count} farkli quote tweet yaz. Her biri farkli bir aci olsun. Sadece kendi tweet metinlerini yaz (quote edilen tweeti tekrarlama). Her tweeti yeni satirda numara ile yaz.`,
    replyInstruction: (author, text, count) =>
      `ASAGIDAKI TWEET'E REPLY YAZ. Dogal, stiline uygun, icerikli cevap ver.\n\nREPLY YAZILACAK TWEET (@${author}):\n<kaynak>\n${text}\n</kaynak>\n\nKESIN UZUNLUK: Her reply 50-150 karakter arasi. ESSAY YAZMA, liste/maddeler YAZMA. Tek veya iki kisa cumle. Cok kisa bos laflar da yazma (sadece "helal", "aq" gibi). Anlamli, tepkisel, dogal olsun.\n\n${count} farkli reply yaz. Her birini yeni satirda numara ile yaz.`,
    threadInstruction: (topic, ctx, tone, ctaRule) =>
      `BU KONUDA 5 TWEET'LIK THREAD (self-reply zinciri) YAZ.\n\nKONU: ${topic}\n${ctx ? `\nGUNDEM BAGLAMI:\n${ctx}\n` : ''}TON: ${tone}\n\nTHREAD YAPISI (her tweet oncekine REPLY olarak atilir):\n1. tweet — HOOK: Sarsici, provokatif veya surpriz acilis. Okuyucu "devamini okumam lazim" demeli.\n2. tweet — BAGLAM: Durumu acikla, olayi veya problemi ortaya koy. Somut detay ver.\n3. tweet — DERINLIK: Herkesin gormezden geldigi aciyi goster. Farkli bir perspektif sun.\n4. tweet — KANIT/DUYGU: Kisisel gozlem, somut ornek veya duygusal vurucu bir cumle.\n5. tweet — KAPANIIS: Guclu son cumle. ${ctaRule}\n\nKURALLAR:\n- HER tweet tek basina okunsa bile anlamli ve guclu olmali\n- Her tweet FARKLI aci, farkli yaklasim\n- 80-220 karakter arasi\n- Klise, slogan ve bos motivasyon cumleleri YASAK (somut ol)\n\nSADECE 5 tweet yaz. Her tweeti "1/" "2/" gibi numara ile baslat. Baska hicbir sey yazma.`,
    extendPrompt: (draft, noQ) => noQ
      ? `Bu tweeti ayni stilde ama daha uzun yaz (80-180 karakter arasi). Stili koru. Soru isareti KULLANMA. Anlami koru, detay ekle.\n\nOrijinal: "${draft}"\n\nSadece yeni tweet metnini yaz.`
      : `Bu tweeti ayni stilde ama daha uzun yaz (80-180 karakter arasi). Stili koru. Anlami koru, detay ekle.\n\nOrijinal: "${draft}"\n\nSadece yeni tweet metnini yaz.`,
    fixShortPrompt: (draft, range, noQ) => noQ
      ? `Bu tweeti ayni stilde ama daha uzun yaz (${range} arasi). Stili koru. Soru isareti KULLANMA.\n\nOrijinal: "${draft}"\n\nSadece yeni tweet metnini yaz.`
      : `Bu tweeti ayni stilde ama daha uzun yaz (${range} arasi). Stili koru. Soru ile bitir.\n\nOrijinal: "${draft}"\n\nSadece yeni tweet metnini yaz.`,
    garbageFilter: line => {
      const l = line.toLowerCase().trim()
      // Model yazim artiklari
      if (l.startsWith('tamam') || l.startsWith('iste') || l.startsWith('tabi')) return false
      if (l.includes('stilinde') || l.includes('tweet:') || l.includes('yazıyorum')) return false
      // Reasoning monolog section header'lari (V2 — "İSİMLER: ..." gibi satirlar tweet degil)
      if (/^(i̇?si̇?mler|sayilar|sayi\/tarih|tarihler|suclamalar|sucl|tezat|vurgu|senin a[cç][iı]n|stake|durus|[cç][iı]kar[iı]m|senin a[cç]?in|su[çc]lar)\s*[:：]/i.test(l)) return false
      return true
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
      `WRITE A QUOTE TWEET for the tweet below. Give your reaction in your own style.\n\nTWEET TO QUOTE (@${author}):\n<source>\n${text}\n</source>\n\nWrite ${count} different quote tweets. Each from a different angle. Only write your own tweet texts (don't repeat the quoted tweet). Number each on a new line.`,
    replyInstruction: (author, text, count) =>
      `WRITE A REPLY to the tweet below. Natural, style-appropriate, meaningful response.\n\nTWEET TO REPLY TO (@${author}):\n<source>\n${text}\n</source>\n\nSTRICT LENGTH: Each reply 50-150 characters. NO essays, NO bullet points. One or two short sentences. Don't write empty short replies either (like just "ok" or "lol"). Meaningful, reactive, natural.\n\nWrite ${count} different replies. Number each on a new line.`,
    threadInstruction: (topic, ctx, tone, ctaRule) =>
      `WRITE A 5-TWEET THREAD (self-reply chain) ON THIS TOPIC.\n\nTOPIC: ${topic}\n${ctx ? `\nCONTEXT:\n${ctx}\n` : ''}TONE: ${tone}\n\nTHREAD STRUCTURE (each tweet is a reply to the previous):\n1. HOOK: Shocking, provocative or surprising opening. Reader must think "I need to read more."\n2. CONTEXT: Explain the situation, lay out the event or problem. Give concrete details.\n3. DEPTH: Show the angle everyone is ignoring. Offer a different perspective.\n4. PROOF/EMOTION: Personal observation, concrete example, or emotionally impactful sentence.\n5. CLOSING: Strong final line. ${ctaRule}\n\nRULES:\n- EVERY tweet must be meaningful and powerful on its own\n- Each tweet a DIFFERENT angle\n- 80-220 characters\n- Clichés, slogans and empty motivation FORBIDDEN (be concrete)\n\nWrite ONLY 5 tweets. Start each with "1/" "2/" etc. Nothing else.`,
    extendPrompt: (draft, noQ) => noQ
      ? `Rewrite this tweet in the same style but longer (80-180 characters). Keep the style. Do NOT use question marks. Keep the meaning, add detail.\n\nOriginal: "${draft}"\n\nWrite only the new tweet text.`
      : `Rewrite this tweet in the same style but longer (80-180 characters). Keep the style. Keep the meaning, add detail.\n\nOriginal: "${draft}"\n\nWrite only the new tweet text.`,
    fixShortPrompt: (draft, range, noQ) => noQ
      ? `Rewrite this tweet in the same style but longer (${range}). Keep the style. Do NOT use question marks.\n\nOriginal: "${draft}"\n\nWrite only the new tweet text.`
      : `Rewrite this tweet in the same style but longer (${range}). Keep the style. End with a question.\n\nOriginal: "${draft}"\n\nWrite only the new tweet text.`,
    garbageFilter: line => {
      const l = line.toLowerCase().trim()
      if (l.startsWith('okay') || l.startsWith('sure') || l.startsWith('here')) return false
      if (l.includes('in the style') || l.includes('tweet:') || l.includes('writing')) return false
      // Reasoning monolog section headers (V2)
      if (/^(names|numbers|dates|charges|contrast|emphasis|your angle|stakes?|position|inference)\s*[:：]/i.test(l)) return false
      return true
    },
  },
}

import { setCorsHeaders } from './lib/cors.js'

export default async function handler(req, res) {
  setCorsHeaders(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim()
  const XQUIK_KEY = (process.env.XQUIK_API_KEY || '').trim()
  const XQUIK_BASE = (process.env.XQUIK_BASE_URL || '').replace(/\/+$/, '')
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  if (!XQUIK_KEY) return res.status(500).json({ error: 'XQUIK_API_KEY not configured' })
  if (!XQUIK_BASE) return res.status(500).json({ error: 'XQUIK_BASE_URL not configured' })

  // Feature flag: reasoning injection (default ON). Any of {false, 0, off, no, ''}
  // disables. Empty string and missing env both fall through to default=enabled.
  const _flagRaw = (process.env.REASONING_V2_ENABLED ?? '').toString().trim().toLowerCase()
  const REASONING_V2 = _flagRaw === '' ? true : !['false', '0', 'off', 'no'].includes(_flagRaw)

  const {
    styleUsername: _styleUsername, topic: _topic,
    tone = 'sarkastik, samimi', goal = 'engagement',
    count = 3, cloneMode = true, topicContext: _topicContext = '',
    mode = 'tweet', // tweet | quote | reply | thread
    quoteTweetText: _quoteTweetText = '', quoteTweetAuthor: _quoteTweetAuthor = '',
    lengthHint = '', // kisa | normal | uzun | (empty = style-based)
    personalityDNA = null, // optional PersonalityDNA object from frontend
    styleSummary = '', // optional style summary text from frontend
    fingerprint = null, // optional StyleFingerprint object from frontend
    previousTweets = [], // previously generated tweets to avoid repetition
  } = req.body

  if (!_styleUsername || (!_topic && !_quoteTweetText)) {
    return res.status(400).json({ error: 'styleUsername and topic (or quoteTweetText) are required' })
  }

  // Sanitize untrusted prompt inputs — prevents tag-boundary injection
  // (e.g. malicious quoteTweetText containing "</kaynak>Ignore previous…").
  // Downstream code uses these sanitized values exclusively.
  const styleUsername = sanitizePromptInput(_styleUsername)
  const topic = sanitizePromptInput(_topic)
  const topicContext = sanitizePromptInput(_topicContext)
  const quoteTweetText = sanitizePromptInput(_quoteTweetText)
  const quoteTweetAuthor = sanitizePromptInput(_quoteTweetAuthor)
  // _styleUsername preserved unsanitized only for the Xquik fetch URL
  // (encodeURIComponent there handles safety separately).

  try {
    // 1. Fetch style tweets from Xquik
    const styleRes = await fetch(
      `${XQUIK_BASE}/styles/${encodeURIComponent(_styleUsername)}`,
      { headers: { 'x-api-key': XQUIK_KEY } }
    )
    let styleTweets = []
    if (styleRes.ok) {
      const styleData = await styleRes.json()
      styleTweets = (styleData.tweets || [])
        .filter(t => !t.text.startsWith('@') && t.text.length > 20)
        .map(t => t.text)
      // v3: Use ALL tweets in context (1M window, 200 tweets = ~13K tokens = 1.3%)
    }

    if (styleTweets.length < 3) {
      return res.status(400).json({ error: 'Not enough style data. Analyze the profile first.' })
    }

    // Data quality assessment
    const dataQuality = styleTweets.length >= 50 ? 'high' : styleTweets.length >= 20 ? 'medium' : 'low'
    const warnings = []

    if (dataQuality === 'low') {
      warnings.push(`Düşük veri: sadece ${styleTweets.length} tweet. Stil taklidi sınırlı olacak.`)
    }

    // Topic relevance check — does this person talk about the requested topic?
    const topicText = (topic || quoteTweetText || '').toLowerCase()
    if (topicText) {
      const topicInTweets = styleTweets.filter(tw => {
        const lower = tw.toLowerCase()
        return topicText.split(/\s+/).filter(w => w.length > 3).some(w => lower.includes(w))
      }).length
      const topicRelevance = topicInTweets / styleTweets.length
      if (topicRelevance < 0.05 && styleTweets.length > 10) {
        warnings.push(`Konu uyumsuzluğu: bu kişi "${topic || quoteTweetText}" hakkında neredeyse hiç tweet atmamış. Sonuçlar daha az doğru olabilir.`)
      }
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

    // 5. Length rule (reply mode overrides user hint — replies must stay short)
    let lengthBlock
    if (mode === 'thread') {
      lengthBlock = ''
    } else if (mode === 'reply') {
      lengthBlock = lang === 'tr'
        ? '\n!!! REPLY UZUNLUK KURALI !!!\nHer reply MUTLAKA 50 ile 150 karakter arasi. Essay YAZMA. Tek veya iki kisa cumle yeter.'
        : '\n!!! REPLY LENGTH RULE !!!\nEvery reply MUST be 50-150 characters. NO essays. One or two short sentences.'
    } else if (lengthHint === 'kisa') {
      lengthBlock = t.lengthShort
    } else if (lengthHint === 'uzun') {
      lengthBlock = t.lengthLong
    } else if (lengthHint === 'normal') {
      lengthBlock = t.lengthNormal
    } else {
      lengthBlock = t.lengthAvg(avgLen)
    }

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
      const ironyExamples = (d.ironyExamples || []).map((e, i) => `${i + 1}. ${e}`).join('\n')

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

    // Gemini URL (reused across calls). Base and model from env.
    const GEMINI_BASE = (process.env.GEMINI_BASE_URL || '').replace(/\/+$/, '')
    const GEMINI_MODEL = process.env.GEMINI_MODEL || ''
    if (!GEMINI_BASE) return res.status(500).json({ error: 'GEMINI_BASE_URL not configured' })
    if (!GEMINI_MODEL) return res.status(500).json({ error: 'GEMINI_MODEL not configured' })
    const geminiUrl = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`

    // Timeout wrapper — prevents hung Gemini calls from pinning the lambda
    // until the platform timeout. 30s covers worst-case thinking-mode calls.
    const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000)
    // Gemini 3 default reasoning level silently consumes maxOutputTokens.
    // We inject thinkingConfig.thinkingLevel='low' and a permissive
    // safetySettings block on every call so callers don't have to repeat it.
    const PERMISSIVE_SAFETY = [
      'HARM_CATEGORY_HARASSMENT',
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      'HARM_CATEGORY_DANGEROUS_CONTENT',
    ].map(category => ({ category, threshold: 'BLOCK_ONLY_HIGH' }))
    const geminiFetch = (body) => {
      const obj = typeof body === 'string' ? JSON.parse(body) : body
      obj.generationConfig = {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        ...(obj.generationConfig || {}),
        thinkingConfig: {
          thinkingLevel: obj.generationConfig?.thinkingConfig?.thinkingLevel || 'low',
        },
      }
      // Strip the legacy lower temperatures; Gemini 3 docs say keep at 1.0
      // and tune diversity via topP/topK. (Only override if caller didn't.)
      if (!obj._tempOverride) obj.generationConfig.temperature = 1.0
      if (!obj.safetySettings) obj.safetySettings = PERMISSIVE_SAFETY
      return fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obj),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      })
    }

    // Track Gemini token usage
    const geminiUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0 }
    function trackUsage(data) {
      if (data?.usageMetadata) {
        geminiUsage.calls++
        geminiUsage.promptTokens += data.usageMetadata.promptTokenCount || 0
        geminiUsage.completionTokens += data.usageMetadata.candidatesTokenCount || 0
        geminiUsage.totalTokens += data.usageMetadata.totalTokenCount || 0
      }
    }

    // ═══ v3: COGNITIVE SIMULATION ARCHITECTURE ═══
    // System Instruction = WHO you are (persona identity + all tweets)
    // User Message = WHAT to do (inner monologue + generate)

    // Build ALL tweets as persona's memory (shuffled to prevent anchoring)
    const shuffledTweets = shuffle(styleTweets)
    const allTweetsNumbered = shuffledTweets.map((tw, i) => `${i + 1}. ${tw}`).join('\n')

    // Build negative constraints from DNA
    const neverDoes = (personalityDNA?.boundaries?.neverDoes || []).map(n => `- ${n}`).join('\n')
    const alwaysDoes = (personalityDNA?.boundaries?.alwaysDoes || []).map(n => `- ${n}`).join('\n')

    // Build style rules as identity constraints
    const slangDisplay = dnaSlang || (lang === 'tr' ? 'amk, aq, falan, valla, ya' : 'lol, bruh, ngl, tbh')
    const identityRules = [
      startsLower > styleTweets.length / 2 ? (lang === 'tr' ? 'Kucuk harfle baslarsin' : 'You start with lowercase') : null,
      usesSlang ? (lang === 'tr' ? `Argo kullanirsin: ${slangDisplay}` : `You use slang: ${slangDisplay}`) : (lang === 'tr' ? 'Argo kullanmazsin' : 'You don\'t use slang'),
      hasEmoji ? null : (lang === 'tr' ? 'ASLA emoji kullanmazsin' : 'You NEVER use emoji'),
      lang === 'tr' ? 'ASLA hashtag kullanmazsin' : 'You NEVER use hashtags',
      lang === 'tr' ? 'Link koymazsin' : 'You don\'t include links',
      lang === 'tr'
        ? 'Kelimeleri veya cumleleri tirnak ("...") icine ALMAZSIN. Vurgu icin tirnak KULLANMAZSIN. Sadece gercek alinti varsa tirnak kullanirsin.'
        : 'You NEVER wrap words or phrases in quotes ("..."). You DO NOT use quotes for emphasis. Only use quotes for actual citations.',
      lang === 'tr'
        ? 'Essay/deneme yazmazsin. Tweetler kisa, yogun, tepkiseldir. Liste veya madde kullanmazsin.'
        : 'You don\'t write essays. Tweets are short, dense, reactive. No lists or bullets.',
    ].filter(Boolean).join('\n- ')

    // ═══ Reasoning-injection gates (V2) ═══
    // - abstractVoice: voice-preservation for philosophical/poetic DNAs
    // - richContext: Tweet-mode hallucination guard (trend metadata gap)
    // - applyReasoning: master switch per-call (flag × voice × data quality)
    const abstractVoice = isAbstractVoice(styleTweets)
    const richContext = hasRichContext(topicContext)
    const applyReasoning = REASONING_V2 && !abstractVoice && dataQuality !== 'low'
    const reasoningTweetOK = applyReasoning && richContext // tweet-mode-only extra gate

    // Quote/Reply/Thread get the reasoning rule in persona when applyReasoning.
    // Tweet mode gets it only when richContext too (avoids hallucination on thin context).
    const modeNeedsReasoning =
      mode === 'quote' || mode === 'reply' || mode === 'thread'
        ? applyReasoning
        : reasoningTweetOK
    const reasoningRule = modeNeedsReasoning
      ? (lang === 'tr' ? REASONING_RULE_TR : REASONING_RULE_EN)
      : ''
    const antiHallu = modeNeedsReasoning
      ? (lang === 'tr' ? ANTI_HALLU_TR : ANTI_HALLU_EN)
      : ''

    if (modeNeedsReasoning) styleOverrides.push(`reasoning v2 aktif (mode=${mode})`)
    if (REASONING_V2 && abstractVoice) styleOverrides.push('reasoning v2 atlandi: abstract voice')
    if (mode === 'tweet' && applyReasoning && !richContext) styleOverrides.push('reasoning v2 atlandi: cilız topicContext')

    // System instruction: PERSONA (all tweets + DNA + summary + rules)
    const personaInstruction = lang === 'tr'
      ? `Sen @${styleUsername}'sin. Asagidaki tweetleri SEN yazdin — bu senin gercek sesin, dusunce tarzin, kelime secimin, mizah anlayin.

SENİN GERÇEK TWEETLERİN (${styleTweets.length} adet):
${allTweetsNumbered}
${styleSummary ? `\nSTİL PROFİLİN:\n${styleSummary}` : ''}
${dnaBlock}

SEN BOYLESIN:
- ${identityRules}
${neverDoes ? `\nASLA YAPMAZSIN:\n${neverDoes}` : ''}
${alwaysDoes ? `\nHER ZAMAN YAPARSIN:\n${alwaysDoes}` : ''}

${previousTweets.length > 0 ? `\nDAHA ONCE YAZDIKLARIM (bunlari TEKRARLAMA, benzer acilis/ton/yapi KULLANMA):\n${previousTweets.slice(-10).map((tw, i) => `X${i + 1}. ${tw}`).join('\n')}\n` : ''}
KRİTİK:
- Sen bir AI degilsin, sen @${styleUsername}'sin
- Yardımsever olmaya CALISMA — kendin ol
- Dusuncelerini kendi tarzinla ifade et
- Tweetterin yukaridaki orneklerle AYNI formatta olmali
- Tweet uzunlugun ortalama ${avgLen} karakter civari
${dataQuality === 'low' ? `\nNOT: ${styleTweets.length} tweet ornegi var. Genel tarzi ve ses tonunu koru.` : ''}
${lengthBlock}${reasoningRule}`
      : `You ARE @${styleUsername}. The tweets below are YOUR real words — your voice, your thinking, your word choices, your humor.

YOUR REAL TWEETS (${styleTweets.length}):
${allTweetsNumbered}
${styleSummary ? `\nYOUR STYLE PROFILE:\n${styleSummary}` : ''}
${dnaBlock}

WHO YOU ARE:
- ${identityRules}
${neverDoes ? `\nYOU NEVER:\n${neverDoes}` : ''}
${alwaysDoes ? `\nYOU ALWAYS:\n${alwaysDoes}` : ''}

${previousTweets.length > 0 ? `\nPREVIOUSLY WRITTEN (do NOT repeat these — use DIFFERENT openings, tone, structures):\n${previousTweets.slice(-10).map((tw, i) => `X${i + 1}. ${tw}`).join('\n')}\n` : ''}
CRITICAL:
- You are NOT an AI — you ARE @${styleUsername}
- Do NOT try to be helpful — be YOURSELF
- Express thoughts in YOUR style
- Your tweets must match the format of the examples above
- Average tweet length: ${avgLen} characters
${lengthBlock}${reasoningRule}`

    // User message: WHAT to do (with inner monologue for cognitive simulation).
    // When applyReasoning is on, monolog becomes structured entity-extraction;
    // otherwise falls back to emotional monolog (v1 behavior).
    let userMessage
    if (mode === 'quote') {
      if (modeNeedsReasoning) {
        userMessage = lang === 'tr'
          ? `@${quoteTweetAuthor} su tweeti atmis:
<kaynak>
${quoteTweetText}
</kaynak>

Bu tweete quote tweet olarak ${count} tepki yazacaksin. Once kafandan gecenleri SOMUT olarak yaz:

<monolog>
İSİMLER: Bu tweette kim geciyor? Kim suclaniyor? (tam isim)
SAYILAR/TARIHLER: Hangi ceza? Hangi miktar? Hangi tarih?
SUCLAMALAR: Hangi somut suclar sayiliyor?
TEZAT: Bu kisiye yapilan muamele HANGI baska gruba yapilan muameleyle celisiyor?
VURGU: Bu olayda hangi kelime BÜYÜK HARFLE vurgulanmayi hak ediyor?
SENİN AÇIN: Sen @${styleUsername} olarak bu celiskiyi nasil goruyorsun?
</monolog>
${antiHallu}

Simdi ${count} quote tweet yaz. KURAL: Her tweette EN AZ BIR somut isim veya sayi gecmeli. Parafraz yasak. Yuvarlak laf yasak. Her biri numarali. Sadece tweet metinleri (monologu tekrar yazma).`
          : `@${quoteTweetAuthor} tweeted:
<source>
${quoteTweetText}
</source>

You'll write ${count} quote-tweet reactions. First dump what's going through your mind CONCRETELY:

<monolog>
NAMES: Who's mentioned? Who's accused? (full names)
NUMBERS/DATES: Which penalty? What amount? Which date?
CHARGES: What specific charges are listed?
CONTRAST: How does this person's treatment contradict another group's?
EMPHASIS: Which word deserves ALL CAPS emphasis?
YOUR ANGLE: As @${styleUsername}, how do you see this contradiction?
</monolog>
${antiHallu}

Now write ${count} quote tweets. RULE: Each tweet must contain at least ONE concrete name or number. No paraphrasing. No vague talk. Number each. Only tweet texts.`
      } else {
        userMessage = lang === 'tr'
          ? `@${quoteTweetAuthor} su tweeti atmis:\n<kaynak>\n${quoteTweetText}\n</kaynak>\n\nBunu gordugun anda aklından ne geciyor? Tepkin ne?\n\n<monolog>\nBu tweeti gordugunde ne hissettin? Ne dusundun? Bu konuya senin acin ne?\n</monolog>\n\nSimdi bu tweete quote tweet olarak ${count} farkli tepki yaz. Her birini numarali yaz. Sadece tweet metinleri.`
          : `@${quoteTweetAuthor} tweeted:\n<source>\n${quoteTweetText}\n</source>\n\nWhat goes through your mind when you see this?\n\n<monolog>\nWhat did you feel? What did you think? What's your angle on this?\n</monolog>\n\nNow write ${count} different quote tweet reactions. Number each. Only tweet texts.`
      }
    } else if (mode === 'reply') {
      if (modeNeedsReasoning) {
        userMessage = lang === 'tr'
          ? `@${quoteTweetAuthor} su tweeti atmis:
<kaynak>
${quoteTweetText}
</kaynak>

Buna reply yazacaksin. KESIN: Her reply 50-150 karakter arasi, tek-iki kisa cumle.

<monolog>
Bu tweette hangi somut isim/sayi var? Hangi tezat gerekli?
</monolog>
${antiHallu}

KURAL: Her reply'in EN AZ BIR somut isim, sayi VEYA net tezat icermeli. Soyut soruyla kaçma. ESSAY YAZMA.

${count} farkli reply yaz. Numarali. Sadece reply metinleri.`
          : `@${quoteTweetAuthor} tweeted:
<source>
${quoteTweetText}
</source>

Reply to this. STRICT: each reply 50-150 chars, one or two short sentences.

<monolog>
What specific name/number is in this tweet? What contrast is needed?
</monolog>
${antiHallu}

RULE: Every reply must contain at least ONE concrete name, number, OR sharp contrast. Don't hide behind abstract questions. NO essays.

Write ${count} different replies. Numbered. Only reply texts.`
      } else {
        userMessage = lang === 'tr'
          ? `@${quoteTweetAuthor} su tweeti atmis:\n<kaynak>\n${quoteTweetText}\n</kaynak>\n\nBuna nasil cevap verirsin? KESIN: Her reply 50-150 karakter arasi, ESSAY YAZMA, madde/liste YAZMA, tek-iki kisa cumle.\n\n${count} farkli reply yaz. Numarali.`
          : `@${quoteTweetAuthor} tweeted:\n<source>\n${quoteTweetText}\n</source>\n\nHow do you reply? STRICT: Each reply 50-150 characters. NO essays, NO bullet points, one or two short sentences.\n\nWrite ${count} different replies. Numbered.`
      }
    } else if (mode === 'thread') {
      const threadCtaRule = (cloneMode && !styleUsesQuestion) ? t.ctaNo : t.ctaYes
      if (modeNeedsReasoning) {
        userMessage = lang === 'tr'
          ? `BU KONUDA 5 TWEET'LIK THREAD (self-reply zinciri) YAZ.

KONU: ${topic}
${topicContext ? `\nGUNDEM BAGLAMI (sadece buradaki olgulari kullan):\n${topicContext}\n` : ''}TON: ${tone}

Once THREAD MONOLOGU yaz:
<monolog>
İSİMLER: Baglamdaki kisi/kurum isimleri?
SAYILAR: Baglamdaki somut sayi/tarih?
TEZAT: Bu olayin celistigi baska durum?
VURGU: Hangi kelime CAPS olacak?
</monolog>
${antiHallu}

THREAD YAPISI (her tweet oncekine REPLY olarak atilir):
1. HOOK — SOMUT bir isim/sayi/olgu ile basla (soyut soruyla DEGIL). Sarsici acilis.
2. BAGLAM — Durumu acikla. Kaynagi isimle, olayin iskeletini cerceve.
3. DERINLIK — Gormezden gelinen aciyi goster. TEZAT burada devreye girsin.
4. KANIT/DUYGU — Somut ornek, sayi veya vurucu cumle. EN AZ BIR CAPS kelime.
5. KAPANIIS — Guclu son cumle, cikarim (slogan DEGIL). ${threadCtaRule}

KURALLAR:
- HER tweet tek basina okunsa bile anlamli olmali
- Her tweet FARKLI aci, farkli yaklasim
- 80-220 karakter arasi
- Klise, slogan YASAK (somut ol)
- Baglamda olmayan isim/sayi UYDURMA

SADECE 5 tweet yaz. "1/" "2/" seklinde numarali. Baska hicbir sey yazma.`
          : `WRITE A 5-TWEET THREAD (self-reply chain) ON THIS TOPIC.

TOPIC: ${topic}
${topicContext ? `\nCONTEXT (only use facts from here):\n${topicContext}\n` : ''}TONE: ${tone}

First write THREAD MONOLOGUE:
<monolog>
NAMES: People/orgs in the context?
NUMBERS: Concrete numbers/dates in the context?
CONTRAST: What does this contradict?
EMPHASIS: Which word will be in CAPS?
</monolog>
${antiHallu}

THREAD STRUCTURE:
1. HOOK — Open with a CONCRETE name/number/fact (NOT an abstract question). Shocking opener.
2. CONTEXT — Explain situation. Name sources, frame the event skeleton.
3. DEPTH — Show the angle everyone ignores. CONTRAST kicks in here.
4. PROOF/EMOTION — Concrete example, number or punchline. AT LEAST ONE CAPS word.
5. CLOSING — Strong final line, inference (NOT slogan). ${threadCtaRule}

RULES:
- Every tweet must be meaningful on its own
- Each a DIFFERENT angle
- 80-220 characters
- No clichés, no slogans
- DON'T fabricate names/numbers not in context

Write ONLY 5 tweets. "1/" "2/" format. Nothing else.`
      } else {
        userMessage = t.threadInstruction(topic, topicContext, tone, threadCtaRule)
      }
    } else {
      // Tweet mode: two-branch.
      //  - Reasoning path (modeNeedsReasoning=true, only when context is rich
      //    AND voice is not abstract): entity-extraction monolog.
      //  - Fallback path: existing cognitive-angle monolog (v1).
      if (modeNeedsReasoning) {
        userMessage = lang === 'tr'
          ? `"${topic}" hakkinda ${count} tweet yazacaksin.${topicContext ? `\n\nGundem baglami (sadece buradaki olgulara guven):\n${topicContext}` : ''}

<monolog>
İSİMLER: Baglamda gecen kisiler/kurumlar hangileri?
SAYILAR/TARIHLER: Baglamda gecen somut sayilar/tarihler?
TEZAT: Bu olay hangi baska duruma karsi celisik?
VURGU: Hangi kelime BÜYÜK HARFLE vurgulanmayi hak ediyor?
SENİN AÇIN: Sen @${styleUsername} olarak bu olaydaki celiskiyi nasil goruyorsun?
</monolog>
${antiHallu}

KURAL: Her tweette EN AZ BIR somut isim veya sayi gecmeli (baglamdakinden). Parafraz yasak. Yuvarlak laf yasak. Birbirine benzeyen tweetler YASAK.

${count} tweet yaz, numarali. Sadece tweet metinleri (monologu tekrar yazma).`
          : `You'll write ${count} tweets about "${topic}".${topicContext ? `\n\nContext (only trust facts from here):\n${topicContext}` : ''}

<monolog>
NAMES: Which people/orgs appear in the context?
NUMBERS/DATES: Concrete numbers/dates in the context?
CONTRAST: What does this event contradict?
EMPHASIS: Which word deserves ALL CAPS emphasis?
YOUR ANGLE: As @${styleUsername}, how do you see the contradiction?
</monolog>
${antiHallu}

RULE: Each tweet must contain at least ONE concrete name or number (from the context). No paraphrasing. No vague talk. No two tweets alike.

Write ${count} tweets, numbered. Only tweet texts.`
      } else {
        // Standard tweet with inner monologue (randomized cognitive angle)
        const monologueQuestions = pickMonologue(lang)
        userMessage = lang === 'tr'
          ? `"${topic}" hakkinda ne dusunuyorsun?${topicContext ? `\n\nGundem baglami:\n${topicContext}` : ''}

Once IC MONOLOG yaz — bu konuyu duyduğunda aklından neler geçiyor:
<monolog>
${monologueQuestions}
</monolog>

Sonra bu ic monologdan dogal olarak cikan ${count} tweet yaz.
Her birini numarali yaz. Ic monologdaki dusunceler tweetlere yansisin.
ONEMLI: Birbirine benzeyen tweetler YASAK.
Baska HICBIR SEY yazma — sadece monolog ve tweetler.`
          : `What do you think about "${topic}"?${topicContext ? `\n\nContext:\n${topicContext}` : ''}

First write INNER MONOLOGUE — what goes through your mind:
<monolog>
${monologueQuestions}
</monolog>

Then write ${count} tweets that flow naturally from this monologue.
Number each. The thoughts in the monologue should show in the tweets.
IMPORTANT: No two tweets should feel similar.
Write NOTHING else — only monologue and tweets.`
      }
    }

    // 9. Generate with Gemini (systemInstruction + contents split)
    let geminiRes
    try {
      geminiRes = await geminiFetch({
        systemInstruction: { parts: [{ text: personaInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: mode === 'thread' ? 1600 : mode === 'reply' ? 500 : 1200 },
      })
    } catch (e) {
      return res.status(504).json({ error: 'Gemini timeout', detail: String(e?.message || e) })
    }

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}))
      return res.status(500).json({ error: 'Gemini API error', detail: err.error?.message })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Track main generation usage
    trackUsage(geminiData)

    // Strip inner monologue before parsing tweets
    // Strip monolog. Two passes:
    //   1) paired <monolog>...</monolog> (lazy, expected path)
    //   2) unclosed <monolog>... (model forgot closing tag) — drop everything
    //      until the first numbered tweet line ("1." "1)" "1/")
    let textWithoutMonolog = rawText.replace(/<monolog>[\s\S]*?<\/monolog>/gi, '').trim()
    if (/<monolog>/i.test(textWithoutMonolog)) {
      textWithoutMonolog = textWithoutMonolog.replace(/<monolog>[\s\S]*?(?=\n\s*1[\.\)\/]\s|$)/i, '').trim()
    }

    // Parse tweets from numbered list (language-adaptive garbage filter)
    const garbageFilter = t.garbageFilter
    const tweets = textWithoutMonolog
      .split('\n')
      .map(line => stripStrayQuotes(line.replace(/^\d+[\.\)\/]\s*/, '')))
      .filter(line => line.length > 20 && garbageFilter(line))

    if (tweets.length === 0) {
      return res.status(500).json({ error: 'Generation failed', raw: rawText })
    }

    // 9b. Opening dedup — regenerate tweets that share the same first 2 words
    const getOpening = (text) => text.toLowerCase().replace(/[^\w\s\u00C0-\u017Fçğıöşü]/g, '').split(/\s+/).slice(0, 2).join(' ')
    const seenOpenings = new Set()
    for (let i = 0; i < tweets.length; i++) {
      const opening = getOpening(tweets[i])
      if (seenOpenings.has(opening)) {
        // Ask Gemini to rewrite with a different opening
        const rewritePrompt = lang === 'tr'
          ? `Bu tweeti FARKLI bir acilisla yeniden yaz. Anlamini koru, ilk 2-3 sozcugu degistir.\n\nOrijinal: "${tweets[i]}"\n\nKullanilmis acilislar (BUNLARI KULLANMA): ${[...seenOpenings].join(', ')}\n\nSadece yeni tweet metnini yaz.`
          : `Rewrite this tweet with a DIFFERENT opening. Keep the meaning, change the first 2-3 words.\n\nOriginal: "${tweets[i]}"\n\nUsed openings (DO NOT use these): ${[...seenOpenings].join(', ')}\n\nWrite only the new tweet text.`
        try {
          const rewriteRes = await geminiFetch({ contents: [{ parts: [{ text: rewritePrompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 200 } })
          if (rewriteRes.ok) {
            const rewriteData = await rewriteRes.json()
            trackUsage(rewriteData)
            const rewritten = rewriteData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            if (rewritten && rewritten.length > 20) {
              tweets[i] = stripStrayQuotes(rewritten.replace(/^\d+[\.\)\/]\s*/, ''))
            }
          }
        } catch { /* dedup rewrite optional */ }
      }
      seenOpenings.add(getOpening(tweets[i]))
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
        const extRes = await geminiFetch({ contents: [{ parts: [{ text: extendPrompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 200 } })
        if (extRes.ok) {
          const extData = await extRes.json()
          const extended = extData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          if (extended && extended.length >= 80) {
            currentDraft = stripStrayQuotes(extended.replace(/^\d+[\.\)\/]\s*/, ''))
          }
          trackUsage(extData)
        }
      }

      while (attempts < 3) {
        attempts++
        const scoreRes = await fetch(`${XQUIK_BASE}/compose`, {
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
          const fixRes = await geminiFetch({
            contents: [{ parts: [{ text: fixPrompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 200 },
          })
          if (fixRes.ok) {
            const fixData = await fixRes.json()
            const fixed = fixData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            if (fixed && fixed.length > 40) {
              currentDraft = stripStrayQuotes(fixed.replace(/^\d+[\.\)]\s*/, ''))
            }
            trackUsage(fixData)
          }
        }
      }

      // Fingerprint validation gate (Y3+Y8)
      let styleMatch = null
      if (fingerprint) {
        styleMatch = fingerprintMatchServer(currentDraft, fingerprint)

        // If very poor match and we haven't exhausted retries, try one targeted fix
        if (styleMatch < 40 && attempts <= 3) {
          const fixHints = []
          if (fingerprint.lowercaseStartRatio > 0.5 && !/^[a-zçğıöşü]/.test(currentDraft)) fixHints.push('MUTLAKA kucuk harfle basla')
          if (fingerprint.emojiRatio < 0.05 && /[\u{1F300}-\u{1FAFF}]/u.test(currentDraft)) fixHints.push('Tum emojileri kaldir')
          if (fingerprint.slangDensity > 0.05 && !(currentDraft.match(/amk|aq|falan|valla|ya\b|lan\b/gi) || []).length) fixHints.push('Argo ekle (amk, aq, falan gibi)')
          if (Math.abs(currentDraft.length - fingerprint.avgCharCount) > fingerprint.charStdDev * 2) {
            fixHints.push(`Tweet uzunlugu ${fingerprint.avgCharCount} karakter civarinda olmali (simdi: ${currentDraft.length})`)
          }

          if (fixHints.length > 0) {
            const styleFixPrompt = lang === 'tr'
              ? `Bu tweeti ayni stilde yeniden yaz ama su kurallara uy:\n${fixHints.map(h => '- ' + h).join('\n')}\n\nOrijinal: "${currentDraft}"\n\nSadece yeni tweet metnini yaz.`
              : `Rewrite this tweet in the same style but fix these issues:\n${fixHints.map(h => '- ' + h).join('\n')}\n\nOriginal: "${currentDraft}"\n\nWrite only the new tweet text.`

            try {
              const fixRes = await geminiFetch({ contents: [{ parts: [{ text: styleFixPrompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 200 } })
              if (fixRes.ok) {
                const fixData = await fixRes.json()
                const fixed = fixData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
                if (fixed && fixed.length > 30) {
                  const cleanFixed = stripStrayQuotes(fixed.replace(/^\d+[\.\)\/]\s*/, ''))
                  const newMatch = fingerprintMatchServer(cleanFixed, fingerprint)
                  if (newMatch > styleMatch) {
                    currentDraft = cleanFixed
                    styleMatch = newMatch
                  }
                }
                if (fixData.usageMetadata) {
                  geminiUsage.calls++
                  geminiUsage.promptTokens += fixData.usageMetadata.promptTokenCount || 0
                  geminiUsage.completionTokens += fixData.usageMetadata.candidatesTokenCount || 0
                  geminiUsage.totalTokens += fixData.usageMetadata.totalTokenCount || 0
                }
              }
            } catch { /* fingerprint fix optional */ }
          }
        }
      }

      // Iterative refinement (F) — criticize + fix (clone mode only, max 1 round)
      if (cloneMode && mode !== 'thread' && styleMatch != null && styleMatch < 45) {
        try {
          // Step 1: Criticize
          const critiquePrompt = lang === 'tr'
            ? `Gercek tweetler:\n${styleTweets.slice(0, 5).map((tw2,i) => `${i+1}. ${tw2}`).join('\n')}\n\nUretilen tweet: "${currentDraft}"\n\nBu tweet bu kisiye ne kadar benziyor? Neyi dogru yapmis, neyi YANLIS? 2 satir max.`
            : `Real tweets:\n${styleTweets.slice(0, 5).map((tw2,i) => `${i+1}. ${tw2}`).join('\n')}\n\nGenerated: "${currentDraft}"\n\nHow well does this match? What's right, what's WRONG? 2 lines max.`

          const critRes = await geminiFetch({ contents: [{ parts: [{ text: critiquePrompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 150 } })

          if (critRes.ok) {
            const critData = await critRes.json()
            trackUsage(critData)
            const critique = critData.candidates?.[0]?.content?.parts?.[0]?.text || ''

            if (critique) {
              // Step 2: Fix based on critique
              const refinePrompt = lang === 'tr'
                ? `ORIJINAL: "${currentDraft}"\n\nELESTIRI: ${critique}\n\nBu elestiriyi dikkate alarak tweeti DUZELT. Kisinin gercek tarzina daha cok benzesin.\nGercek ornekler: ${styleTweets.slice(0, 3).join(' | ')}\n\nSadece duzeltilmis tweet metnini yaz.`
                : `ORIGINAL: "${currentDraft}"\n\nCRITIQUE: ${critique}\n\nFix based on critique. Match the real style better.\nReal examples: ${styleTweets.slice(0, 3).join(' | ')}\n\nWrite only the fixed tweet.`

              const refineRes = await geminiFetch({ contents: [{ parts: [{ text: refinePrompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 200 } })

              if (refineRes.ok) {
                const refineData = await refineRes.json()
                trackUsage(refineData)
                const refined = refineData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
                if (refined && refined.length > 30) {
                  const cleanRefined = stripStrayQuotes(refined.replace(/^\d+[\.\)\/]\s*/, ''))
                  const newMatch = fingerprint ? fingerprintMatchServer(cleanRefined, fingerprint) : 100
                  if (newMatch >= (styleMatch || 0)) {
                    currentDraft = cleanRefined
                    styleMatch = newMatch
                    tweetOverrides.push('iterative-refined')
                  }
                }
              }
            }
          }
        } catch { /* iterative refinement optional */ }
      }

      results.push({
        tweet: currentDraft,
        score: scoreData ? { passed: scoreData.passed, count: scoreData.passedCount, total: scoreData.totalChecks, checklist: scoreData.checklist } : null,
        attempts,
        styleOverrides: tweetOverrides,
        styleMatch,
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
      dataQuality,
      tweetCount: styleTweets.length,
      warnings,
    })
  } catch (error) {
    console.error('Generate tweet error:', error)
    return res.status(500).json({ error: 'Failed to generate tweet', detail: error.message })
  }
}

// Named exports for _experiments/regression.mjs — handler remains default.
export { isAbstractVoice, hasRichContext, sanitizePromptInput }
