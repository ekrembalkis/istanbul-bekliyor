// Reasoning-quality A/B for Tweet + Thread modes.
// Tweet mode lacks a source tweet, so strategy differs from Quote:
//   - Quote: entity extraction FROM source (facts guaranteed to exist)
//   - Tweet: stance commitment (no facts injected, risk of hallucination)
//   - Thread: narrative arc — reasoning goes into DEPTH/PROOF slots only
//
// Run: node _experiments/tweet-thread-ab.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envText = fs.readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter(Boolean).filter(l => !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const KEY = env.GEMINI_API_KEY
if (!env.GEMINI_BASE_URL) throw new Error('GEMINI_BASE_URL missing')
const GEMINI_BASE = env.GEMINI_BASE_URL.replace(/\/+$/, '')
const MODEL = env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview'
const log = (...a) => process.stdout.write(a.join(' ') + '\n')

// ─── SHARED DNA (sharp/civic voice) ─────────────────────────────
const DNA_SHARP = {
  username: 'ekremistsokrat',
  avgLen: 160,
  tweets: [
    'adalet dediğiniz şey kimin adaleti?',
    'ekonomi çöküyor diyenlere "yok artık abartma" diyenler, market fişinin altına baksınlar.',
    'sessiz kalmak da bir tercihtir. ve çoğu zaman en kötü tercihtir.',
    'bir ülkede hukuk herkese eşit işlemiyorsa, o ülkede hukuk yoktur.',
    'bugün sizin komşunuzu gözaltına alıyorlar, yarın sizi.',
    'halk aptal değil, yorgun.',
    'sayılarla konuşalım: 700 yıl istemle yargılananlar dışarıda, 2 yıl almış belediye başkanları içeride.',
    'gazetecilik suç değil, gazetecilik yapmayı bırakmak suç.',
    'hukuk devletinde kimse dokunulmaz değildir.',
    'konuşmak tehlikeliyse susmak daha tehlikelidir.',
    'bir toplumda hangi suçun cezasız kaldığına bakın, o toplumun nereye gittiğini anlarsınız.',
    'sandıktan sonra başlar demokrasi. sandığa kadar olan kısım kolay olanı.',
  ],
}

// Abstract/philosophical voice — voice-preservation control
const DNA_ABSTRACT = {
  username: 'sessizsokak',
  avgLen: 140,
  tweets: [
    'insan bazen kendinden de yorulur.',
    'susmak bir dil, konuşmak bir başka.',
    'geceleri düşündüğün şey, aslında gündüzün sana söyleyemediğidir.',
    'her bakış bir soru, her cevap bir kaçış.',
    'zaman iyileştirmez, sadece alıştırır.',
    'sevmek cesaret değil, kalmak cesarettir.',
    'kelimeler tükendi, kalbim hâlâ anlatmaya çalışıyor.',
    'bazen en derin şey, söylenmeyen şeydir.',
    'kendini tanıyan insan, kimseye küsmez.',
    'yalnızlık ders verir, kalabalık unutturur.',
    'değişen şey sen misin, dünya mı, yoksa ışık mı?',
    'sessizlik bazen en dürüst cevaptır.',
  ],
}

// ─── FIXTURES ───────────────────────────────────────────────────
const TOPIC_SPECIFIC = 'adalet bakanı yeni açıklama: Aziz İhsan Aktaş davasında hesaplardaki bloke kaldırıldı'
const TOPIC_CONTEXT_SPECIFIC = 'Trending: Aziz İhsan Aktaş davası (kaynak: google_trends, skor: 92)\n700 yıla kadar hapis istemiyle yargılanan sanığın banka hesaplarındaki bloke kaldırıldı. CHP\'li belediye başkanları hâlâ tutuklu.'

const TOPIC_GENERIC = 'Galatasaray Fenerbahçe derbisi'
const TOPIC_CONTEXT_GENERIC = 'Trending: Galatasaray Fenerbahçe derbisi (kaynak: x, skor: 88)'

