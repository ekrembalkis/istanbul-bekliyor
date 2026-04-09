// Style Fingerprint — zero-cost computational style analysis
// No API calls, pure JS metrics from tweet text arrays

export interface StyleFingerprint {
  avgWordCount: number
  avgCharCount: number
  charStdDev: number
  questionRatio: number
  exclamationRatio: number
  lowercaseStartRatio: number
  emojiRatio: number
  avgCommas: number
  punctuationDensity: number
  slangDensity: number
  vocabularyRichness: number
  topBigrams: string[]
  computedAt: string
}

const SLANG_REGEX = /amk|aq\b|falan|valla|ya\b|lan\b|mk\b|ulan|aq$|lol|lmao|bruh|ngl|tbh/gi

export function computeFingerprint(tweets: string[]): StyleFingerprint {
  const texts = tweets.filter(t => t && t.length > 10)
  if (texts.length === 0) {
    return {
      avgWordCount: 0, avgCharCount: 0, charStdDev: 0,
      questionRatio: 0, exclamationRatio: 0, lowercaseStartRatio: 0,
      emojiRatio: 0, avgCommas: 0, punctuationDensity: 0,
      slangDensity: 0, vocabularyRichness: 0, topBigrams: [],
      computedAt: new Date().toISOString(),
    }
  }

  const charCounts = texts.map(t => t.length)
  const wordCounts = texts.map(t => t.split(/\s+/).length)
  const avgCharCount = charCounts.reduce((a, b) => a + b, 0) / texts.length
  const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / texts.length
  const charStdDev = Math.sqrt(charCounts.reduce((s, c) => s + (c - avgCharCount) ** 2, 0) / texts.length)

  const questionRatio = texts.filter(t => t.includes('?')).length / texts.length
  const exclamationRatio = texts.filter(t => t.includes('!')).length / texts.length
  const lowercaseStartRatio = texts.filter(t => /^[a-zçğıöşü]/.test(t)).length / texts.length
  const emojiRatio = texts.filter(t => /[\u{1F300}-\u{1FAFF}]/u.test(t)).length / texts.length
  const avgCommas = texts.map(t => (t.match(/,/g) || []).length).reduce((a, b) => a + b, 0) / texts.length

  // Punctuation density
  const allText = texts.join('')
  const punctCount = allText.replace(/[^.,!?;:…–—]/g, '').length
  const punctuationDensity = allText.length > 0 ? punctCount / allText.length : 0

  // Slang density
  const slangDensity = texts.map(t => (t.match(SLANG_REGEX) || []).length).reduce((a, b) => a + b, 0) / texts.length

  // Vocabulary richness (type-token ratio)
  const allWords = texts.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 1)
  const uniqueWords = new Set(allWords)
  const vocabularyRichness = allWords.length > 0 ? uniqueWords.size / allWords.length : 0

  // Top bigrams
  const bigrams: Record<string, number> = {}
  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/)
    for (let i = 0; i < words.length - 1; i++) {
      const bg = `${words[i]} ${words[i + 1]}`
      bigrams[bg] = (bigrams[bg] || 0) + 1
    }
  }
  const topBigrams = Object.entries(bigrams)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(e => e[0])

  return {
    avgWordCount: +avgWordCount.toFixed(1),
    avgCharCount: +avgCharCount.toFixed(1),
    charStdDev: +charStdDev.toFixed(1),
    questionRatio: +questionRatio.toFixed(2),
    exclamationRatio: +exclamationRatio.toFixed(2),
    lowercaseStartRatio: +lowercaseStartRatio.toFixed(2),
    emojiRatio: +emojiRatio.toFixed(2),
    avgCommas: +avgCommas.toFixed(1),
    punctuationDensity: +punctuationDensity.toFixed(3),
    slangDensity: +slangDensity.toFixed(2),
    vocabularyRichness: +vocabularyRichness.toFixed(2),
    topBigrams,
    computedAt: new Date().toISOString(),
  }
}

export function fingerprintMatch(tweet: string, fp: StyleFingerprint): number {
  if (!fp || fp.avgCharCount === 0) return 50

  let weightedScore = 0
  let totalWeight = 0

  // High weight (3x): charCount within stddev, lowercaseStart, questionRatio
  const charDist = Math.abs(tweet.length - fp.avgCharCount)
  const charInRange = charDist <= fp.charStdDev * 1.5
  weightedScore += (charInRange ? 3 : 0)
  totalWeight += 3

  const startsLower = /^[a-zçğıöşü]/.test(tweet)
  const lcMatch = (startsLower && fp.lowercaseStartRatio > 0.5) || (!startsLower && fp.lowercaseStartRatio <= 0.5)
  weightedScore += (lcMatch ? 3 : 0)
  totalWeight += 3

  const hasQuestion = tweet.includes('?')
  const qMatch = (hasQuestion && fp.questionRatio > 0.15) || (!hasQuestion && fp.questionRatio <= 0.15)
  weightedScore += (qMatch ? 3 : 0)
  totalWeight += 3

  // Medium weight (2x): emojiRatio, slangDensity, punctuationDensity
  const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(tweet)
  const emojiMatch = (hasEmoji && fp.emojiRatio > 0.1) || (!hasEmoji && fp.emojiRatio <= 0.1)
  weightedScore += (emojiMatch ? 2 : 0)
  totalWeight += 2

  const slangCount = (tweet.match(SLANG_REGEX) || []).length
  const slangMatch = (slangCount > 0 && fp.slangDensity > 0.05) || (slangCount === 0 && fp.slangDensity <= 0.05)
  weightedScore += (slangMatch ? 2 : 0)
  totalWeight += 2

  const tweetPunct = tweet.length > 0 ? tweet.replace(/[^.,!?;:…–—]/g, '').length / tweet.length : 0
  const punctMatch = Math.abs(tweetPunct - fp.punctuationDensity) < 0.03
  weightedScore += (punctMatch ? 2 : 0)
  totalWeight += 2

  // Low weight (1x): avgCommas, exclamationRatio, vocabularyRichness
  const commas = (tweet.match(/,/g) || []).length
  const commaMatch = Math.abs(commas - fp.avgCommas) <= 2
  weightedScore += (commaMatch ? 1 : 0)
  totalWeight += 1

  const hasExcl = tweet.includes('!')
  const exclMatch = (hasExcl && fp.exclamationRatio > 0.1) || (!hasExcl && fp.exclamationRatio <= 0.1)
  weightedScore += (exclMatch ? 1 : 0)
  totalWeight += 1

  const tweetWords = tweet.toLowerCase().split(/\s+/).filter(w => w.length > 1)
  const tweetUnique = new Set(tweetWords)
  const tweetVR = tweetWords.length > 0 ? tweetUnique.size / tweetWords.length : 0
  const vrMatch = Math.abs(tweetVR - fp.vocabularyRichness) < 0.2
  weightedScore += (vrMatch ? 1 : 0)
  totalWeight += 1

  // Bigram bonus: +5 per match, max +15
  const tweetBigrams: string[] = []
  const tWords = tweet.toLowerCase().split(/\s+/)
  for (let i = 0; i < tWords.length - 1; i++) {
    tweetBigrams.push(`${tWords[i]} ${tWords[i + 1]}`)
  }
  const bigramHits = tweetBigrams.filter(bg => fp.topBigrams.includes(bg)).length
  const bigramBonus = Math.min(bigramHits * 5, 15)

  const baseScore = Math.round((weightedScore / totalWeight) * 85) // 85 max from metrics
  return Math.min(100, baseScore + bigramBonus)
}
