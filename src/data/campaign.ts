export interface DayPlan {
  dayOffset: number
  theme: string
  emoji: string
  scene: string
  goldenElement: string
  prompt: string
  tweetTemplate: string
}

// 30 rotating themes from campaign research
export const DAY_PLANS: DayPlan[] = [
  {
    dayOffset: 0,
    theme: 'Boş Koltuk',
    emoji: '⏳',
    scene: 'Ofis koltuğu karanlık odada',
    goldenElement: 'Koltuğa düşen ışık',
    prompt: `Minimalist editorial photograph of an empty executive office chair in the center of a dark barely lit room. The chair is modern black leather positioned facing the viewer. A single beam of warm amber light falls diagonally across the chair from upper left creating a sharp geometric shadow on the floor. Everything else is deep black and dark gray. Stark high contrast black and white with only the light beam having a subtle warm golden tone (#D4A843). Bold clean text reading "GÜN {day}" in large uppercase sans-serif font at the top of the frame. Brutalist minimalist style. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

İstanbul seçilmiş belediye başkanını bekliyor.

{day} gün.

Ve her gün daha çok hatırlıyoruz.

Siz kaç gündür bekliyorsunuz?

#İstanbulBekliyor`
  },
  {
    dayOffset: 1,
    theme: 'Boğaz',
    emoji: '🌊',
    scene: 'Köprü silueti',
    goldenElement: 'Köprü ortasında nokta',
    prompt: `Minimalist black and white photograph of the Bosphorus Bridge silhouette at dusk shot from far away as a thin dark line across the frame. The entire image is in deep blacks and grays. At the exact center point of the bridge a single small dot of warm amber gold light (#D4A843) glows. Vast empty sky above dark water below. Extreme negative space. Shot on 200mm telephoto. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font in the upper portion. Brutalist minimalist style. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Boğaz'ın iki yakası birbirini bekliyor.
İstanbul da bekliyor.

#İstanbulBekliyor`
  },
  {
    dayOffset: 2,
    theme: 'Metro',
    emoji: '🚇',
    scene: 'Boş metro istasyonu',
    goldenElement: 'Raylar üstünde çizgi',
    prompt: `Minimalist photograph of an empty modern metro station platform shot in stark black and white. Long perspective with tunnel disappearing into complete darkness. Polished floor reflects faint light. The metro tracks have a single thin line of warm amber color (#D4A843) running along them into the vanishing point. No people. Austere silent waiting. Shot on 35mm wide angle lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif at top. Brutalist minimalist editorial style. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Her gün binlerce İstanbullu onun başlattığı metrolarla işe gidiyor.
Hatırlıyorlar.

Siz de hatırlıyor musunuz?

#İstanbulBekliyor`
  },
  {
    dayOffset: 3,
    theme: 'Galata',
    emoji: '🏰',
    scene: 'Kule silueti gece',
    goldenElement: 'Tepe feneri',
    prompt: `Minimalist nighttime silhouette of Galata Tower against a black sky shot from below looking up. The tower is a dark gray shape against slightly lighter dark sky. Only the very top lantern of the tower glows with warm amber light (#D4A843) like a single candle in darkness. Extreme contrast nearly abstract. Shot on 85mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Brutalist minimalist style. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Galata Kulesi 600 yıldır İstanbul'u izliyor.
{day} gündür de bekliyor.

#İstanbulBekliyor`
  },
  {
    dayOffset: 4,
    theme: 'Karanfil',
    emoji: '🌺',
    scene: 'Koltuk üstünde çiçek',
    goldenElement: 'Karanfil',
    prompt: `Extreme close-up minimalist photograph of a single carnation flower lying on a black leather office chair seat. The entire image is in stark black and white except the carnation which has a warm amber golden tone (#D4A843). Shallow depth of field the leather texture visible but slightly soft. Dark background. Shot on macro 90mm lens at f/2. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font at top. Brutalist minimalist editorial. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Koltuk boş.
Halk dolu.

#İstanbulBekliyor`
  },
  {
    dayOffset: 5,
    theme: 'Vapur',
    emoji: '⛴️',
    scene: 'Sisli iskelede vapur',
    goldenElement: 'Ufuk çizgisi',
    prompt: `Minimalist photograph of a ferry boat silhouette waiting at a dock in thick morning fog shot in black and white. The entire scene is shrouded in gray mist. Only a thin horizontal line at the horizon glows with warm amber light (#D4A843) suggesting a sunrise that has not fully arrived yet. The ferry is barely visible ghostlike. Extreme atmospheric quiet patient. Shot on 135mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Moody minimalist style. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Vapurlar her gün kalkar.
Adalet de bir gün kalkacak.

#İstanbulBekliyor`
  },
  {
    dayOffset: 6,
    theme: 'Çocuklar',
    emoji: '👶',
    scene: 'Boş bahçe salıncaklar',
    goldenElement: 'Tek salıncak',
    prompt: `Minimalist photograph of an empty school playground shot in stark black and white. A row of identical swings hangs motionless. One single swing in the center is colored in warm amber gold (#D4A843) gently angled as if someone just left it. The rest are gray and still. Concrete ground chain link fence barely visible in background darkness. Shot on 50mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font at top. Brutalist minimalist poignant silent. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Bu şehrin çocukları bir gün bunu tarih kitaplarında okuyacak.

#İstanbulBekliyor`
  },
  {
    dayOffset: 7,
    theme: 'Meydan',
    emoji: '🏛️',
    scene: 'Kuşbakışı boş meydan',
    goldenElement: 'Tek kişinin gölgesi',
    prompt: `Minimalist aerial photograph looking straight down at a vast empty public square shot in black and white. Cobblestone texture visible. In the exact center of the square a single person long shadow stretches across the ground cast by low golden amber light (#D4A843) from the edge of frame. The person themselves is tiny almost invisible. Massive negative space. Drone shot perfectly symmetrical. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Bir kişi bile durduğu sürece,
meydan boş değildir.

Siz de duruyor musunuz?

#İstanbulBekliyor`
  },
  {
    dayOffset: 8,
    theme: 'Pencere',
    emoji: '🪟',
    scene: 'Beton duvarda pencere',
    goldenElement: 'Perde arasından ışık',
    prompt: `Minimalist photograph of a single window in a concrete wall shot straight on in stark black and white. The window is dark curtains drawn. Through a tiny gap in the curtains a thin vertical sliver of warm amber light (#D4A843) escapes. The wall is textured weathered concrete filling the entire frame. Nothing else. Shot on 85mm lens flat perspective. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Brutalist raw minimalist style. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Duvarlar sesi kapatabilir.
Ama ışığı değil.

#İstanbulBekliyor`
  },
  {
    dayOffset: 9,
    theme: 'Sandalyeler',
    emoji: '💺',
    scene: 'Boş salon sıraları',
    goldenElement: 'Öndeki tek sandalye',
    prompt: `Minimalist photograph of hundreds of empty chairs arranged in perfect rows in a large hall shot from the back in black and white. All chairs face forward toward a stage or podium that is empty. A single chair in the front row has a warm amber golden glow (#D4A843) as if a light shines only on it. The rest are in shadow. Shot on 35mm wide angle. Deep perspective. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font at top. Stark institutional powerful. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Sandalyeler boş durabilir.
İrade boş durmaz.

#İstanbulBekliyor`
  },
  {
    dayOffset: 10,
    theme: 'Skyline',
    emoji: '🌃',
    scene: 'Gece İstanbul silueti',
    goldenElement: 'Kıyı ışık çizgisi',
    prompt: `Minimalist photograph of the Istanbul skyline at night seen from across the water entirely in black silhouette against a dark gray sky. The city is a jagged dark shape. Along the waterline a single thin continuous line of warm amber light (#D4A843) traces the coast like a heartbeat monitor line. Perfectly still water creates a mirror reflection. Shot on 200mm telephoto. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Ultra minimal poetic. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

İstanbul'un kalbi atıyor.
{day} gündür.
Durmadan.

#İstanbulBekliyor`
  },
  {
    dayOffset: 11,
    theme: 'Sokak Lambası',
    emoji: '🔦',
    scene: 'Gece arnavut kaldırım',
    goldenElement: 'Lamba ışık çemberi',
    prompt: `Minimalist photograph of a single streetlamp on an empty Istanbul cobblestone street at night shot in black and white. The lamp casts a perfect circle of warm amber light (#D4A843) on the wet cobblestones below. Beyond the circle of light everything fades to pure black. Rain drops visible in the light beam. Shot on 50mm lens at f/1.8. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Noir minimalist style atmospheric. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Karanlık ne kadar derin olursa olsun,
tek bir ışık yeter.

#İstanbulBekliyor`
  },
  {
    dayOffset: 12,
    theme: 'Buğulu Cam',
    emoji: '💧',
    scene: 'El cam üstünde',
    goldenElement: 'Parmak izlerinden şehir',
    prompt: `Minimalist photograph of a hand pressing flat against a glass window from the inside shot in stark black and white. The glass has condensation on it. Through the fogged glass a blurred cityscape of Istanbul minarets is barely visible. The fingertips leave five small clear marks on the foggy glass and through those marks the warm amber light (#D4A843) of the city filters through. Shot on macro lens shallow depth of field. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Intimate confined yearning. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Camın arkasından İstanbul'u izlemek.
{day} gündür.

#İstanbulBekliyor`
  },
  {
    dayOffset: 13,
    theme: 'Ağaç',
    emoji: '🌳',
    scene: 'Boş tarlada ağaç',
    goldenElement: 'Dal uçlarında ışık',
    prompt: `Minimalist photograph of a single tree in the middle of a vast empty field shot in stark black and white from far away. The tree is leafless its bare branches reaching upward like outstretched arms. The very tips of the highest branches catch warm amber light (#D4A843) from a low sun just out of frame. Everything else is dark earth and gray sky. Extreme negative space the tree tiny in the frame. Shot on 200mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Existential minimalist. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Kökler ne kadar derin olursa,
fırtınalar o kadar anlamsız olur.

#İstanbulBekliyor`
  },
  {
    dayOffset: 14,
    theme: 'Tramvay',
    emoji: '🚊',
    scene: 'İstiklal Caddesi rayları',
    goldenElement: 'Ray üstünde altın çizgi',
    prompt: `Minimalist photograph of empty tram tracks running down a deserted Istiklal Avenue at night shot in stark black and white. The tracks converge into the darkness ahead. A single thin line of warm amber light (#D4A843) runs along one rail reflecting a distant unseen source. Wet cobblestones flanking the tracks. Shot on 35mm lens low angle. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font at top. Brutalist noir minimalist style. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

İstiklal Caddesi'nin rayları hâlâ aynı yöne bakıyor.
İleri.

#İstanbulBekliyor`
  },
  {
    dayOffset: 15,
    theme: 'Martı',
    emoji: '🐦',
    scene: 'Çatıda tek martı',
    goldenElement: 'Martı altın',
    prompt: `Minimalist photograph of a single seagull perched on a rooftop edge against a vast gray sky shot in black and white. The bird faces left looking out over an unseen city. The seagull is rendered in warm amber gold (#D4A843) while everything else is deep gray and black. Extreme negative space vast empty sky. Shot on 200mm telephoto. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Contemplative minimalist. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Martılar özgür.
İstanbul da öyle olacak.

#İstanbulBekliyor`
  },
  {
    dayOffset: 16,
    theme: 'Saat Kulesi',
    emoji: '🕐',
    scene: 'Dolmabahçe saat kulesi',
    goldenElement: 'Kadran altın',
    prompt: `Minimalist photograph of a clock tower silhouette against a dark sky shot in black and white. The tower is a dark geometric shape. Only the circular clock face glows with warm amber light (#D4A843) showing the time. Everything else is black and charcoal. Shot on 85mm lens centered composition. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Time as protest. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Zaman durmaz.
Adalet de durmayacak.

#İstanbulBekliyor`
  },
  {
    dayOffset: 17,
    theme: 'Kitap',
    emoji: '📖',
    scene: 'Açık kitap karanlıkta',
    goldenElement: 'Sayfa kenarı altın',
    prompt: `Minimalist photograph of an open book lying face down on a dark surface shot in stark black and white from above. The pages fan outward. The gilt edges of the pages glow with warm amber light (#D4A843) creating a thin luminous arc. Everything else is in deep shadow. Shot on 50mm lens directly above. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Quiet intellectual resistance. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Kitaplar kapatılamaz.
Fikirler hapsedilemez.

#İstanbulBekliyor`
  },
  {
    dayOffset: 18,
    theme: 'Ayakkabılar',
    emoji: '👟',
    scene: 'Kapı önünde çift ayakkabı',
    goldenElement: 'Tek ayakkabı altın',
    prompt: `Minimalist photograph of a pair of shoes placed neatly at a doorstep shot in stark black and white from above. The door is closed dark wood. One shoe is rendered in warm amber gold (#D4A843) while the other remains gray. A thin strip of light visible under the door. Shot on 50mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Domestic intimate absence. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Kapının önünde ayakkabılar duruyor.
Sahibi {day} gündür gelmiyor.

#İstanbulBekliyor`
  },
  {
    dayOffset: 19,
    theme: 'Balkon',
    emoji: '🏙️',
    scene: 'İstanbul manzaralı balkon',
    goldenElement: 'Korkulukta altın ışık',
    prompt: `Minimalist photograph of an empty balcony overlooking the Istanbul cityscape at dusk shot in black and white. Iron railing in foreground the city a blur of dark shapes behind. A single section of the railing catches warm amber light (#D4A843) from the setting sun. A single empty chair on the balcony. Shot on 35mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Longing atmospheric. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Balkondan İstanbul'a bakmak.
Güzel de olsa eksik.

#İstanbulBekliyor`
  },
  {
    dayOffset: 20,
    theme: 'Deniz Feneri',
    emoji: '🗼',
    scene: 'Boğaz\'da fener',
    goldenElement: 'Fener ışığı',
    prompt: `Minimalist photograph of a lighthouse on the Bosphorus shore at night shot in stark black and white. The lighthouse is a dark silhouette against slightly lighter sky. Its lamp emits a single beam of warm amber light (#D4A843) cutting through fog horizontally across the frame. Dark water below. Shot on 135mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Navigational hope. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Deniz fenerleri en karanlık gecelerde yanar.
Çünkü birileri yolunu arıyor.

#İstanbulBekliyor`
  },
  {
    dayOffset: 21,
    theme: 'Çeşme',
    emoji: '🚰',
    scene: 'Osmanlı çeşmesi',
    goldenElement: 'Akan su altın',
    prompt: `Minimalist photograph of an old Ottoman stone fountain in a dark alley shot in stark black and white. Ornate carved stone weathered by centuries. A thin stream of water flows from the spout rendered in warm amber gold (#D4A843) catching light. Everything else is deep shadow and gray stone. Shot on 85mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Enduring timeless. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Çeşmeler yüzyıllardır akıyor.
İstanbul'un sabrı da öyle.

#İstanbulBekliyor`
  },
  {
    dayOffset: 22,
    theme: 'Bayrak',
    emoji: '🏴',
    scene: 'Direkte dalgalanan bayrak',
    goldenElement: 'Bayrak altın',
    prompt: `Minimalist photograph of a single flag on a tall pole against a vast dark sky shot in stark black and white from below. The flag waves in wind its fabric creating dynamic folds. The flag is rendered in warm amber gold (#D4A843) while the pole and sky are deep black and gray. Shot on 200mm telephoto. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Defiant dignified. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Bayraklar rüzgâra rağmen dalgalanır.
İrade de öyle.

#İstanbulBekliyor`
  },
  {
    dayOffset: 23,
    theme: 'Köprü Altı',
    emoji: '🌉',
    scene: 'Köprünün altından bakış',
    goldenElement: 'Su yüzeyinde yansıma',
    prompt: `Minimalist photograph shot from underneath a bridge looking up at its massive dark structure in black and white. Steel beams converge to a vanishing point. On the dark water below a single ripple of warm amber light (#D4A843) reflects from an unseen source. Geometric industrial vast. Shot on 24mm ultra wide lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Monumental perspective. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Köprüler iki yakayı birleştirir.
Sabır da bugünü yarına.

#İstanbulBekliyor`
  },
  {
    dayOffset: 24,
    theme: 'Merdiven',
    emoji: '🪜',
    scene: 'Uzun taş merdiven',
    goldenElement: 'En üstteki basamak',
    prompt: `Minimalist photograph of a long stone staircase ascending into darkness shot in black and white from the bottom looking up. The steps are worn smooth by centuries of footsteps. The very top step catches warm amber light (#D4A843) from above suggesting a destination. Everything else in deep shadow. Shot on 35mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Ascent perseverance. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Her basamak bir gün.
Yukarıda ışık var.

#İstanbulBekliyor`
  },
  {
    dayOffset: 25,
    theme: 'Kapı',
    emoji: '🚪',
    scene: 'Eski ahşap kapı',
    goldenElement: 'Anahtar deliğinden ışık',
    prompt: `Minimalist photograph of an old heavy wooden door in a stone wall shot straight on in stark black and white. The door is closed with iron studs and an old keyhole. Through the keyhole a thin beam of warm amber light (#D4A843) projects outward onto the ground. Everything else is dark textured stone and aged wood. Shot on 50mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Confinement and hope. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Kapılar kapanabilir.
Ama ışık her aralıktan sızar.

#İstanbulBekliyor`
  },
  {
    dayOffset: 26,
    theme: 'Minare',
    emoji: '🕌',
    scene: 'Tek minare gökyüzüne',
    goldenElement: 'Şerefe altın',
    prompt: `Minimalist photograph of a single minaret reaching into a dark sky shot in stark black and white from below. The minaret is a slender dark silhouette. Only the sherefe balcony near the top catches warm amber light (#D4A843) like a crown. Vast empty sky extreme vertical composition. Shot on 200mm telephoto. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Sacred vertical. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Minareler gökyüzüne uzanır.
Umut da öyle.

#İstanbulBekliyor`
  },
  {
    dayOffset: 27,
    theme: 'Balıkçı',
    emoji: '🎣',
    scene: 'İskelede boş sandalye + olta',
    goldenElement: 'Olta ucu altın',
    prompt: `Minimalist photograph of an empty folding chair and fishing rod at the edge of a dock shot in stark black and white. The rod extends over dark water. The very tip of the fishing line where it meets the water glows with warm amber light (#D4A843) creating a single point of contact. No person. Shot on 85mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Patient waiting. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Balıkçı sabırla bekler.
İstanbul da bekliyor.

#İstanbulBekliyor`
  },
  {
    dayOffset: 28,
    theme: 'Yağmur',
    emoji: '🌧️',
    scene: 'Yağmurda boş sokak',
    goldenElement: 'Bir birikintideki yansıma',
    prompt: `Minimalist photograph of an empty rain-soaked Istanbul street at night shot in stark black and white. Puddles on cobblestones reflect the dark buildings above. In a single puddle a warm amber golden reflection (#D4A843) of an unseen streetlamp creates a perfect circle of light in the dark water. Shot on 50mm lens low angle near ground level. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Melancholic resilient. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Yağmur yağar, İstanbul ıslanır.
Ama durulmaz.

#İstanbulBekliyor`
  },
  {
    dayOffset: 29,
    theme: 'Güvercin',
    emoji: '🕊️',
    scene: 'Cami avlusunda güvercinler',
    goldenElement: 'Tek güvercin altın',
    prompt: `Minimalist photograph of pigeons in a mosque courtyard shot in stark black and white from above. A flock of gray pigeons scattered on stone ground. One single pigeon in the center is rendered in warm amber gold (#D4A843) looking upward. Ancient stone columns barely visible in background. Shot on 85mm lens. Bold clean text reading "GÜN {day}" in large uppercase sans-serif font. Peace and persistence. 1:1 aspect ratio at 2K resolution.`,
    tweetTemplate: `GÜN {day}.

Güvercinler her sabah meydana döner.
İstanbul da her sabah hatırlıyor.

#İstanbulBekliyor`
  },
]

