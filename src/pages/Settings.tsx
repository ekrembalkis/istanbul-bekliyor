import { getDayCount } from '../lib/utils'
import { DAY_PLANS } from '../data/campaign'
import { CopyBtn } from '../components/CopyBtn'

export default function Settings() {
  const day = getDayCount()

  const promptTemplate = `Minimalist [SAHNE TÜRÜ] of [SAHNE DETAYI], shot in stark black and white. [DETAYLI AÇIKLAMA]. [ALTIN ELEMAN] has a warm amber gold color (#D4A843). Everything else is deep black and charcoal gray. [KAMERA]. Bold clean text reading "GÜN [SAYI]" in large uppercase sans-serif font at the top of the frame. Brutalist minimalist style. 1:1 aspect ratio at 2K resolution.`

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Ayarlar</h1>

      {/* Campaign Info */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white/60 mb-4">Kampanya Bilgileri</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Hesap', value: '@istbekliyor' },
            { label: 'Başlangıç', value: '19 Mart 2025' },
            { label: 'Bugün', value: `GÜN ${day}` },
            { label: 'Hashtag', value: '#İstanbulBekliyor' },
          ].map(item => (
            <div key={item.label}>
              <div className="text-[10px] text-white/25 tracking-wider mb-1">{item.label.toUpperCase()}</div>
              <div className="text-white/55 font-mono">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand Colors */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white/60 mb-4">Marka Renkleri</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Marka Kırmızı', hex: '#E30A17', usage: 'Profil, banner' },
            { name: 'Altın Aksan', hex: '#D4A843', usage: 'Günlük görseller' },
            { name: 'Arka Plan', hex: '#0C0C12', usage: 'Panel' },
            { name: 'Kart', hex: '#16161E', usage: 'Kartlar' },
          ].map(c => (
            <div key={c.hex} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-white/10 flex-shrink-0 shadow-glass" style={{ backgroundColor: c.hex }} />
              <div>
                <div className="text-xs text-white/50">{c.name}</div>
                <div className="text-[10px] font-mono text-white/25">{c.hex}</div>
                <div className="text-[10px] text-white/15">{c.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Template */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold gradient-text inline-block">Nano Banana Pro Prompt Şablonu</h2>
          <CopyBtn text={promptTemplate} label="Şablon Kopyala" />
        </div>
        <div className="glass-input rounded-xl p-4 text-xs font-mono text-white/30 leading-relaxed">
          {promptTemplate}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] text-white/20">
          <div><span className="text-white/30">API:</span> aspectRatio "1:1"</div>
          <div><span className="text-white/30">Resolution:</span> 2K</div>
          <div><span className="text-white/30">Temperature:</span> 0.7</div>
        </div>
      </div>

      {/* Visual Rules */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white/60 mb-4">Görsel Üretim Kuralları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { num: '1', rule: 'Arka plan siyah veya koyu gri' },
            { num: '2', rule: 'Sahne İstanbul\'a ait mekan veya sembolik nesne' },
            { num: '3', rule: 'Tüm sahne siyah beyaz' },
            { num: '4', rule: 'TEK BİR eleman altın (#D4A843) renginde' },
            { num: '5', rule: '"GÜN [SAYI]" yazısı, temiz sans-serif' },
            { num: '6', rule: '1:1 kare format, 2K çözünürlük' },
          ].map(r => (
            <div key={r.num} className="flex items-start gap-3 text-sm">
              <span className="glass-chip !bg-brand-gold/10 text-brand-gold flex-shrink-0">{r.num}</span>
              <span className="text-white/40">{r.rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme Pool */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white/60 mb-4">Tema Havuzu ({DAY_PLANS.length} Tema)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {DAY_PLANS.map((plan, i) => {
            const isActive = (day - 1) % DAY_PLANS.length === i
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive ? 'glass-card-lite border-gradient' : 'hover:bg-white/[0.03]'
              }`}>
                <span className="text-[10px] font-mono text-white/20 w-5">{i + 1}</span>
                <span className="text-base">{plan.emoji}</span>
                <span className={`font-medium ${isActive ? 'text-brand-red' : 'text-white/45'}`}>{plan.theme}</span>
                <span className="text-[10px] text-white/15 ml-auto truncate max-w-[120px]">{plan.scene}</span>
                {isActive && <span className="glass-chip !bg-brand-red/15 text-brand-red">BUGÜN</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tweet Format Rules */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white/60 mb-4">Tweet Format Kuralları</h2>
        <div className="space-y-2 text-sm text-white/40">
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
            <div key={i} className="flex gap-2 items-start">
              <span className="glass-chip !bg-brand-gold/10 text-brand-gold flex-shrink-0">{i + 1}</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone Strategy */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white/60 mb-4">Milestone Stratejisi</h2>
        <div className="space-y-2 text-sm text-white/35">
          <div className="flex gap-3"><span className="glass-chip !bg-brand-gold/10 text-brand-gold w-24 text-center flex-shrink-0">Her 50. gün</span><span>Özet thread (son 50 günün en iyi görselleri)</span></div>
          <div className="flex gap-3"><span className="glass-chip !bg-brand-gold/10 text-brand-gold w-24 text-center flex-shrink-0">Her 100. gün</span><span>Özel görsel + daha uzun metin</span></div>
          <div className="flex gap-3"><span className="glass-chip !bg-brand-gold/10 text-brand-gold w-24 text-center flex-shrink-0">Yıl dönümleri</span><span>Özel kampanya (GÜN 366, 731, ...)</span></div>
          <div className="flex gap-3"><span className="glass-chip !bg-brand-gold/10 text-brand-gold w-24 text-center flex-shrink-0">Bayramlar</span><span>Bayram temalı görsel (ama mesaj aynı)</span></div>
          <div className="flex gap-3"><span className="glass-chip !bg-brand-gold/10 text-brand-gold w-24 text-center flex-shrink-0">Gündem</span><span>Gündemle bağlantılı tema (mahkeme, AB raporu)</span></div>
        </div>
      </div>

      {/* Supabase Config */}
      <div className="glass-card border-gradient-gold rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white/60 mb-4">Supabase Yapılandırma</h2>
        <div className="text-xs text-white/30 mb-3">
          <code className="glass-chip">.env</code> dosyasına ekle:
        </div>
        <div className="glass-input rounded-xl p-4 font-mono text-xs text-white/30 leading-loose">
          <div>VITE_SUPABASE_URL=https://[project-id].supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=eyJ...</div>
        </div>
        <div className="mt-3 text-xs text-white/20">
          SQL şeması: <code className="glass-chip">supabase/schema.sql</code>
        </div>
      </div>
    </div>
  )
}
