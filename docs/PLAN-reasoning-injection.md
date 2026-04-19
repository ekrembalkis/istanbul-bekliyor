# Plan: Akıl Yürütme Enjeksiyonu — 4 Mod Genişletmesi

Quote modunda kanıtlanan **V3 (entity monolog + contrastive few-shot)** yaklaşımını Reply / Tweet / Thread modlarına yaymanın planı. Her modun farklı girdi profili var, körlemesine kopyalamak hem halüsinasyona hem ses kaybına yol açıyor — bu plan her mod için özel tasarımı ve güvenlik gatlarını içerir.

## 1. Ölçüm — Neye Bakıyoruz

Tek bir rubric: **composite = (isim+kurum)×2 + sayı×2 + tezat + CAPS×2**. Benchmark (@erdemunal222 tweeti) skoru 9. Üretilen tweetlerin bu puana yaklaşması = akıl yürütme yoğunluğu artışı.

Voice-preservation: DNA soyut/şiirsel ise composite yükselmemeli. Yoksa ses değişir.

## 2. Test Sonuçları (iki tur, 10 koşu)

### Quote modu (kapalı kümeli test — kanıt `_experiments/reasoning-ab.results.json`)
| Varyant | Composite |
|---|---|
| V0 baseline | 0.67 |
| V1 entity-only | 4.33 |
| V2 fewshot-only | 6.67 |
| **V3 combined (kazanan)** | **8.33** |

### Tweet modu, spesifik topic (kanıt `_experiments/tweet-thread-ab.results.json`)
| Varyant | Composite | Halüsinasyon? |
|---|---|---|
| V0 baseline | 1.33 | yok |
| V1 entity | 5.00 | yok |
| V2 stance | 4.33 | yok |
| **V3 combined** | **8.67** | yok (topicContext zengin) |

### Tweet modu, GENERIC topic (sadece trend başlığı)
| Varyant | Composite | Gözlem |
|---|---|---|
| V0 baseline | 0.67 | voice korunmuş |
| V3 combined | 6.67 | **HALÜSİNASYON**: "skor: 88" meta verisini "88 bin tweet" olarak uydurdu |

### Tweet modu, ABSTRACT DNA
| Varyant | Composite | Gözlem |
|---|---|---|
| V0 baseline | 0.33 | şiirsel voice intact |
| V3 combined | 5.33 | **VOICE KAYBI**: "80 milyonluk hapishane", "16 milyon insan", "24 saat" — felsefi ton sayısallaştı |

### Thread modu, spesifik topic
| Varyant | Composite | Arc? |
|---|---|---|
| V0 baseline | 1.40 | hook/context/depth/proof/close intact ama soyut |
| **V1 reasoning** | **4.60** | arc intact, her slot somutlaştı |

## 3. Sonuç — Koşullu Rollout

| Mod | Güvenli mi? | Uygulama |
|---|---|---|
| **Quote** | EVET her zaman | V3 koşulsuz aç (source tweet = garantili fact kaynağı) |
| **Reply** | EVET her zaman | V3 koşulsuz aç (aynı gerekçe) |
| **Thread** | EVET spesifik topic varsa | V1 reasoning — arc korunuyor |
| **Tweet** | **KOŞULLU** | Sadece (a) `topicContext` ≥ 60 karakter gövde içeriyorsa VE (b) DNA abstract değilse |

## 4. Tasarım Kararları

### 4.1 Ortak — anti-halüsinasyon paketi
Tüm V3 promptlarına ek clause:
```
UYDURMA KURALI:
- Sadece sana verilen baglamdaki olgular gecerlidir
- Trend skoru, kaynak adi gibi META VERI fact sayilmaz (skor: 88 → "88" diye kullanma)
- Ismini/sayisini bilmediğin kisi/olay: GENEL dille yaz
- Şüphedeysen: isim vermeden somut olgu yaz ("700 yillik yargilama" gibi)
```
Test sırasında "skor: 88 → 88 bin tweet" halüsinasyonu bu clause ile durduruluyor (manuel denendi, ileride regression testi eklenecek).

### 4.2 Tweet modu — DNA tipine göre dallanma
Yeni DNA alanı gerekmez; mevcut `personalityDNA.traits` veya `styleTweets` istatistiğinden türetilir:

