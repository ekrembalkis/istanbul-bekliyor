# Profil Fotoğrafı ve Banner Promptları

## Profil Fotoğrafı

Karar: Kırmızı zemin + beyaz kum saati. AI ile üretildi, 4K kalite referans prompt:

```
Recreate this exact hourglass icon with perfect quality. Keep the 
exact same design: white hourglass symbol on solid red background 
(#E30A17). Make the edges mathematically crisp and sharp, like a 
vector graphic. The red background must be perfectly flat and uniform 
with zero texture, zero noise, zero grain. The white must be pure 
#FFFFFF. Clean up any pixelation or compression artifacts from the 
original. Maintain the exact same proportions, centering, and style 
but render at maximum sharpness and clarity. Pure flat 2D icon design 
with no shadows, no gradients, no 3D effects. 
1:1 aspect ratio.
```

API: aspectRatio "1:1", resolution "4K", temperature 0.4
Referans görsel yüklenecek.

NOT: Alternatif olarak bu ikon SVG/kod ile piksel piksel mükemmel üretilebilir. AI'nın flat ikon üretme kalitesi tutarsız olabiliyor.

## Banner

Banner kod ile üretildi (HTML to PNG). Kırmızı zemin, profil fotoğrafıyla aynı marka dili.

Dosya: assets/istanbul-bekliyor-banner.png (1500x500px)

İçerik:
- Sol: Kum saati logosu (kare, yarı saydam beyaz arka plan) + İSTANBUL BEKLİYOR büyük başlık
- Altında: "Her gün bir görsel. Her görsel bir ses. İstanbul seçilmiş başkanını bekliyor."
- Altında: "19 MART 2025'TEN BERİ"
- Sağ: "Takip et, hiçbir günü kaçırma." + Bildirimleri aç + TAKİP ET butonu
- Alt: İstanbul silueti (beyaz, düşük opacity)
- Tamamı kırmızı zemin (#E30A17)

Banner'ı güncellemek için: /assets/banner-source.html dosyasını düzenleyip wkhtmltoimage veya puppeteer ile PNG'ye çevir.
