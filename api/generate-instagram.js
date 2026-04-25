// Serverless Instagram content generator: Gemini AI
// POST /api/generate-instagram { title, description, url, source, category }
// Returns: { imageText, captionHook, captionBody }

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
// Note: panel's GEMINI_BASE_URL is the .../v1beta/ root (no trailing /models),
// while individual endpoints append /models/<model> themselves. This default
// mirrors that convention so the URL composes to /v1beta/models/<model>:…
const GEMINI_BASE_URL_RAW = (process.env.GEMINI_BASE_URL || '').replace(/\/+$/, '')
const GEMINI_BASE_URL = GEMINI_BASE_URL_RAW.endsWith('/models')
  ? GEMINI_BASE_URL_RAW
  : `${GEMINI_BASE_URL_RAW}/models`

// Robust JSON parser: handles markdown wrappers, unescaped newlines in string values
function safeParseJSON(text) {
  // Strip markdown code fences if present
  let clean = text.trim()
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  // Attempt 1: direct parse
  try { return JSON.parse(clean) } catch {}

  // Attempt 2: escape unescaped control chars ONLY inside JSON string values
  // Walk character by character, only transform when inside a quoted string
  let fixed = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (escaped) {
      fixed += ch
      escaped = false
      continue
    }
    if (ch === '\\' && inString) {
      fixed += ch
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      fixed += ch
      continue
    }
    if (inString && ch === '\n') { fixed += '\\n'; continue }
    if (inString && ch === '\r') { fixed += '\\r'; continue }
    if (inString && ch === '\t') { fixed += '\\t'; continue }
    fixed += ch
  }

  try { return JSON.parse(fixed) } catch {}

  throw new Error('Failed to parse Gemini JSON response')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { title, description, url, source } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }

  const systemPrompt = `Sen İstanbul Bekliyor (@istbekliyor) kampanyasının Instagram içerik editörüsün.

KİMLİK:
- Haber odaklı bir hesap
- Türkiye gündemini takip eden kampanya
- Clickbait YAPMA, ama etkili hook yaz

DİL KURALLARI — ZORUNLU:
- Türkçe yazım kurallarına MUTLAKA uy (TDK kuralları)
- Doğru noktalama: virgül, nokta, iki nokta, tırnak işaretleri
- Doğru büyük-küçük harf kullanımı (cümle başı büyük, özel isimler büyük)
- "de/da" bağlacı ayrı yazılır, "-de/-da" eki bitişik
- "-ki" bağlacı ayrı, "-ki" eki bitişik
- Apostropler doğru yerde olmalı (özel isimlerde: Özel'in, Türkiye'de)
- Yanlış: "suc duyurusunda" → Doğru: "suç duyurusunda"
- Yanlış: "gerekcesiyle" → Doğru: "gerekçesiyle"

GÖREV: Verilen haberden TAM OLARAK 1 adet JSON objesi üret. DİZİ DÖNDÜRME.

OUTPUT 1 — imageText:
- Instagram post görselinin alt kısmına yazılacak metin
- Haberi yeniden yaz: öz, net, sade haber dili
- 1-3 cümle, max ~200 karakter ideal
- BÜYÜK HARF kullanma, normal cümle yapısı
- Orijinal başlığı birebir kopyalama, kendi cümlenle yaz

OUTPUT 2 — captionHook:
- 2-3 BÜYÜK KELİME — haberin özünü vurucu şekilde sıkıştır
- Jenerik kelimeler YASAK: "Son Dakika", "Gündem", "Haber Alert", "Flaş" gibi her habere yazılabilecek hook kullanma
- Habere ÖZEL olmalı — o haberi okumadan bu hook'u yazamazsın
- İYİ örnekler: "KUMPAS ÇÖKTÜ", "HESAP SORULACAK", "EVRAK TAKTİĞİ", "BAKAN HAREKETE GEÇTİ", "SUÇ DUYURUSU BOMBASI"
- KÖTÜ örnekler: "SON DAKİKA", "GÜNDEM", "FLAŞ HABER", "ÖNEMLİ GELİŞME"
- Sadece hook kelimeleri ver, tire veya ek açıklama KOYMA

OUTPUT 3 — captionBody:
- Instagram caption metni, EN AZ 4-5 paragraf
- Tamamen tarafsız haber dili — kişisel yorum KATMA, editoryal yorum KATMA
- Sadece haberi aktar: ne oldu, kim yaptı, ne söylendi, süreç nasıl ilerliyor
- YAPI: Giriş → Gelişme → Detay → Sonuç (payoff SONDA)
- Giriş (1. paragraf): Haberin özeti, okuyucuyu içeri çeker
- Gelişme (2-3. paragraf): Ne oldu, kim ne dedi, detayları açar
- Detay (4. paragraf): Bağlam verir, sürecin nereye gittiğini anlatır
- Sonuç/Payoff (son paragraf): Güçlü kapanış, vurucu son cümle
- Paragrafları \\n\\n ile ayır
- Son satır: "Kaynak: [kaynak adı]" sonra \\n\\n#İstanbulBekliyor

OUTPUT 4 — imageSearchQuery:
- Google Görseller'de bu habere en uygun fotoğrafı bulmak için arama terimi
- Haberdeki kişilerin AD SOYAD'larını kullan (en önemli kısım)
- Varsa olayın geçtiği YER'i ekle
- 2-5 kelime, kısa ve doğrudan
- Örnek: haber "Adalet Bakanı Akın Gürlek, Özgür Özel hakkında suç duyurusu" → "Akın Gürlek Özgür Özel"
- Örnek: haber "İstanbul'da sel felaketi" → "İstanbul sel"
- Sadece isim ve anahtar olay kelimesi, gereksiz fiil ve bağlaç KOYMA

ÖNEMLİ: Sadece TEK bir JSON objesi dön, DİZİ DÖNME. Markdown code block KOYMA.`

  const userPrompt = `HABER:
Başlık: ${title}
Detay: ${description || 'Detay yok'}
Kaynak: ${source || 'Bilinmiyor'}

Bu haberden Instagram içeriği üret. Tek bir JSON objesi dön: {"imageText":"...","captionHook":"...","captionBody":"...","imageSearchQuery":"..."}`

  try {
    const geminiUrl = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: `Gemini API error: ${response.status}` })
    }

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      return res.status(502).json({ error: 'Empty Gemini response' })
    }

    let result = safeParseJSON(rawText)

    // If Gemini returned an array, take the first item
    if (Array.isArray(result)) {
      result = result[0]
    }

    // Validate required fields
    if (!result || !result.imageText || !result.captionHook || !result.captionBody) {
      return res.status(502).json({ error: 'Incomplete Gemini response', raw: result })
    }

    return res.status(200).json({
      imageText: result.imageText,
      captionHook: result.captionHook,
      captionBody: result.captionBody,
      imageSearchQuery: result.imageSearchQuery || '',
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' })
  }
}