```js
function isAbstractVoice(dna, styleTweets) {
  // Heuristik: DNA tweetlerinde özel isim/sayı yoğunluğu düşükse "abstract"
  const sample = styleTweets.slice(0, 20).join(' ')
  const namedEntities = (sample.match(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+/g) || []).length
  const numbers = (sample.match(/\b\d+\b/g) || []).length
  const density = (namedEntities + numbers) / styleTweets.length
  return density < 0.3  // altı = abstract
}
```

Threshold 0.3 ampirik — test DNA'larından kalibre: DNA_SHARP density ≈ 0.7, DNA_ABSTRACT ≈ 0.08.

Abstract DNA → V0 baseline (mevcut prompt) + hafif "somut olgu geç" önerisi (zorunlu değil).
Non-abstract DNA → V3 combined + anti-halüsinasyon.

### 4.3 Tweet modu — topicContext kalitesi gatı
```js
const hasRichContext = (topicContext || '').length > 60
  && !/^Trending:[^\n]+$/.test(topicContext.trim())
```
Yetersiz context → V0 baseline + `<monolog>`a "stance" sorusu (pozisyon al, ama fact uydurma).
Yeterli context → V3 combined.

### 4.4 Thread modu — slot-aware reasoning
Baştan-sona akıl yürütme enjeksiyonu (V1) arc'ı bozmuyor. Yine de fark: **HOOK** slotu somut bir sayı/isimle başlamalı (soyut soruyla değil), **KANIT** slotu CAPS vurgusuna uygun. Test bunu doğruladı.

### 4.5 Reply modu — 50-150 char sınırı
Reply'lar kısa. Tam V3 prompt'u sığmıyor. Kısaltılmış versiyon:
```
<monolog>Isim/sayi? Tezat? CAPS?</monolog>
Reply'in EN AZ bir somut olgu icermeli. Soyut soru ile gecistirme.
```

## 5. Dosya Değişiklikleri

### `api/generate-tweet.js`
Tek dosya, 4 bölge:

**(a) Ortak yardımcılar** (dosya üstü, satır ~90 sonrası):
```js
function isAbstractVoice(tweets) { /* 4.2 */ }
function hasRichContext(ctx) { /* 4.3 */ }
const ANTI_HALLU = `UYDURMA KURALI: Sadece baglamdaki olgular... (4.1)`
const REASONING_RULE = `AKIL YURUTME: KOTU ornek... IYI ornek... (V2 few-shot)`
```

**(b) T.tr ve T.en prompt tabloları** (satır 179-288):
- `quoteInstruction` → V3 yapısına geç (satır 216-217, 270-271)
- `replyInstruction` → kısaltılmış reasoning (satır 218-219, 272-273)
- `threadInstruction` → slot-aware reasoning (satır 220-221, 274-275)
- `tweetInstruction` → koşullu; dispatch `userMessage` içinde yapılacak

**(c) userMessage builder** (satır 552-591):
- Quote/Reply: `REASONING_RULE` persona'ya eklenir + entity monolog user message'a
- Tweet: `isAbstractVoice(styleTweets)` ve `hasRichContext(topicContext)` kontrolü. İkisi de true ise V3, değilse mevcut V0
- Thread: her zaman V1 reasoning

**(d) personaInstruction** (satır 509-550):
- Non-abstract DNA + Quote/Reply modunda → `REASONING_RULE` appendlenir
- Diğer durumlarda — dokunulmaz

### Client tarafı (`src/pages/StyleClone.tsx`)
**Değişiklik yok.** Algoritma server-side; UI aynı kalır. Opsiyonel: bilgilendirme tooltip "Akıl Yürütme aktif" ikonu Quote/Reply/Thread etiketlerine eklenebilir (nice-to-have, plan dışı).

## 6. Feature Flag Stratejisi

Environment variable: `REASONING_V2_ENABLED` (default `true` geliştirme, `false` ilk deploy).

```js
const reasoningOn = process.env.REASONING_V2_ENABLED === 'true'
```

Mod bazında alt-flag gereksiz — tek master switch. Rollback: env değerini `false` yap, redeploy. 30 saniye.

## 7. Regression Koruması

