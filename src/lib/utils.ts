const ARREST_DATE = new Date('2025-03-19T00:00:00+03:00');

export function getDayCount(date?: Date): number {
  const target = date || new Date();
  const diff = target.getTime() - ARREST_DATE.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function getDateForDay(dayNumber: number): Date {
  const date = new Date(ARREST_DATE);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function getTimeBreakdown(days: number) {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days % 30;
  return { years, months, days: remainingDays, total: days };
}

// X Algorithm Optimization Checker
// Based on actual X source code analysis (Phoenix scoring model)

interface AlgorithmCheck {
  rule: string;
  passed: boolean;
  impact: 'critical' | 'high' | 'medium';
  tip: string;
}

export function checkAlgorithm(tweetText: string): { score: number; checks: AlgorithmCheck[] } {
  const checks: AlgorithmCheck[] = [];

  // 1. No external links
  const hasLink = /https?:\/\//.test(tweetText);
  checks.push({
    rule: 'Dış link yok',
    passed: !hasLink,
    impact: 'critical',
    tip: hasLink ? 'Link %30\u201350 erişim cezası alır. İlk yanıta taşı.' : 'Link yok, erişim cezası almayacak.'
  });

  // 2. Has hashtag
  const hashtagCount = (tweetText.match(/#\S+/g) || []).length;
  checks.push({
    rule: 'Hashtag kullanımı',
    passed: hashtagCount >= 1 && hashtagCount <= 2,
    impact: 'high',
    tip: hashtagCount === 0 ? '#İstanbulBekliyor ekle.' : hashtagCount > 2 ? 'Fazla hashtag spam gibi görünür. 1\u20132 yeterli.' : 'Hashtag sayısı doğru.'
  });

  // 3. Starts with GÜN counter
  const startsWithGun = /^GÜN\s+\d+/i.test(tweetText.trim());
  checks.push({
    rule: 'GÜN sayacıyla başlıyor',
    passed: startsWithGun,
    impact: 'high',
    tip: startsWithGun ? 'Marka tutarlılığı korunuyor.' : 'Tweet "GÜN [sayı]" ile başlamalı.'
  });

  // 4. Character count
  const charCount = tweetText.length;
  const goodLength = charCount >= 80 && charCount <= 260;
  checks.push({
    rule: 'Karakter uzunluğu (80\u2013260)',
    passed: goodLength,
    impact: 'medium',
    tip: charCount < 80 ? `Çok kısa (${charCount}). Dwell time düşük olur.` : charCount > 260 ? `Çok uzun (${charCount}). Okunmadan geçilir.` : `İyi uzunluk (${charCount} karakter).`
  });

  // 5. Ends with question or CTA
  const endsWithQuestion = /\?[\s]*$/.test(tweetText.trim()) || /\?[\s]*#/.test(tweetText);
  checks.push({
    rule: 'Soru/etkileşim çağrısı',
    passed: endsWithQuestion,
    impact: 'high',
    tip: endsWithQuestion ? 'Soru formatı reply tetikler = en güçlü sinyal.' : 'Sonda soru ekle: "Kaç gündür bekliyoruz?" gibi.'
  });

  // 6. Has line breaks (visual structure)
  const lineBreaks = (tweetText.match(/\n/g) || []).length;
  checks.push({
    rule: 'Görsel yapı (satır araları)',
    passed: lineBreaks >= 2,
    impact: 'medium',
    tip: lineBreaks < 2 ? 'Satır araları ekle. Okunabilirlik = dwell time.' : 'Görsel yapı iyi.'
  });

  // 7. No emoji overuse
  const emojiCount = (tweetText.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  checks.push({
    rule: 'Emoji kullanımı',
    passed: emojiCount <= 3,
    impact: 'medium',
    tip: emojiCount > 3 ? 'Fazla emoji ciddiyet algısını düşürür.' : 'Emoji kullanımı uygun.'
  });

  // 8. Text-first (no media-only tweet)
  const hasText = tweetText.trim().length > 20;
  checks.push({
    rule: 'Metin ağırlıklı',
    passed: hasText,
    impact: 'high',
    tip: hasText ? 'Metin postları X\'te en yüksek etkileşim oranına sahip (%3.56).' : 'Daha fazla metin ekle.'
  });

  // Calculate score
  const weights = { critical: 30, high: 15, medium: 8 };
  const maxScore = checks.reduce((sum, c) => sum + weights[c.impact], 0);
  const score = checks.reduce((sum, c) => sum + (c.passed ? weights[c.impact] : 0), 0);
  const percentage = Math.round((score / maxScore) * 100);

  return { score: percentage, checks };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20';
  if (score >= 60) return 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20';
  return 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20';
}
