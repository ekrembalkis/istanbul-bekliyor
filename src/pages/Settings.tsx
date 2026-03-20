import { getDayCount } from '../lib/utils'
import { DAY_PLANS } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'

export default function Settings() {
  const day = getDayCount()

  const promptTemplate = `Minimalist [SAHNE TÜRÜ] of [SAHNE DETAYI], shot in stark black and white. [DETAYLI AÇIKLAMA]. [ALTIN ELEMAN] has a warm amber gold color (#D4A843). Everything else is deep black and charcoal gray. [KAMERA]. Bold clean text reading "GÜN [SAYI]" in large uppercase sans-serif font at the top of the frame. Brutalist minimalist style. 1:1 aspect ratio at 2K resolution.`

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="section-header">
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Ayarlar</h1>
      </div>

      {/* Campaign Info */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">KAMPANYA BİLGİLERİ</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
          {[
            { label: 'Hesap', value: '@istbekliyor' },
            { label: 'Başlangıç', value: '19 Mart 2025' },
            { label: 'Bugün', value: `GÜN ${day}` },
            { label: 'Hashtag', value: '#İstanbulBekliyor' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[10px] text-slate-400 tracking-wider font-semibold mb-1">{item.label.toUpperCase()}</div>
              <div className="text-slate-700 dark:text-slate-200 font-mono font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Colors */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">MARKA RENKLERİ</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { name: 'Marka Kırmızı', hex: '#E30A17', usage: 'Profil, banner' },
            { name: 'Altın Aksan', hex: '#D4A843', usage: 'Günlük görseller' },
            { name: 'Koyu Arka Plan', hex: '#0C0C12', usage: 'Dark mode' },
            { name: 'Kart Koyu', hex: '#16161E', usage: 'Dark mode kartlar' },
          ].map(c => (
            <div key={c.hex} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-white/10 flex-shrink-0 shadow-card" style={{ backgroundColor: c.hex }} />
              <div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{c.name}</div>
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
          <h2 className="text-sm font-bold text-brand-red tracking-wider">NANO BANANA PRO PROMPT ŞABLONU</h2>
          <CopyBtn text={promptTemplate} label="Şablon Kopyala" />
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 text-xs font-mono text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-white/[0.06]">
          {promptTemplate}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] text-slate-400">
          <div><span className="font-semibold text-slate-500 dark:text-slate-300">API:</span> aspectRatio "1:1"</div>
          <div><span className="font-semibold text-slate-500 dark:text-slate-300">Resolution:</span> 2K</div>
          <div><span className="font-semibold text-slate-500 dark:text-slate-300">Temperature:</span> 0.7</div>
        </div>
      </div>

      {/* Visual Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">GÖRSEL ÜRETİM KURALLARI</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { num: '1', rule: 'Arka plan siyah veya koyu gri' },
            { num: '2', rule: 'Sahne İstanbul\'a ait mekân veya sembolik nesne' },
            { num: '3', rule: 'Tüm sahne siyah beyaz' },
            { num: '4', rule: 'TEK BİR eleman altın (#D4A843) renginde' },
            { num: '5', rule: '"GÜN [SAYI]" yazısı, temiz sans-serif' },
            { num: '6', rule: '1:1 kare format, 2K çözünürlük' },
          ].map(r => (
            <div key={r.num} className="flex items-start gap-3 text-sm p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl">
              <span className="w-7 h-7 rounded-lg bg-brand-gold/10 text-brand-gold text-xs font-bold flex items-center justify-center flex-shrink-0">{r.num}</span>
              <span className="text-slate-600 dark:text-slate-300 mt-0.5">{r.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Pool */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">TEMA HAVUZU ({DAY_PLANS.length} Tema)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {DAY_PLANS.map((plan, i) => {
            const isActive = (day - 1) % DAY_PLANS.length === i
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive ? 'bg-brand-red/[0.05] dark:bg-brand-red/[0.08] border border-brand-red/15' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
              }`}>
                <span className="text-[10px] font-mono text-slate-400 w-5 text-right">{i + 1}</span>
                <span className="text-base">{plan.emoji}</span>
                <span className={`font-medium ${isActive ? 'text-brand-red' : 'text-slate-600 dark:text-slate-300'}`}>{plan.theme}</span>
                <span className="text-[10px] text-slate-400 ml-auto truncate max-w-[140px]">{plan.scene}</span>
                {isActive && <span className="chip bg-brand-red/10 text-brand-red border-brand-red/20 text-[10px]">BUGÜN</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tweet Format Rules */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">TWEET FORMAT KURALLARI</h2>
        <div className="space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
          {[
            'Tweet her zaman "GÜN [SAYI]." ile başlar',
            '2 ila 4 satır kısa, şiirsel metin',
            'Sonda #İstanbulBekliyor hashtag\'i',
            'ASLA dış link koyma',
            'Her tweete 1:1 kare görsel ekle',
            'Günde 1 ana tweet + gelen reply\'lara cevap',
            'Paylaşım saati: 09:00 TSİ',
            'Ton: yapıcı, umut dolu, asla saldırgan değil',
          ].map((rule, i) => (
            <div key={i} className="flex gap-3 items-start p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
              <span className="w-6 h-6 rounded-md bg-brand-gold/10 text-brand-gold text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <span className="mt-0.5">{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Strategy */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-5 tracking-wider">MILESTONE STRATEJİSİ</h2>
        <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
          {[
            { label: 'Her 50. gün', desc: 'Özet thread (son 50 günün en iyi görselleri)' },
            { label: 'Her 100. gün', desc: 'Özel görsel + daha uzun metin' },
            { label: 'Yıl dönümleri', desc: 'Özel kampanya (GÜN 366, 731, ...)' },
            { label: 'Bayramlar', desc: 'Bayram temalı görsel (ama mesaj aynı)' },
            { label: 'Gündem', desc: 'Gündemle bağlantılı tema (mahkeme, AB raporu)' },
          ].map((m, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="chip bg-brand-gold/10 text-brand-gold border-brand-gold/20 w-28 text-center flex-shrink-0 text-[10px]">{m.label}</span>
              <span className="mt-0.5">{m.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supabase Config */}
      <div className="card border-l-4 border-l-brand-gold p-6 bg-brand-gold-light dark:bg-brand-gold/5">
        <h2 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-4 tracking-wider">SUPABASE YAPILANDIRMA</h2>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          <code className="chip text-brand-red text-[10px]">.env</code> dosyasına ekle:
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl p-4 font-mono text-xs text-slate-500 dark:text-slate-400 leading-loose border border-brand-gold/15">
          <div>VITE_SUPABASE_URL=https://[project-id].supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=eyJ...</div>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          SQL şeması: <code className="chip text-[10px]">supabase/schema.sql</code>
        </div>
      </div>
    </div>
  )
}