export const ALGORITHM_RULES = [
  {
    title: 'Link Cezası',
    content: 'Dış bağlantı içeren tweetler %30\u201350 erişim cezası alır. Link varsa ilk yanıta koy. A/B test: link kaldırıldığında %1700 erişim artışı.',
    weight: 'KRİTİK' as const,
  },
  {
    title: 'Author Diversity Cezası',
    content: 'X algoritması aynı yazardan gelen ardışık içerikleri üstel decay ile cezalandırır. Formül: multiplier = (1 − floor) × decay^position + floor. Günde 2\u20133 tweet optimal.',
    weight: 'KRİTİK' as const,
  },
  {
    title: 'Visibility Filter',
    content: 'Provokatif veya saldırgan dil VF filtresini tetikler. Spam, şiddet, gore içerikler tamamen kaldırılır. Mesajlar yapıcı ve umut dolu olmalı.',
    weight: 'KRİTİK' as const,
  },
  {
    title: 'Reply Zinciri Gücü',
    content: 'Yazar cevaplı reply ≈ +75 puan (150× like). Normal reply ≈ +13.5 (27× like). Gelen her reply\'a cevap ver — en yüksek engagement sinyali.',
    weight: 'YÜKSEK' as const,
  },
  {
    title: 'İlk Saat Penceresi',
    content: 'İlk 60 dakikadaki etkileşim, içeriğin geniş dağıtım havuzuna alınıp alınmayacağını belirler. Paylaşım sonrası 1 saat aktif ol.',
    weight: 'YÜKSEK' as const,
  },
  {
    title: 'Metin > Görsel > Video > Link',
    content: 'Buffer 52M+ post analizi: Metin %3.56, Görsel %3.40, Video %2.96, Link %2.25 etkileşim oranı. Metin + görsel kombinasyonu ideal.',
    weight: 'YÜKSEK' as const,
  },
  {
    title: 'Tek Hashtag Odağı',
    content: '#İstanbulBekliyor tek hashtag. 2\'den fazla hashtag spam gibi görünür ve algoritmik ceza alır. Enerji dağıtma.',
    weight: 'YÜKSEK' as const,
  },
  {
    title: 'OON Weight Factor',
    content: 'Takip etmediğin hesaplardan gelen içerikler otomatik düşürülür (base_score × OON_WEIGHT_FACTOR). Hedef kitlenin hesabı takip etmesi kritik.',
    weight: 'YÜKSEK' as const,
  },
  {
    title: 'Premium Boost',
    content: 'Premium aboneler ~4× in-network ve ~2× out-of-network boost alır. Toplam ~10× daha fazla erişim. TweepCred 65 altı hesapların sadece 3 tweeti değerlendirilir.',
    weight: 'ORTA' as const,
  },
  {
    title: 'Dwell Time',
    content: 'Kullanıcının tweette geçirdiği süre önemli bir pozitif sinyal. Bookmark + dwell >2dk ≈ +10 puan (20× like). Satır araları ve görsel yapı dwell time artırır.',
    weight: 'ORTA' as const,
  },
]

