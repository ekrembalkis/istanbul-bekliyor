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
  const afterYears = days - years * 365;
  const months = Math.floor(afterYears / 30);
  const remainingDays = afterYears - months * 30;
  return { years, months, days: remainingDays, total: days };
}

// Campaign-specific content rules (not algorithm — brand identity)

export interface CampaignCheck {
  rule: string;
  passed: boolean;
  tip: string;
}

export function checkCampaignRules(tweetText: string): { score: number; checks: CampaignCheck[] } {
  const checks: CampaignCheck[] = [];

  // 1. Starts with GÜN counter (brand consistency)
  const startsWithGun = /^GÜN\s+\d+/i.test(tweetText.trim());
  checks.push({
    rule: 'GÜN sayacı',
    passed: startsWithGun,
    tip: startsWithGun ? 'Marka tutarlılığı korunuyor.' : 'Tweet "GÜN [sayı]" ile başlamalı.',
  });

  // 2. Has visual structure (line breaks for dwell time)
  const lineBreaks = (tweetText.match(/\n/g) || []).length;
  checks.push({
    rule: 'Görsel yapı (satır araları)',
    passed: lineBreaks >= 2,
    tip: lineBreaks < 2 ? 'Satır araları ekle. Okunabilirlik = dwell time.' : 'Görsel yapı iyi.',
  });

  // 3. Has campaign hashtag
  const hasHashtag = /#İstanbulBekliyor/i.test(tweetText);
  checks.push({
    rule: '#İstanbulBekliyor',
    passed: hasHashtag,
    tip: hasHashtag ? 'Kampanya hashtag\'i mevcut.' : '#İstanbulBekliyor ekle.',
  });

  const passed = checks.filter(c => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return { score, checks };
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-[#00BA7C]';
  if (score >= 60) return 'text-[#FFD400]';
  return 'text-[#F91880]';
}

export function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-[#00BA7C]/10 border border-[#00BA7C]/20';
  if (score >= 60) return 'bg-[#FFD400]/10 border border-[#FFD400]/20';
  return 'bg-[#F91880]/10 border border-[#F91880]/20';
}
