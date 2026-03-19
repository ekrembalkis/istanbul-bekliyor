import { useState } from 'react'
import { getDayCount, getDateForDay, checkAlgorithm, getScoreColor, getScoreBg } from '../lib/utils'
import { getDayPlan } from '../data/campaign'
import { supabase } from '../lib/supabase'
import { CopyBtn } from '../components/CopyBtn'

export default function Planner() {
  const day = getDayCount()
  const plan = getDayPlan(day)
  const [tweetText, setTweetText] = useState(plan.tweetTemplate)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const analysis = checkAlgorithm(tweetText)

  const saveTweet = async () => {
    if (!supabase) { alert('Supabase bağlantısı yapılandırılmamış. .env dosyasını kontrol et.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('tweets').upsert({
        day_number: day,
        tweet_date: getDateForDay(day).toISOString().split('T')[0],
        theme: plan.theme,
        tweet_text: tweetText,
        nano_prompt: plan.prompt,
        status: 'ready',
        algorithm_score: analysis.score,
        algorithm_notes: analysis.checks.filter(c => !c.passed).map(c => c.tip),
      }, { onConflict: 'day_number' })
      if (!error) setSaved(true)
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tweet Planlayıcı</h1>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{plan.emoji}</span>
          <div className="text-right">
            <div className="text-sm font-mono gradient-text font-bold">GÜN {day}</div>
            <div className="text-xs text-white/30">{plan.theme}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Composer */}
        <div className="space-y-4">
          {/* Tweet Editor */}
          <div className="glass-card-static rounded-2xl p-5">
            <label className="text-xs font-semibold text-white/40 block mb-2">TWEET METNİ</label>
            <textarea
              value={tweetText}
              onChange={e => { setTweetText(e.target.value); setSaved(false) }}
              rows={10}
              className="w-full glass-input p-4 text-white/90 text-sm leading-relaxed resize-none"
              placeholder="Tweet metnini buraya yaz..."
            />
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs font-mono ${tweetText.length > 280 ? 'text-red-400' : tweetText.length > 250 ? 'text-yellow-400' : 'text-white/30'}`}>
                {tweetText.length}/280
              </span>
              <div className="flex gap-2">
                <CopyBtn text={tweetText} label="Kopyala" />
                <button
                  onClick={saveTweet}
                  disabled={saving}
                  className="glass-btn px-4 py-1.5 bg-brand-red/15 text-brand-red !border-brand-red/25 text-xs font-semibold hover:bg-brand-red/25 disabled:opacity-50"
                >
                  {saving ? '...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>

          {/* Scene Info */}
          <div className="glass-card rounded-2xl p-5">
            <label className="text-xs font-semibold text-white/40 block mb-2">GÖRSEL BİLGİSİ</label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] text-white/25 mb-1">SAHNE</div>
                <div className="text-white/50">{plan.scene}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/25 mb-1">ALTIN ELEMAN</div>
                <div className="text-brand-gold/70">{plan.goldenElement}</div>
              </div>
            </div>
          </div>

          {/* Nano Banana Pro Prompt */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold gradient-text">NANO BANANA PRO PROMPT</label>
              <CopyBtn text={plan.prompt} label="Prompt Kopyala" />
            </div>
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 text-xs font-mono text-white/35 leading-relaxed max-h-48 overflow-y-auto">
              {plan.prompt}
            </div>
            <div className="mt-3 flex gap-4 text-[10px] text-white/20 font-mono">
              <span>aspectRatio: 1:1</span>
              <span>resolution: 2K</span>
              <span>temperature: 0.7</span>
            </div>
          </div>
        </div>

        {/* Right: Algorithm Check + Checklist */}
        <div className="space-y-4">
          {/* Algorithm Score */}
          <div className={`glass-card border-gradient rounded-2xl p-5 ${getScoreBg(analysis.score)}`}>
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-semibold text-white/40">ALGORİTMA SKORU</label>
              <span className={`text-4xl font-black font-mono ${getScoreColor(analysis.score)}`}>{analysis.score}</span>
            </div>
            <div className="space-y-2.5">
              {analysis.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 text-xs flex-shrink-0 ${check.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {check.passed ? '✓' : '✕'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${check.passed ? 'text-white/45' : 'text-white/75'}`}>{check.rule}</div>
                    <div className="text-xs text-white/25 mt-0.5">{check.tip}</div>
                  </div>
                  <span className={`glass-chip ${
                    check.impact === 'critical' ? '!bg-red-500/10 text-red-400' :
                    check.impact === 'high' ? '!bg-orange-500/10 text-orange-400' :
                    '!bg-yellow-500/10 text-yellow-400'
                  }`}>{check.impact === 'critical' ? 'KRİTİK' : check.impact === 'high' ? 'YÜKSEK' : 'ORTA'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Posting Checklist */}
          <div className="glass-card rounded-2xl p-5">
            <label className="text-xs font-semibold text-white/40 block mb-3">PAYLAŞIM ÖNCESİ KONTROL</label>
            {[
              'Nano Banana Pro ile görseli ürettim',
              'Görsel 1:1 kare format, siyah/beyaz + tek altın eleman',
              'Tweet metnini kontrol ettim',
              `Algoritma skoru ${analysis.score >= 80 ? '80+ (yeşil) ✓' : analysis.score + ' — iyileştir!'}`,
              'Link yok (varsa ilk yanıta taşıdım)',
              '#İstanbulBekliyor hashtag\'i var',
              'Display name güncellendi (GÜN sayısı)',
              'Sabah 09:00 TSİ civarı paylaşacağım',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-3 py-1.5 text-sm text-white/40 cursor-pointer hover:text-white/55 transition-colors">
                <input type="checkbox" className="rounded w-3.5 h-3.5" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
