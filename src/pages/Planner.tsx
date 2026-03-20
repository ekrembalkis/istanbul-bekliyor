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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Tweet Planlayıcı</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{plan.emoji}</span>
          <div className="text-right">
            <div className="text-sm font-mono text-brand-red font-bold">GÜN {day}</div>
            <div className="text-xs text-slate-400">{plan.theme}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Composer */}
        <div className="space-y-5">
          <div className="card p-6">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-3">TWEET METNİ</label>
            <textarea
              value={tweetText}
              onChange={e => { setTweetText(e.target.value); setSaved(false) }}
              rows={10}
              className="w-full input-field p-4 text-slate-700 dark:text-slate-200 text-sm leading-relaxed resize-none"
              placeholder="Tweet metnini buraya yaz..."
            />
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs font-mono ${tweetText.length > 280 ? 'text-red-500' : tweetText.length > 250 ? 'text-amber-500' : 'text-slate-400'}`}>
                {tweetText.length}/280
              </span>
              <div className="flex gap-2">
                <CopyBtn text={tweetText} label="Kopyala" />
                <button
                  onClick={saveTweet}
                  disabled={saving}
                  className={`btn text-xs py-1.5 ${saved ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'btn-primary'} disabled:opacity-50`}
                >
                  {saving ? '...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-3">GÖRSEL BİLGİSİ</label>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] text-slate-400 mb-1 font-semibold">SAHNE</div>
                <div className="text-slate-600 dark:text-slate-300">{plan.scene}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 mb-1 font-semibold">ALTIN ELEMAN</div>
                <div className="text-brand-gold font-medium">{plan.goldenElement}</div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold text-brand-red tracking-wider">NANO BANANA PRO PROMPT</label>
              <CopyBtn text={plan.prompt} label="Prompt Kopyala" />
            </div>
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-xl p-4 text-xs font-mono text-slate-500 dark:text-slate-400 leading-relaxed max-h-48 overflow-y-auto border border-slate-100 dark:border-white/[0.06]">
              {plan.prompt}
            </div>
            <div className="mt-3 flex gap-4 text-[10px] text-slate-400 font-mono">
              <span>aspectRatio: 1:1</span>
              <span>resolution: 2K</span>
              <span>temperature: 0.7</span>
            </div>
          </div>
        </div>

        {/* Right: Algorithm Check + Checklist */}
        <div className="space-y-5">
          <div className={`card rounded-2xl p-6 ${getScoreBg(analysis.score)}`}>
            <div className="flex items-center justify-between mb-5">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider">ALGORİTMA SKORU</label>
              <span className={`stat-number text-5xl ${getScoreColor(analysis.score)}`}>{analysis.score}</span>
            </div>
            <div className="space-y-3">
              {analysis.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 text-xs flex-shrink-0 font-bold ${check.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                    {check.passed ? '✓' : '✕'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${check.passed ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{check.rule}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{check.tip}</div>
                  </div>
                  <span className={`chip text-[10px] ${
                    check.impact === 'critical' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                    check.impact === 'high' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                    'bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                  }`}>{check.impact === 'critical' ? 'KRİTİK' : check.impact === 'high' ? 'YÜKSEK' : 'ORTA'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-4">PAYLAŞIM ÖNCESİ KONTROL</label>
            {[
              'Nano Banana Pro ile görseli ürettim',
              'Görsel 1:1 kare format, siyah/beyaz + tek altın eleman',
              'Tweet metnini kontrol ettim',
              `Algoritma skoru ${analysis.score >= 80 ? '80+ (yeşil) ✓' : analysis.score + ' — iyileştir!'}`,
              'Link yok (varsa ilk yanıta taşıdım)',
              '#İstanbulBekliyor hashtag\'i var',
              'Display name güncellendi (GÜN sayısı)',
              'Sabah 09:00 TSİ civarında paylaşacağım',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-3 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-white transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-0">
                <input type="checkbox" className="rounded w-4 h-4" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
