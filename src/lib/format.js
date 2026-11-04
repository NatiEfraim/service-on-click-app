const DASH = '—';

const dateTime = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
const dateLong = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
const timeOnly = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });

/** The audit log sends zone-less UTC ("2026-11-01 14:16:15.038910"); a bare `Y-m-d` is a local calendar day. */
export function parseServerDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  const naive = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/.exec(value);
  if (naive) return new Date(`${naive[1]}T${naive[2]}.${(naive[3] ?? '0').padEnd(3, '0').slice(0, 3)}Z`);
  return new Date(value);
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'string' ? parseServerDate(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDateTime(value) {
  const date = toDate(value);
  return date ? dateTime.format(date) : DASH;
}

export function fmtDate(value) {
  const date = toDate(value);
  return date ? dateOnly.format(date) : DASH;
}

/** Day heading of the history feed. */
export function fmtDayHeading(value) {
  const date = toDate(value);
  return date ? dateLong.format(date) : DASH;
}

export function fmtTime(value) {
  const date = toDate(value);
  return date ? timeOnly.format(date) : DASH;
}

/** Minutes below an hour, hours below two days, days above. */
export function fmtHours(hours) {
  if (hours === null || hours === undefined) return DASH;
  if (hours < 1) return `${Math.round(hours * 60)} דק'`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} ש'`;
  return `${Math.round((hours / 24) * 10) / 10} ימים`;
}

/** Whole hours under two days, days above. */
export function fmtLongHours(hours) {
  if (hours === null || hours === undefined) return DASH;
  return hours >= 48 ? `${Math.round((hours / 24) * 10) / 10} ימים` : `${Math.round(hours)} שעות`;
}

export function fmtAgo(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return DASH;
  const minutes = (now - date.getTime()) / 60_000;
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${Math.round(minutes)} דק'`;
  if (minutes < 48 * 60) return `לפני ${Math.round(minutes / 60)} ש'`;
  return `לפני ${Math.round(minutes / 1440)} ימים`;
}

/** Avatar letters: first letter of the first two words. */
export function initials(name) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
}

/** `Y-m-d` of a local date. */
export function toDayString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Server `d/m/Y` -> `Y-m-d`; other input is returned unchanged. */
export function dmyToIso(value) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return value;
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}
