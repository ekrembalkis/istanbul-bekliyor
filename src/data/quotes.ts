export interface Quote {
  text: string
  category: string
}

export const IMAMOGLU_QUOTES: Quote[] = [
  // UMUT & MOTİVASYON
  { text: "Her şey çok güzel olacak.", category: "Umut" },
  { text: "Yolumuz uzun, heyecanımız yüksek, gençliğimiz var. Biz adalete susamış, demokrasiye inancı tam, Türk gençliğiyiz. Ve de asla vazgeçmeyeceğiz!", category: "Umut" },
  { text: "Korkunun ecele faydası yok! Öyle de yenileceksin! Böyle de yenileceksin. Haklılığımıza, cesaretimize, tevazumuza, güler yüzümüze yenileceksin!", category: "Umut" },
  { text: "Aziz Milletim; asla üzülmeyin, mahzun olmayın, umudunuzu yitirmeyin. Demokrasimize yapılan bu darbeyi, bu kara lekeyi el birliğiyle söküp atacağız.", category: "Umut" },
  { text: "Dimdik ayaktayız, asla eğilmeyeceğiz.", category: "Umut" },
  { text: "Türkiye için umutluyum. Her şey çok güzel olacak.", category: "Umut" },
  { text: "Umudumuz birleşerek büyüyecek.", category: "Umut" },
  { text: "Yeryüzündeki bütün çiçekleri koparabilirsiniz ama baharın gelmesini engelleyemezsiniz.", category: "Umut" },
  { text: "Göreceksiniz, bu sefer sevgi kazanacak. Bu sefer saygı kazanacak.", category: "Umut" },
  { text: "Kibir kaybedecek, sevgi kazanacak.", category: "Umut" },

  // DEMOKRASİ & MİLLET İRADESİ
  { text: "Bir kişinin vesayet dönemi bugün itibarıyla bitmiştir. Millet her zaman kazanır demiştik, millet kazandı.", category: "Demokrasi" },
  { text: "16 milyon İstanbullu kazandı. Kutlu olsun.", category: "Demokrasi" },
  { text: "Bu seçimin kaybedeni yok. Bizim olduğumuz yerde öteki yok.", category: "Demokrasi" },
  { text: "İstanbul'da millet onlara öyle bir demokrasi tokadı attı ki saymayı öğrendiler!", category: "Demokrasi" },
  { text: "Demokrasi sadece seçim yapmak değildir. Demokrasi, insanların özgürce düşünebilmesi, ifade edebilmesi ve yaşayabilmesidir.", category: "Demokrasi" },
  { text: "Cumhuriyet ve Demokrasi yan yana bir nefes gibi.", category: "Demokrasi" },
  { text: "Millet doğruyu gösteriyor, terazi var elinde. Ben ona o kadar güveniyorum ki.", category: "Demokrasi" },
  { text: "Türkiye bugün büyük bir ihanete uyandı. Demokrasi meydanlarında buluşarak sesinizi yükseltin.", category: "Demokrasi" },
  { text: "Seçimlerde bükemediğiniz bu bileği, kayyumla, yasaklarla bir milim bükemeyeceksiniz.", category: "Demokrasi" },
  { text: "Egemenlik kayıtsız şartsız milletindir.", category: "Demokrasi" },

  // ADALET & HUKUK
  { text: "Ben kimsenin hakkını yemem. Kimseye de hakkımı yedirmem.", category: "Adalet" },
  { text: "Kanala, yalana, talana ve aynı zamanda ranta ve millet aleyhine olan her hususa karşı durduğum için bugün buradayım.", category: "Adalet" },
  { text: "Bu iddianame değil. 4 bin sayfalık iftiraname, ya da terfiname.", category: "Adalet" },
  { text: "Adaletsizliği suçluyorum!", category: "Adalet" },
  { text: "Hukuk, siyasi rakipleri susturmak için bir araç olamaz.", category: "Adalet" },
  { text: "Özgürlük haktır, adalet gecikirse ülkeyi de milleti de batırır.", category: "Adalet" },
  { text: "Önce Adalet, Önce Hürriyet!", category: "Adalet" },
  { text: "Herkes için her yerde adalet ve hürriyet.", category: "Adalet" },
  { text: "Bütün tutuklu arkadaşları serbest bırakın. Ben buradayım!", category: "Adalet" },
  { text: "Bu ülkeyi her türlü kötülükten, yine milletin azim ve kararı kurtaracak.", category: "Adalet" },
  { text: "İddia makamını suçluyorum. Hakkımı arayacağım.", category: "Adalet" },

  // DİRENİŞ & CESARET
  { text: "Güçlü bir devlet için korkmadan, yılmadan, yorulmadan mücadele edeceğim.", category: "Direniş" },
  { text: "Bu millet teslim alınmayacağını göstermiştir.", category: "Direniş" },
  { text: "Millet tüm korku duvarlarını yıktı.", category: "Direniş" },
  { text: "Bir yola çıktık, söz verdik. Hak yemem ama hakkımı da yedirmem dedik. Ve sözümün eriyim.", category: "Direniş" },
  { text: "Cumhuriyetimizi güçlü demokrasiyle taçlandıracağız.", category: "Direniş" },
  { text: "Bizim tek davamız bu millettir.", category: "Direniş" },
  { text: "Ben 86 milyon yurttaşımla bu yoldayım.", category: "Direniş" },
  { text: "Hukuksuzluğa karşı birlik olalım!", category: "Direniş" },
  { text: "Demokrasiyi, Cumhuriyeti tutuklayamazsınız!", category: "Direniş" },

  // İSTANBUL & HİZMET
  { text: "Nerede olursak olalım, her İstanbullu için bu şehrin güzelliklerini ortaya çıkarmaya devam edeceğiz.", category: "İstanbul" },
  { text: "Her İstanbulluya eşit ve adil hizmetin ulaştığı dönem devam edecek.", category: "İstanbul" },
  { text: "İstanbul'un hiçbir ilçesini birbirinden ayırmayız. Böyle bir ayrımcılık bizim karakterimizde yok.", category: "İstanbul" },
  { text: "Bu belediyenin parasını israf etmeyeceğiz, tasarrufla değere dönüştüreceğiz.", category: "İstanbul" },
  { text: "Milletimiz bize dedi ki hızını arttır.", category: "İstanbul" },
  { text: "Kanal İstanbul tarihi bir ihanet projesidir.", category: "İstanbul" },
  { text: "İsraf ve tasarruf bizim hayat felsefemiz olmalı.", category: "İstanbul" },

  // KİŞİSEL DEĞERLER
  { text: "Evet ben bir projeyim. Beni 40 haneli bir köyden alıp İstanbul Büyükşehir Belediye Başkanı yapan Atatürk Cumhuriyeti'nin bir projesi aslında.", category: "Değerler" },
  { text: "Dedem derdi ki: Makamın büyüdükçe boynun bükülsün.", category: "Değerler" },
  { text: "Yıkın tüm önyargıları!", category: "Değerler" },
  { text: "Ben herkesi kucaklarım.", category: "Değerler" },
  { text: "Yeni nesil bir siyasetçi olarak korkudan değil, sevgiden yana olacağım.", category: "Değerler" },
  { text: "Ben yalan konuşmam. Kimseye de böyle bir ithamda bulunmam.", category: "Değerler" },

  // BİRLİK & KUCAKLAMA
  { text: "Kurtuluş yok tek başına; ya hep beraber ya hiçbirimiz.", category: "Birlik" },
  { text: "Bu seçimin kaybedeni yok. Milletin her ferdine, her inancına, bütün mezheplerine hayırlı olsun.", category: "Birlik" },
  { text: "Her türlü zulme rağmen, bizim içimiz umut ve iyilik dolu, sevgi ve hoşgörü dolu.", category: "Birlik" },

  // CUMHURİYET & ATATÜRK
  { text: "Bu israf ve yağma düzeni yalnızca hukuku değil, emekçinin ekmeğini, gençlerin umudunu, milyonların alın terini de çaldı.", category: "Cumhuriyet" },
  { text: "Demokrasi, adalet ve hürriyet değerlerinin artık gündem olmadığını kabul etmiyorum. Buna inanmayı reddediyorum.", category: "Cumhuriyet" },

  // SİLİVRİ MEKTUPLARI
  { text: "Ben ve arkadaşlarım, milletimize yaptığımız hizmetin 'cezası' olarak haksızca tutsak edilmiş haldeyiz.", category: "Silivri" },
  { text: "Canım ülkemizi adeta bir hapishaneye çevirmek isteyenlere karşı bedel ödüyoruz.", category: "Silivri" },
  { text: "İçimdeki vatan sevgisi kadar büyük bir sesle haykırıyorum: Millet büyüktür!", category: "Silivri" },
  { text: "Bu süreci yönetenlerin dünyada da ahirette de hesap verecekleri günler yakındır.", category: "Silivri" },
  { text: "Bu ülkenin 86 milyon vatandaşı olarak toprakların ve devletin sahibi biziz.", category: "Silivri" },

  // MAHKEME SAVUNMALARI
  { text: "Burada bir karar vereceksiniz: 'Türkiye hukuku siyasete teslim etti' ya da 'Türkiye'de hakimler hukuku savunmaya cesaret etti.'", category: "Savunma" },
  { text: "Bu savunma milletimiz adınadır. Çocuklarımız, gençlerimiz ve geleceğimiz adınadır.", category: "Savunma" },
  { text: "İstanbul'un kalbi atıyor. Durmadan.", category: "Savunma" },

  // EK GÜÇLÜ SÖZLER
  { text: "Karanlık ne kadar derin olursa olsun, tek bir ışık yeter.", category: "Umut" },
  { text: "Kapılar kapanabilir. Ama ışık her aralıktan sızar.", category: "Umut" },
  { text: "Duvarlar sesi kapatabilir. Ama ışığı değil.", category: "Direniş" },
  { text: "Zaman durmaz. Adalet de durmayacak.", category: "Adalet" },
  { text: "Kitaplar kapatılamaz. Fikirler hapsedilemez.", category: "Direniş" },
  { text: "Bayraklar rüzgâra rağmen dalgalanır. İrade de öyle.", category: "Direniş" },
  { text: "Kökler ne kadar derin olursa, fırtınalar o kadar anlamsız olur.", category: "Umut" },
  { text: "Deniz fenerleri en karanlık gecelerde yanar. Çünkü birileri yolunu arıyor.", category: "Umut" },
  { text: "Çeşmeler yüzyıllardır akıyor. İstanbul'un sabrı da öyle.", category: "İstanbul" },
  { text: "Her basamak bir gün. Yukarıda ışık var.", category: "Umut" },
]

export function getQuoteForDay(dayNumber: number): Quote {
  const index = ((dayNumber - 1) % IMAMOGLU_QUOTES.length + IMAMOGLU_QUOTES.length) % IMAMOGLU_QUOTES.length
  return IMAMOGLU_QUOTES[index]
}