// ─── PERSONA BUILDER ────────────────────────────────────────────
function persona(dna) {
  return `Sen @${dna.username}'sin. Asagidaki tweetleri SEN yazdin.

SENİN GERÇEK TWEETLERİN:
${dna.tweets.map((t, i) => `${i + 1}. ${t}`).join('\n')}

SEN BOYLESIN:
- Kucuk harfle baslarsin
- ASLA emoji veya hashtag kullanmazsin
- Tweet ortalama ${dna.avgLen} karakter

KRİTİK: Sen bir AI degilsin, sen @${dna.username}'sin. Yardımsever olmaya CALISMA.

!!! UZUNLUK !!! Her tweet 100-200 karakter arasi.`
}

function personaWithRule(dna) {
  return persona(dna) + `

AKIL YURUTME KURALI:
- KOTU tweet (yasak): konuyu soyut soruya cevirir. Ornek: "Adalet kime calisiyor?"
- IYI tweet (zorunlu): somut isim + somut sayi/olgu + net tezat. Ornek: "Aziz Ihsan Aktas 700 yilla yargilandi dışarıda, chp'li baskanlar 2 yilla iceride. adaletin tanimi bu olamaz."

Her tweet IYI ornegin yapisinda olmali: [OZEL ISIM veya SOMUT OLGU] + [SAYI/KARSILASTIRMA] + [TEZAT/CIKARIM].
Bilmediğin gerçekleri UYDURMA. Sadece sana verilen baglamdaki olgulari kullan.`
}

// ─── TWEET MODE VARIANTS ────────────────────────────────────────

// Reuses current prod shape
function tweetV0(dna, topic, ctx) {
  return {
    persona: persona(dna),
    user: `"${topic}" hakkinda ne dusunuyorsun?${ctx ? `\n\nGundem baglami:\n${ctx}` : ''}

Once IC MONOLOG yaz:
<monolog>
- Bu konuda ilk fark ettigin sey ne?
- Ne hissediyorsun?
- Bu sana neyi hatirlatiyor?
- Bunu tweetlerken amacin ne?
</monolog>

Sonra bu monologdan cikan 3 tweet yaz. Numarali. Ic monologdaki dusunceler tweetlere yansisin.`,
  }
}

// Entity extraction FROM topicContext (Quote-style, but source = context)
function tweetV1_entity(dna, topic, ctx) {
  return {
    persona: persona(dna),
    user: `"${topic}" hakkinda 3 tweet yazacaksin.${ctx ? `\n\nGundem baglami (sadece buradaki olgulara guven):\n${ctx}` : ''}

<monolog>
İSİMLER: Baglamda gecen kisiler/kurumlar hangileri?
SAYILAR/TARIHLER: Baglamda gecen somut sayilar/tarihler?
TEZAT: Bu olay hangi baska duruma karsi celisik?
VURGU: Hangi kelime BÜYÜK HARFLE vurgulanmaliyi hak ediyor?
SENİN AÇIN: Sen @${dna.username} olarak bu olaydaki celiskiyi nasil goruyorsun?
</monolog>

KURAL: Her tweette EN AZ BIR somut isim veya sayi gecmeli (baglamdakinden). Parafraz yasak. UYDURMA olgu YASAK.
3 tweet yaz, numarali.`,
  }
}

// Stance commitment (works even when context is thin)
function tweetV2_stance(dna, topic, ctx) {
  return {
    persona: personaWithRule(dna),
    user: `"${topic}" hakkinda 3 tweet yazacaksin.${ctx ? `\n\nGundem baglami:\n${ctx}` : ''}

<monolog>
DURUS: Bu konuda NEYI savunuyorsun, NEYE karsisin? (tek cumle)
STAKE: Bu olayda KIM kaybediyor, KIM kazaniyor?
VURGU: Hangi kelime/olgu BÜYÜK HARFLE vurgulanmali?
CİKARİM: Herkesin atladigi, sadece senin gorduğun sey ne?
</monolog>

KURAL:
- Her tweetin NET bir tarafi olmali (soru ile kacma, pozisyon al)
- Baglamda olmayan isim/sayi UYDURMA
- Yuvarlak laf yasak, somut ol

3 tweet yaz, numarali.`,
  }
}

// V1 + V2 combined
function tweetV3_combined(dna, topic, ctx) {
  return {
    persona: personaWithRule(dna),
    user: tweetV1_entity(dna, topic, ctx).user,
  }
}

