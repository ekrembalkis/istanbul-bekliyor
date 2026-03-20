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
    if (!supabase) { alert('Supabase baglantisi yapilandirilmamis. .env dosyasini kontrol et.'); return }
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="section-header">
          <h1 className="text-2xl font-serif font-bold text-slate-800">Tweet Planlayici</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{plan.emoji}</span>
          <div className="text-right">
            <div className="text-sm font-mono text-brand-red font-bold">GUN {day}</div>
            <div className="text-xs text-slate-400">{plan.theme}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Composer */}
        <div className="space-y-5">
          {/* Tweet Editor */}
          <div className="card p-6">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-3">TWEET METNI</label>
            <textarea
              value={tweetText}
              onChange={e => { setTweetText(e.target.value); setSaved(false) }}
              rows={10}
              className="w-full input-field p-4 text-slate-700 text-sm leading-relaxed resize-none"
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
                  className={`btn text-xs py-1.5 ${saved ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'btn-primary'} disabled:opacity-50`}
                >
                  {saving ? '...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>

          {/* Scene Info */}
          <div className="card p-5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-3">GORSEL BILGISI</label>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] text-slate-400 mb-1 font-semibold">SAHNE</div>
                <div className="text-slate-600">{plan.scene}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 mb-1 font-semibold">ALTIN ELEMAN</div>
                <div className="text-brand-gold font-medium">{plan.goldenElement}</div>
              </div>
            </div>
          </div>

          {/* Nano Banana Pro Prompt */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold text-brand-red tracking-wider">NANO BANANA PRO PROMPT</label>
              <CopyBtn text={plan.prompt} label="Prompt Kopyala" />
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-xs font-mono text-slate-500 leading-relaxed max-h-48 overflow-y-auto border border-slate-100">
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
          {/* Algorithm Score */}
          <div className={`card rounded-2xl p-6 ${getScoreBg(analysis.score)}`}>
            <div className="flex items-center justify-between mb-5">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider">ALGORITMA SKORU</label>
              <span className={`stat-number text-5xl ${getScoreColor(analysis.score)}`}>{analysis.score}</span>
            </div>
            <div className="space-y-3">
              {analysis.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 text-xs flex-shrink-0 font-bold ${check.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                    {check.passed ? '✓' : '✕'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${check.passed ? 'text-slate-400' : 'text-slate-700'}`}>{check.rule}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{check.tip}</div>
                  </div>
                  <span className={`chip text-[10px] ${
                    check.impact === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                    check.impact === 'high' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>{check.impact === 'critical' ? 'KRITIK' : check.impact === 'high' ? 'YUKSEK' : 'ORTA'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Posting Checklist */}
          <div className="card p-5">
            <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-4">PAYLASIM ONCESI KONTROL</label>
            {[
              'Nano Banana Pro ile gorseli urettim',
              'Gorsel 1:1 kare format, siyah/beyaz + tek altin eleman',
              'Tweet metnini kontrol ettim',
              `Algoritma skoru ${analysis.score >= 80 ? '80+ (yesil) ✓' : analysis.score + ' — iyilestir!'}`,
              'Link yok (varsa ilk yanita tasidim)',
              '#IstanbulBekliyor hashtag\'i var',
              'Display name guncellendi (GUN sayisi)',
              'Sabah 09:00 TSI civarinda paylasacagim',
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-3 py-2 text-sm text-slate-500 cursor-pointer hover:text-slate-700 transition-colors border-b border-slate-50 last:border-0">
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