export const MILESTONES = [
  { day: 50, label: 'İlk 50 Gün', type: 'milestone' },
  { day: 100, label: '100. Gün', type: 'milestone' },
  { day: 150, label: '150. Gün', type: 'milestone' },
  { day: 200, label: '200. Gün', type: 'milestone' },
  { day: 250, label: '250. Gün', type: 'milestone' },
  { day: 300, label: '300. Gün', type: 'milestone' },
  { day: 366, label: '1. Yıl Dönümü', type: 'anniversary' },
  { day: 400, label: '400. Gün', type: 'milestone' },
  { day: 500, label: '500. Gün', type: 'milestone' },
  { day: 731, label: '2. Yıl Dönümü', type: 'anniversary' },
]

export function getDayPlan(dayNumber: number): DayPlan {
  const offset = (dayNumber - 1) % DAY_PLANS.length
  const index = offset >= 0 ? offset : offset + DAY_PLANS.length
  const plan = DAY_PLANS[index]
  return {
    ...plan,
    prompt: plan.prompt.replace(/\{day\}/g, String(dayNumber)),
    tweetTemplate: plan.tweetTemplate.replace(/\{day\}/g, String(dayNumber)),
  }
}

export function getNextMilestone(currentDay: number) {
  return MILESTONES.find(m => m.day >= currentDay)
}

export function isMilestoneDay(day: number) {
  return MILESTONES.find(m => m.day === day) || (day % 50 === 0) || (day % 100 === 0)
}