// ─── THREAD MODE VARIANTS ───────────────────────────────────────

// Current prod thread prompt
function threadV0(dna, topic, ctx) {
  return {
    persona: persona(dna),
    user: `BU KONUDA 5 TWEET'LIK THREAD YAZ.

KONU: ${topic}
${ctx ? `\nGUNDEM BAGLAMI:\n${ctx}\n` : ''}
THREAD YAPISI:
1. HOOK: Sarsici acilis
2. BAGLAM: Durumu acikla
3. DERINLIK: Herkesin gormezden geldigi aci
4. KANIT/DUYGU: Somut ornek veya duygusal vurucu cumle
5. KAPANIS: Guclu son cumle

KURALLAR:
- 80-220 karakter
- Her tweet farkli aci
- Klise yasak

Sadece 5 tweet yaz. Her biri "1/" "2/" seklinde numarali.`,
  }
}

// Reasoning injection per-slot (hook/depth/proof get specific fact anchors)
function threadV1_reasoning(dna, topic, ctx) {
  return {
    persona: personaWithRule(dna),
    user: `BU KONUDA 5 TWEET'LIK THREAD YAZ.

KONU: ${topic}
${ctx ? `\nGUNDEM BAGLAMI (sadece buradaki olgulari kullan, UYDURMA):\n${ctx}\n` : ''}
Once THREAD MONOLOGU yaz:
<monolog>
İSİMLER: Baglamdaki kisiler/kurumlar?
SAYILAR: Baglamdaki somut sayilar?
TEZAT: Bu olayin celistigi baska durum?
VURGU: Hangi kelime CAPS olacak?
</monolog>

Sonra su yapida 5 tweet yaz:
1. HOOK (sarsici acilis — SOMUT bir isim veya sayiyla basla, soyut soruyla degil)
2. BAGLAM (durumu acikla — gercek olgu kullan)
3. DERINLIK (gormezden gelinen taraf — tezat burada devreye girer)
4. KANIT (spesifik olgu/sayi/isim — burada en az bir CAPS kelime)
5. KAPANIS (guclu son — cikarim, slogan degil)

KURAL:
- 80-220 karakter
- Baglamda olmayan olgu UYDURMA
- Her tweette somutluk olmali

"1/" "2/" ile numarali, sadece 5 tweet yaz.`,
  }
}

// ─── RUN HELPERS ────────────────────────────────────────────────

async function runOne(name, cfg, temp = 0.85) {
  const url = `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${KEY}`
  const body = {
    systemInstruction: { parts: [{ text: cfg.persona }] },
    contents: [{ role: 'user', parts: [{ text: cfg.user }] }],
    generationConfig: { temperature: temp, maxOutputTokens: 2000 },
  }
  const t0 = Date.now()
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const dt = Date.now() - t0
  const data = await res.json()
  if (!res.ok) return { name, error: data.error?.message, ms: dt }
  const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
  const clean = raw.replace(/<monolog>[\s\S]*?<\/monolog>/gi, '').trim()
  // Thread parser preserves 1/ 2/ prefixes; tweet parser strips "1." "2."
  const tweets = clean.split('\n')
    .map(l => l.replace(/^\d+[\.\)\/]\s*/, '').trim())
    .filter(l => l.length > 20 && !l.startsWith('<') && !/^(iste|tamam|durus|stake|vurgu|cikarim|isimler|sayilar|tezat)/i.test(l))
  return { name, ms: dt, tweets, raw }
}

// ─── SCORING (same rubric as quote test) ────────────────────────
const CONTRAST = /\b(ama|oysa|hâlâ|hala|buna karşılık|ise|fakat|lakin|ancak|hiçbir zaman)\b/gi
const CAPS = /\b[A-ZÇĞİÖŞÜ]{4,}\b/g