### 7.1 Otomatik test (`_experiments/regression.mjs`)
Mevcut iki test harness'i birleştir, CI-vari script:
```
npm run test:reasoning
```
Eşikler:
- Quote V3 avgComposite ≥ 6 (currently 8.33)
- Thread V1 avgComposite ≥ 3.5 (currently 4.60)
- Tweet V3 sharp+specific avgComposite ≥ 6 (currently 8.67)
- Tweet V3 abstract DNA avgComposite ≤ 2 (voice guard)
- Tweet V3 generic topic: `"88 bin"` string'i çıkmamalı (halüsinasyon guard)

Eşik altı → rollout başarısız.

### 7.2 Manuel UAT
3 hesap × 4 mod = 12 vaka. Ekran görüntüsü karşılaştırma. Kontrol listesi:
- [ ] @ekremistsokrat / Quote (orijinal şikayet) → V3 birebir skor
- [ ] @istbekliyor / Tweet + kampanya topic → voice korunuyor mu
- [ ] Soyut voice hesabı (varsa library'de) / Tweet → şiirsel ton intact mı
- [ ] Herhangi / Reply → 50-150 char sınırı aşılmamış
- [ ] Herhangi / Thread → 5 tweet, arc intact, en az 1 CAPS, en az 1 özel isim
- [ ] Hiç fact olmayan trend başlığı / Tweet → V0'a düşüyor mu

## 8. Riskler ve Karşı Önlemler

| Risk | İhtimal | Etki | Önlem |
|---|---|---|---|
| Halüsinasyon (trend skoru fact sanılır) | Orta | Yüksek (yanlış fact publish riski) | `ANTI_HALLU` clause + regression test |
| Abstract voice kaybı | Düşük (gate var) | Orta | `isAbstractVoice` heuristik + manuel UAT |
| Low-data DNA (18 tweet) yanlış sınıflandırılır | Düşük | Düşük | Heuristik conservative — şüphedeysen V0'a düşer |
| Prompt uzunluğu cost artışı | Kesin | Düşük | +300 token/çağrı ≈ +$0.00005 — ihmal |
| Arc bozulması Thread'de | Düşük | Orta | Test 4.6→arc korunuyor, regression eşiği |
| Gemini 3.1 lite responseJsonSchema farklılığı | Düşük | Düşük | Sadece metin çıktı — schema yok |

## 9. Iş Paketleri

| # | Paket | Süre | Blokaj |
|---|---|---|---|
| 1 | `api/generate-tweet.js` — yardımcı fonksiyonlar (isAbstractVoice, hasRichContext, ANTI_HALLU, REASONING_RULE) | 15 dk | — |
| 2 | Quote + Reply mode — V3 promptları (tr + en) | 30 dk | 1 |
| 3 | Thread mode — slot-aware reasoning (tr + en) | 30 dk | 1 |
| 4 | Tweet mode — koşullu dispatch (abstract + rich context gate) | 45 dk | 1 |
| 5 | Feature flag wiring (`REASONING_V2_ENABLED`) | 10 dk | 2-4 |
| 6 | `_experiments/regression.mjs` + eşik assertleri | 30 dk | 2-4 |
| 7 | Manuel UAT (7.2 listesi) | 30 dk | 5-6 |
| 8 | Git commit + Vercel deploy (flag=false) | 10 dk | 7 |
| 9 | Production smoke (flag=true, 2-3 tweet) + flag tam açık | 15 dk | 8 |

**Toplam aktif süre: ~3.5 saat.** UAT dahil aynı gün tamamlanabilir.

## 10. Açık Soru — Kullanıcının Onayı

1. **Abstract voice gate** — heuristik mi yoksa manuel DNA alanı mı? Heuristik önerim: ilk sürümde heuristik, ikinci sürümde DNA'ya `reasoning_compatible: true/false` alanı eklenebilir.
2. **Reply char sınırı** — 50-150 kısıtı reasoning enjeksiyonunu zorlaştırıyor. 80-200'e çıkarsa daha iyi sonuç gelebilir. Zorunlu değil; kontrolsüz risk.
3. **Feature flag default** — ilk deploy'da `false` mu yoksa tüm hesaplar `true` mu? Temkinli = `false`, agresif = `true`.

Cevaplarını bekliyorum; onay gelince doğrudan uygulayabilirim.
