import { getDayCount } from '../lib/utils'
import { DAY_PLANS } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'

export default function Settings() {
  const day = getDayCount()

  const promptTemplate = `Minimalist [SAHNE TURU] of [SAHNE DETAYI], shot in stark black and white. [DETAYLI ACIKLAMA]. [ALTIN ELEMAN] has a warm amber gold color (#D4A843). Everything else is deep black and charcoal gray. [KAMERA]. Bold clean text reading "GUN [SAYI]" in large uppercase sans-serif font at the top of the frame. Brutalist minimalist style. 1:1 aspect ratio at 2K resolution.`

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <h1 className="text-2xl font-serif font-bold text-slate-800">Ayarlar</h1>
      </div>

      {/* Campaign Info */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 mb-5 tracking-wider">KAMPANYA BILGILERI</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
          {[
            { label: 'Hesap', value: '@istbekliyor' },
            { label: 'Baslangic', value: '19 Mart 2025' },
            { label: 'Bugun', value: `GUN ${day}` },
            { label: 'Hashtag', value: '#IstanbulBekliyor' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[10px] text-slate-400 tracking-wider font-semibold mb-1">{item.label.toUpperCase()}</div>
              <div className="text-slate-700 font-mono font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Colors */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 mb-5 tracking-wider">MARKA RENKLERI</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { name: 'Marka Kirmizi', hex: '#E30A17', usage: 'Profil, banner' },
            { name: 'Altin Aksan', hex: '#D4A843', usage: 'Gunluk gorseller' },
            { name: 'Arka Plan', hex: '#0C0C12', usage: 'Panel (eski)' },
            { name: 'Kart', hex: '#16161E', usage: 'Kartlar (eski)' },
          ].map(c => (
            <div key={c.hex} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-slate-200 flex-shrink-0 shadow-card" style={{ backgroundColor: c.hex }} />
              <div>
                <div className="text-xs text-slate-600 font-semibold">{c.name}</div>
                <div className="text-[10px] font-mono text-slate-400">{c.hex}</div>
                <div className="text-[10px] text-slate-400">{c.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Template */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-brand-red tracking-wider">NANO BANANA PRO PROMPT SABLONU</h2>
          <CopyBtn text={promptTemplate} label="Sablon Kopyala" />
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-500 leading-relaxed border border-slate-100">
          {promptTemplate}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] text-slate-400">
          <div><span className="font-semibold text-slate-500">API:</span> aspectRatio "1:1"</div>
          <div><span className="font-semibold text-slate-500">Resolution:</span> 2K</div>
          <div><span className="font-semibold text-slate-500">Temperature:</span> 0.7</div>
        </div>
      </div>

      {/* Visual Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 mb-5 tracking-wider">GORSEL URETIM KURALLARI</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { num: '1', rule: 'Arka plan siyah veya koyu gri' },
            { num: '2', rule: 'Sahne Istanbul\'a ait mekan veya sembolik nesne' },
            { num: '3', rule: 'Tum sahne siyah beyaz' },
            { num: '4', rule: 'TEK BIR eleman altin (#D4A843) renginde' },
            { num: '5', rule: '"GUN [SAYI]" yazisi, temiz sans-serif' },
            { num: '6', rule: '1:1 kare format, 2K cozunurluk' },
          ].map(r => (
            <div key={r.num} className="flex items-start gap-3 text-sm p-3 bg-slate-50 rounded-xl">
              <span className="w-7 h-7 rounded-lg bg-brand-gold/10 text-brand-gold text-xs font-bold flex items-center justify-center flex-shrink-0">{r.num}</span>
              <span className="text-slate-600 mt-0.5">{r.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Pool */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 mb-5 tracking-wider">TEMA HAVUZU ({DAY_PLANS.length} Tema)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {DAY_PLANS.map((plan, i) => {
            const isActive = (day - 1) % DAY_PLANS.length === i
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive ? 'bg-brand-red/[0.05] border border-brand-red/15' : 'hover:bg-slate-50'
              }`}>
                <span className="text-[10px] font-mono text-slate-400 w-5 text-right">{i + 1}</span>
                <span className="text-base">{plan.emoji}</span>
                <span className={`font-medium ${isActive ? 'text-brand-red' : 'text-slate-600'}`}>{plan.theme}</span>
                <span className="text-[10px] text-slate-400 ml-auto truncate max-w-[140px]">{plan.scene}</span>
                {isActive && <span className="chip bg-brand-red/10 text-brand-red border-brand-red/20 text-[10px]">BUGUN</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tweet Format Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 mb-5 tracking-wider">TWEET FORMAT KURALLARI</h2>
        <div className="space-y-2.5 text-sm text-slate-500">
          {[
            'Tweet her zaman "GUN [SAYI]." ile baslar',
            '2 ila 4 satir kisa, siirsel metin',
            'Sonda #IstanbulBekliyor hashtag\'i',
            'ASLA dis link koyma',
            'Her tweete 1:1 kare gorsel ekle',
            'Gunde 1 ana tweet + gelen reply\'lara cevap',
            'Paylasim saati: 09:00 TSI',
            'Ton: yapici, umut dolu, asla saldirgan degil',
          ].map((rule, i) => (
            <div key={i} className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="w-6 h-6 rounded-md bg-brand-gold/10 text-brand-gold text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="mt-0.5">{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Strategy */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 mb-5 tracking-wider">MILESTONE STRATEJISI</h2>
        <div className="space-y-3 text-sm text-slate-500">
          {[
            { label: 'Her 50. gun', desc: 'Ozet thread (son 50 gunun en iyi gorselleri)' },
            { label: 'Her 100. gun', desc: 'Ozel gorsel + daha uzun metin' },
            { label: 'Yil donumleri', desc: 'Ozel kampanya (GUN 366, 731, ...)' },
            { label: 'Bayramlar', desc: 'Bayram temali gorsel (ama mesaj ayni)' },
            { label: 'Gundem', desc: 'Gundemle baglantili tema (mahkeme, AB raporu)' },
          ].map((m, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="chip bg-brand-gold/10 text-brand-gold border-brand-gold/20 w-28 text-center flex-shrink-0 text-[10px]">{m.label}</span>
              <span className="mt-0.5">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supabase Config */}
      <div className="card border-l-4 border-l-brand-gold p-6 bg-brand-gold-light">
        <h2 className="text-sm font-bold text-slate-600 mb-4 tracking-wider">SUPABASE YAPILANDIRMA</h2>
        <div className="text-xs text-slate-500 mb-3">
          <code className="chip text-brand-red text-[10px]">.env</code> dosyasina ekle:
        </div>
        <div className="bg-white rounded-xl p-4 font-mono text-xs text-slate-500 leading-loose border border-brand-gold/15">
          <div>VITE_SUPABASE_URL=https://[project-id].supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=eyJ...</div>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          SQL semasi: <code className="chip text-[10px]">supabase/schema.sql</code>
        </div>
      </div>
    </div>
  )
}