function score(tweet) {
  const names = (tweet.match(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+/g) || []).length // "Ad Soyad" pattern
  const orgs = (tweet.match(/\b(chp|akp|mhp|hdp|iyi parti|tbmm|ysk|yargıtay|anayasa mahkemesi|aziz|imamoğlu|galatasaray|fenerbahçe)\b/gi) || []).length
  const nums = (tweet.match(/\b\d+\b/g) || []).length
  const contrast = (tweet.match(CONTRAST) || []).length
  const caps = (tweet.match(CAPS) || []).length
  const composite = (names + orgs) * 2 + nums * 2 + contrast + caps * 2
  return { entities: names + orgs, nums, contrast, caps, composite, len: tweet.length }
}

function summary(r) {
  if (r.error) return { name: r.name, error: r.error }
  const s = r.tweets.map(score)
  const avg = k => s.length ? +(s.reduce((a, x) => a + x[k], 0) / s.length).toFixed(2) : 0
  return {
    name: r.name,
    count: r.tweets.length,
    ms: r.ms,
    avgEnt: avg('entities'),
    avgNum: avg('nums'),
    avgCon: avg('contrast'),
    avgCap: avg('caps'),
    avgComp: avg('composite'),
    avgLen: avg('len'),
  }
}

function printVariant(r) {
  if (r.error) { log(`  ERROR: ${r.error}`); return }
  r.tweets.forEach((tw, i) => {
    const s = score(tw)
    log(`  ${i + 1}. [ent=${s.entities} num=${s.nums} con=${s.contrast} caps=${s.caps} comp=${s.composite} len=${s.len}]`)
    log(`     ${tw}`)
  })
}

// ─── RUN MATRIX ─────────────────────────────────────────────────

const runs = []

async function section(title, variants) {
  log('\n' + '='.repeat(72))
  log(title)
  log('='.repeat(72))
  for (const [name, cfg] of variants) {
    log(`\n▶ ${name}`)
    const r = await runOne(name, cfg)
    runs.push(r)
    printVariant(r)
  }
}

await section('TWEET MODE — sharp DNA, SPECIFIC topic (context has facts)', [
  ['tweet_V0_baseline_sharp_specific', tweetV0(DNA_SHARP, TOPIC_SPECIFIC, TOPIC_CONTEXT_SPECIFIC)],
  ['tweet_V1_entity_sharp_specific', tweetV1_entity(DNA_SHARP, TOPIC_SPECIFIC, TOPIC_CONTEXT_SPECIFIC)],
  ['tweet_V2_stance_sharp_specific', tweetV2_stance(DNA_SHARP, TOPIC_SPECIFIC, TOPIC_CONTEXT_SPECIFIC)],
  ['tweet_V3_combined_sharp_specific', tweetV3_combined(DNA_SHARP, TOPIC_SPECIFIC, TOPIC_CONTEXT_SPECIFIC)],
])

await section('TWEET MODE — sharp DNA, GENERIC topic (thin context, hallucination risk)', [
  ['tweet_V0_baseline_sharp_generic', tweetV0(DNA_SHARP, TOPIC_GENERIC, TOPIC_CONTEXT_GENERIC)],
  ['tweet_V3_combined_sharp_generic', tweetV3_combined(DNA_SHARP, TOPIC_GENERIC, TOPIC_CONTEXT_GENERIC)],
])

await section('TWEET MODE — ABSTRACT DNA (voice-preservation check)', [
  ['tweet_V0_baseline_abstract', tweetV0(DNA_ABSTRACT, 'yalnızlık', '')],
  ['tweet_V3_combined_abstract', tweetV3_combined(DNA_ABSTRACT, 'yalnızlık', '')],
])

await section('THREAD MODE — sharp DNA, SPECIFIC topic', [
  ['thread_V0_baseline', threadV0(DNA_SHARP, TOPIC_SPECIFIC, TOPIC_CONTEXT_SPECIFIC)],
  ['thread_V1_reasoning', threadV1_reasoning(DNA_SHARP, TOPIC_SPECIFIC, TOPIC_CONTEXT_SPECIFIC)],
])

log('\n' + '='.repeat(72))
log('SUMMARY')
log('='.repeat(72))
console.table(runs.map(summary))

fs.writeFileSync(path.join(__dirname, 'tweet-thread-ab.results.json'),
  JSON.stringify({ runs }, null, 2))
log('\nSaved: _experiments/tweet-thread-ab.results.json')
