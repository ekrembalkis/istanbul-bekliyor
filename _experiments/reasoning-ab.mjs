// Reasoning-quality A/B test for Stil Klonlama Quote mode.
// Hypothesis: current prompt lacks scaffolding for entity extraction,
// specificity, contrast, and emphasis. We test 5 variants against the
// same quoted tweet and score outputs on reasoning density.
//
// Run: node _experiments/reasoning-ab.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '..', '.env')
const envText = fs.readFileSync(envPath, 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter(Boolean).filter(l => !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const KEY = env.GEMINI_API_KEY
if (!KEY) throw new Error('GEMINI_API_KEY missing')
if (!env.GEMINI_BASE_URL) throw new Error('GEMINI_BASE_URL missing in .env')
const GEMINI_BASE = env.GEMINI_BASE_URL.replace(/\/+$/, '')

// Two models: lite (current prod) + pro (candidate upgrade).
const MODEL_LITE = env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview'
const MODEL_PRO = 'gemini-3-pro-preview'

// Diagnostic script: stdout is the intended output channel.
const log = (...a) => process.stdout.write(a.join(' ') + '\n')

// ─── FIXTURE: Murat Ağırel tweet from screenshot ────────────────
const QUOTE_AUTHOR = 'muratagirel'
const QUOTE_TEXT = `Suç örgütü kurmak ve yönetmek, suç örgütüne üye olmak, rüşvet verme, ihaleye fesat karıştırma, edimin ifasına fesat karıştırma ve mal varlığı değerlerini aklama gibi ağır suçlamalarla yargılanan Aziz İhsan Aktaş'ın banka hesaplarındaki bloke kaldırıldı. Yani 700 yıla kadar hapis istemiyle yargılanan şüpheli, serbest dolaşıp parasını kullanabiliyor. CHPli belediye başkanları hâlâ tutuklu.`

// Benchmark (Erdem Atahan tweet from user's 3rd screenshot):
const BENCHMARK = `Aziz İhsan Aktaş'ın hesaplarındaki blokeler de kaldırıldı. 700 yılla yargılanıp serbest gezen, rüşvet ile elde ettiği iddia edilen parasını kullanabilen SUÇ ÖRGÜTÜ LİDERİ. Ama CHPliler içerde.`

// ─── MINIMAL DNA (Turkish political/civic commentator, sharp/sarcastic) ──
const DNA = {
  styleUsername: 'ekremistsokrat',
  avgLen: 160,
  styleTweets: [
    'adalet dediğiniz şey kimin adaleti? herkes için mi yoksa bazıları için mi işliyor?',
    'ekonomi çöküyor diyenlere "yok artık abartma" diyenler, market fişinin altına baksınlar bir kere.',
    'sessiz kalmak da bir tercihtir. ve çoğu zaman en kötü tercihtir.',
    'bir ülkede hukuk herkese eşit işlemiyorsa, o ülkede hukuk yoktur. tartışma kapandı.',
    'bugün sizin komşunuzu gözaltına alıyorlar, yarın sizi. arada geçen süre sadece sıra meselesi.',
    'halk aptal değil, yorgun. ikisini karıştırmak siyasetçinin en büyük hatası.',
    'bu kadar açık bir adaletsizliğe "normal" diyenler, yarın başlarına geldiğinde de "normal" diyecek mi?',
    'bir toplumda hangi suçun cezasız kaldığına bakın, o toplumun nereye gittiğini anlarsınız.',
    'sayılarla konuşalım: 700 yıl istemle yargılananlar dışarıda, 2 yıl almış belediye başkanları içeride. matematik mi bu?',
    'gazetecilik suç değil, gazetecilik yapmayı bırakmak suç.',
    'bu memleket bu haliyle değil, olması gereken haliyle sevilir.',
    'bir insan ne kadar sessiz kalırsa kalsın, içindeki adalet duygusu bir gün konuşur.',
    'demokrasi sandıkta değil, sandıktan sonra başlar. sandıktan sonraki davranış demokrasinin asıl testidir.',
    'soruyu doğru sormadığın sürece doğru cevabı bulamazsın. "kim kazandı" değil, "kim kaybetti" sor.',
    'tarih bizi değil, bizim ne yaptığımızı yazacak. yazılacak satırı seçmek hâlâ mümkün.',
    'hukuk devletinde kimse dokunulmaz değildir. dokunulmazlık iddiası başlı başına hukuksuzluktur.',
    'bir şehir eski belediye başkanını aramıyor, adaleti arıyor. ikisini ayırmak gerekiyor.',
    'konuşmak tehlikeliyse susmak daha tehlikelidir. çünkü susmak onay anlamına gelir.',
  ],
}

// ─── VARIANTS ──────────────────────────────────────────────────

// V0: BASELINE — exact replica of current prod Quote prompt.
function buildV0() {
  const persona = `Sen @${DNA.styleUsername}'sin. Asagidaki tweetleri SEN yazdin — bu senin gercek sesin, dusunce tarzin, kelime secimin.

SENİN GERÇEK TWEETLERİN (${DNA.styleTweets.length} adet):
${DNA.styleTweets.map((t, i) => `${i + 1}. ${t}`).join('\n')}

SEN BOYLESIN:
- Kucuk harfle baslarsin
- Argo kullanmazsin
- ASLA emoji kullanmazsin
- ASLA hashtag kullanmazsin
- Link koymazsin

KRİTİK:
- Sen bir AI degilsin, sen @${DNA.styleUsername}'sin
- Yardımsever olmaya CALISMA — kendin ol
- Tweet uzunlugun ortalama ${DNA.avgLen} karakter civari

!!! UZUNLUK !!! Her tweet 100-200 karakter arasi.`

  const user = `@${QUOTE_AUTHOR} su tweeti atmis:
<kaynak>
${QUOTE_TEXT}
</kaynak>

Bunu gordugun anda aklından ne geciyor? Tepkin ne?

<monolog>
Bu tweeti gordugunde ne hissettin? Ne dusundun? Bu konuya senin acin ne?
</monolog>

Simdi bu tweete quote tweet olarak 3 farkli tepki yaz. Her birini numarali yaz. Sadece tweet metinleri.`

  return { model: MODEL_LITE, persona, user, temperature: 0.85 }
}

// V1: ENTITY-EXTRACTION PRE-STEP (structured monolog)
// Force model to name entities, numbers, contrasts BEFORE writing.
function buildV1() {
  const { persona } = buildV0()
  const user = `@${QUOTE_AUTHOR} su tweeti atmis:
<kaynak>
${QUOTE_TEXT}
</kaynak>

Bu tweete quote tweet olarak 3 tepki yazacaksin. AMA once kafandan gecenleri SOMUT olarak yaz — genel duygu degil, ozgul olgular:

<monolog>
İSİMLER: Bu tweette kim geciyor? Kim suclaniyor? (tam isim)
SAYILAR/TARIHLER: Hangi ceza? Hangi miktar? Hangi tarih?
SUCLAMALAR: Hangi somut suclar sayiliyor? (en az 3 tanesi)
TEZAT: Bu kisiye yapilan muamele ile HANGI baska gruba yapilan muamele celisiyor? (net karsilastirma)
VURGU: Bu olayda hangi kelime BÜYÜK HARFLE vurgulanmayi hak ediyor?
SENİN AÇIN: Sen @${DNA.styleUsername} olarak bu olaydaki celiskiyi nasil goruyorsun?
</monolog>

Simdi 3 quote tweet yaz. KURAL: Her tweette EN AZ BIR somut isim veya sayi gecmeli. Parafraz yasak. Yuvarlak laf yasak. Her biri numarali.`

  return { model: MODEL_LITE, persona, user, temperature: 0.85 }
}

// V2: CONTRASTIVE FEW-SHOT (good vs bad example)
// Show the model what "reasoning" looks like vs what "parafraz" looks like.
function buildV2() {
  const persona = buildV0().persona + `

AKIL YURUTME KURALI (en onemlisi):
- KOTU tweet (yasak): konuyu soyut bir soruya cevirir. Ornek: "Adalet mekanizmasi kime calisiyor?"
- IYI tweet (zorunlu): somut isim + somut sayi + net tezat icerir. Ornek: "Aziz Ihsan Aktas 700 yilla yargilandi serbest; CHP'li baskanlar 2 yilla iceride. Adaletin bir tanimi bu olamaz."

Senin her tweetin IYI ornegin yapisinda olmali: [OZEL ISIM] + [SOMUT SAYI/OLGU] + [TEZAT/CIKARIM].`

  const user = buildV0().user
  return { model: MODEL_LITE, persona, user, temperature: 0.85 }
}

// V3: V1 + V2 COMBINED on LITE model
function buildV3() {
  const persona = buildV2().persona
  const user = buildV1().user
  return { model: MODEL_LITE, persona, user, temperature: 0.85 }
}

// V4: Same as V3 but on PRO model with thinking
function buildV4() {
  const v3 = buildV3()
  return { ...v3, model: MODEL_PRO, thinking: true }
}

// ─── RUN ───────────────────────────────────────────────────────

async function runVariant(name, cfg) {
  const url = `${GEMINI_BASE}/models/${cfg.model}:generateContent?key=${KEY}`
  const body = {
    systemInstruction: { parts: [{ text: cfg.persona }] },
    contents: [{ role: 'user', parts: [{ text: cfg.user }] }],
    generationConfig: {
      temperature: cfg.temperature ?? 0.85,
      maxOutputTokens: 2000,
      ...(cfg.thinking ? { thinkingConfig: { thinkingBudget: -1 } } : {}),
    },
  }
  const t0 = Date.now()
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const dt = Date.now() - t0
  const data = await res.json()
  if (!res.ok) {
    return { name, error: data.error?.message || 'unknown', ms: dt }
  }
  const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || ''
  const clean = raw.replace(/<monolog>[\s\S]*?<\/monolog>/gi, '').trim()
  const tweets = clean.split('\n')
    .map(l => l.replace(/^\d+[\.\)\/]\s*/, '').trim())
    .filter(l => l.length > 20 && !l.startsWith('<') && !/^(iste|tamam)/i.test(l))
  return {
    name,
    model: cfg.model,
    ms: dt,
    tweets,
    rawLen: raw.length,
    usage: data.usageMetadata,
  }
}

// ─── SCORING ───────────────────────────────────────────────────
// Reasoning-density rubric: each dimension is an integer count.
// Named entity: capital-letter name (proper noun) — "Aziz İhsan Aktaş", "CHP"
// Number fact: any digit sequence (years, amounts, percentages)
// Contrast: presence of "ama", "oysa", "hâlâ", "buna karşılık", "ise"
// Caps emphasis: ALLCAPS word of length ≥ 4
// Specificity: total (entity+number+caps) — composite proxy

const PROPER_NOUN_HINTS = /\b(aziz|ihsan|aktas|aktaş|chp|akp|imamoğlu|imamoglu|erdoğan|erdogan|saray|istanbul|meclis|savcı|savci|hakim|mahkeme|yargıtay|anayasa)\b/gi
const CONTRAST_HINTS = /\b(ama|oysa|hâlâ|hala|buna karşılık|buna karsilik|ise|fakat|lakin|ancak)\b/gi
const CAPS_WORD = /\b[A-ZÇĞİÖŞÜ]{4,}\b/g

function score(tweet) {
  const nameHits = (tweet.match(PROPER_NOUN_HINTS) || []).length
  const numHits = (tweet.match(/\b\d+\b/g) || []).length
  const contrastHits = (tweet.match(CONTRAST_HINTS) || []).length
  const capsHits = (tweet.match(CAPS_WORD) || []).length
  const composite = nameHits * 2 + numHits * 2 + contrastHits * 1 + capsHits * 2
  return { nameHits, numHits, contrastHits, capsHits, composite, len: tweet.length }
}

function summarizeVariant(v) {
  if (v.error) return { name: v.name, error: v.error }
  const scores = v.tweets.map(score)
  const avg = k => scores.length ? (scores.reduce((s, x) => s + x[k], 0) / scores.length).toFixed(2) : 0
  return {
    name: v.name,
    model: v.model,
    count: v.tweets.length,
    ms: v.ms,
    avgNames: +avg('nameHits'),
    avgNums: +avg('numHits'),
    avgContrast: +avg('contrastHits'),
    avgCaps: +avg('capsHits'),
    avgComposite: +avg('composite'),
    avgLen: +avg('len'),
  }
}

const VARIANTS = [
  ['V0_baseline', buildV0()],
  ['V1_entity_monolog', buildV1()],
  ['V2_contrastive_fewshot', buildV2()],
  ['V3_combined_lite', buildV3()],
  ['V4_combined_pro_thinking', buildV4()],
]

log('benchmark:', BENCHMARK)
log('benchmark score:', score(BENCHMARK))
log('='.repeat(72))

const results = []
for (const [name, cfg] of VARIANTS) {
  log(`\n▶ ${name} (${cfg.model}${cfg.thinking ? ' +thinking' : ''})`)
  const r = await runVariant(name, cfg)
  results.push(r)
  if (r.error) { log('  ERROR:', r.error); continue }
  r.tweets.forEach((tw, i) => {
    const s = score(tw)
    log(`  ${i + 1}. [names=${s.nameHits} nums=${s.numHits} contrast=${s.contrastHits} caps=${s.capsHits} comp=${s.composite} len=${s.len}]`)
    log(`     ${tw}`)
  })
}

log('\n' + '='.repeat(72))
log('SUMMARY (higher avgComposite = more reasoning density):')
console.table(results.map(summarizeVariant))

fs.writeFileSync(path.join(__dirname, 'reasoning-ab.results.json'),
  JSON.stringify({ benchmark: BENCHMARK, benchmarkScore: score(BENCHMARK), results }, null, 2))
log('\nSaved: _experiments/reasoning-ab.results.json')
