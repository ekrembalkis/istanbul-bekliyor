# X Algoritması Kaynak Kod Analizi

## Kaynak
X'in açık kaynak "For You Feed" algoritması (x-algorithm-main repo, Ocak 2026 sürümü). Rust + Python (JAX). Grok tabanlı transformer model.

## Sistem Mimarisi

```
Kullanıcı İsteği
    ↓
HOME MIXER (Orkestrasyon)
    ↓
┌─────────────────────────────────┐
│ 1. Query Hydration               │
│    User Action Sequence          │
│    User Features (takip listesi) │
├─────────────────────────────────┤
│ 2. Candidate Sources             │
│    Thunder (in-network)          │
│    Phoenix Retrieval (out-of-net)│
├─────────────────────────────────┤
│ 3. Hydration                     │
│    Core data, author info, media │
├─────────────────────────────────┤
│ 4. Pre-Scoring Filters           │
│    Duplicate, age, self, muted   │
├─────────────────────────────────┤
│ 5. Scoring                       │
│    Phoenix Scorer (ML tahminler) │
│    Weighted Scorer (ağırlıklar)  │
│    Author Diversity Scorer       │
│    OON Scorer                    │
├─────────────────────────────────┤
│ 6. Selection (Top K)             │
├─────────────────────────────────┤
│ 7. Post-Selection (VF Filter)    │
└─────────────────────────────────┘
    ↓
Sıralanmış Feed
```

## Phoenix Scorer — 19 Engagement Tahmini

Phoenix Grok transformer modeli her tweet için şu aksiyonların olasılığını tahmin eder:

### Pozitif Aksiyonlar
- `ServerTweetFav` — beğeni
- `ServerTweetReply` — yanıt
- `ServerTweetRetweet` — repost
- `ServerTweetQuote` — alıntı tweet
- `ClientTweetClick` — tweete tıklama
- `ClientTweetClickProfile` — profile tıklama
- `ClientTweetVideoQualityView` — video izleme (kaliteli)
- `ClientTweetPhotoExpand` — fotoğraf büyütme
- `ClientTweetShare` — paylaşma
- `ClientTweetClickSendViaDirectMessage` — DM ile paylaşma
- `ClientTweetShareViaCopyLink` — link kopyalama
- `ClientTweetRecapDwelled` — tweette bekleme (dwell)
- `ClientTweetFollowAuthor` — yazarı takip etme
- `DwellTime` (sürekli değer) — tweette geçirilen süre

### Negatif Aksiyonlar
- `ClientTweetNotInterestedIn` — ilgilenmiyorum
- `ClientTweetBlockAuthor` — engelleme
- `ClientTweetMuteAuthor` — susturma
- `ClientTweetReport` — şikayet

## Weighted Scorer — Skor Hesaplama

```
Final Score = Σ(weight_i × P(action_i))
```

Pozitif aksiyonlar pozitif ağırlık, negatif aksiyonlar negatif ağırlık alır. Gerçek ağırlık değerleri `params` modülünde, açık kaynak sürümünden güvenlik nedeniyle çıkarılmış (`lib.rs`: "Excluded from open source release for security reasons").

Harici kaynaklardan tahmin edilen ağırlıklar:
- Reply (yazar cevap verirse) ≈ +75 (en güçlü sinyal, 150x like değeri)
- Reply (normal) ≈ +13.5 (27x like)
- Bookmark + dwell >2dk ≈ +10.0 (20x like)
- Retweet ≈ +1.0 (2x like)
- Like ≈ +0.5 (referans)

## Author Diversity Scorer

Kaynak: `home-mixer/scorers/author_diversity_scorer.rs`

```rust
fn multiplier(&self, position: usize) -> f64 {
    (1.0 - self.floor) * self.decay_factor.powf(position as f64) + self.floor
}
```

Aynı yazarın feed'de 2. tweeti: skor × decay
Aynı yazarın feed'de 3. tweeti: skor × decay²
...

Bu, tek hesaptan çok tweet atmanın algoritmik olarak kendini sabote ettiği anlamına gelir. Günde 2 veya 3 tweet optimal.

## OON Scorer

Kaynak: `home-mixer/scorers/oon_scorer.rs`

```rust
let updated_score = c.score.map(|base_score| match c.in_network {
    Some(false) => base_score * p::OON_WEIGHT_FACTOR,
    _ => base_score,
});
```

Takip etmediğin hesaplardan gelen içerikler `OON_WEIGHT_FACTOR` ile çarpılarak düşürülür. Bu, hedef kitlenin hesabı önceden takip etmesinin kritik olduğunu gösterir.

## VF Filter (Visibility Filtering)

Kaynak: `home-mixer/filters/vf_filter.rs`

```rust
fn should_drop(reason: &Option<FilteredReason>) -> bool {
    match reason {
        Some(FilteredReason::SafetyResult(safety_result)) => {
            matches!(safety_result.action, Action::Drop(_))
        }
        Some(_) => true,
        None => false,
    }
}
```

Spam, şiddet, gore, silinen içerikler tamamen kaldırılır. Provokatif veya saldırgan dil VF filtresini tetikleyebilir. Mesajlar her zaman yapıcı ve umut dolu olmalı.

## Link Cezası

Harici kaynak (Buffer 52M post analizi + PostEverywhere kaynak kod analizi):
- Dış link içeren tweetler yüzde 30 ila 50 erişim cezası alır
- Ücretsiz hesaplar + link = medyan etkileşim sıfıra yakın
- A/B test: link kaldırıldığında yüzde 1700 erişim artışı
- ÇÖZÜM: Link varsa ilk yanıta koy

## Premium Boost

- Premium aboneler yaklaşık 4x in-network boost
- Yaklaşık 2x out-of-network boost
- Toplam yaklaşık 10x daha fazla erişim
- TweepCred skoru 65 altında olan hesapların sadece 3 tweeti değerlendirilir

## İçerik Format Performansı

Buffer 52M+ post analizi (2026):
- Metin: yüzde 3.56 medyan etkileşim oranı
- Görsel: yüzde 3.40
- Video: yüzde 2.96
- Link: yüzde 2.25

X, video'nun lider olduğu diğer platformlardan farklı olarak metin ağırlıklı bir platform.

## İlk Saat Penceresi

İlk 60 dakikadaki etkileşim, içeriğin geniş dağıtım havuzuna alınıp alınmayacağını belirler. Yüksek ilk saat engagement = algoritmik amplifikasyon.

## Optimal Paylaşım Zamanları

Salı ila Perşembe sabahları en yüksek erişim. X Spaces canlı oturumları ayrıca algoritmik promosyon alır.
