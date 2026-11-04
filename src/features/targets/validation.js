/** Existing API constraints: 1..4320 hours and 0 < warning ratio < 1. */
export function validateTargetInput(value, unit, percent) {
  if (!/^\d{1,3}$/.test(value) || Number(value) < 1) return 'יש להזין יעד של 1 עד 3 ספרות, גדול מאפס.';
  if (unit === 'd' && Number(value) > 180) return 'יעד הטיפול יכול להיות עד 180 ימים.';
  const number = Number(percent);
  if (!/^\d{1,3}$/.test(String(percent)) || !Number.isInteger(number) || number < 1 || number > 99) return 'יש להזין אחוז התראה שלם בין 1 ל־99.';
  return null;
}
export function acceptsWarningInput(value) {
  return value === '' || (/^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 99);
}

function durationText(minutes) {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const parts = [];
  if (days) parts.push(days === 1 ? 'יום' : `${days} ימים`);
  if (hours) parts.push(hours === 1 ? 'שעה' : `${hours} שעות`);
  if (rest) parts.push(rest === 1 ? 'דקה' : `${rest} דקות`);
  return parts.join(' ו־');
}

export function warningExplanation(value, unit, percent) {
  if (validateTargetInput(value, unit, percent)) return '';
  const total = Number(value) * (unit === 'd' ? 1440 : 60);
  const elapsed = Math.round(total * Number(percent) / 100);
  const remaining = total - elapsed;
  if (!remaining) return 'ההתראה תופיע בהגעה ליעד עצמו.';
  return `תופיע התראה מוקדמת ${durationText(remaining)} לפני היעד, לאחר ${durationText(elapsed)} מפתיחת הקריאה.`;
}