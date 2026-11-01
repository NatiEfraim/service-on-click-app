/** Formatting for dates, durations and names. Everything shown to people is Hebrew (he-IL). */

const DASH = '—';

const dateTime = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const dateOnly = new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
const dateLong = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
const timeOnly = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });

/**
 * The API sends instants as ISO 8601 with an offset ("2026-11-01T14:16:15+00:00"), but the audit log sends a zone-less
 * "2026-11-01 14:16:15.038910" - which is UTC. `new Date()` would read that as local time and show it hours off.
 * A bare `Y-m-d` is a calendar day, not an instant: the time zone must not move it.
 */
export function parseServerDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  const naive = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?$/.exec(value);
  if (naive) return new Date(`${naive[1]}T${naive[2]}.${(naive[3] ?? '0').padEnd(3, '0').slice(0, 3)}Z`);
  return new Date(value);
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = typeof value === 'string' ? parseServerDate(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDateTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateTime.format(date) : DASH;
}

export function fmtDate(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateOnly.format(date) : DASH;
}

/** "יום ראשון, 1 בנובמבר" - the day heading of the history feed. */
export function fmtDayHeading(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateLong.format(date) : DASH;
}

export function fmtTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? timeOnly.format(date) : DASH;
}

/** Minutes below an hour, hours below two days, days above. */
export function fmtHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return DASH;
  if (hours < 1) return `${Math.round(hours * 60)} דק'`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} ש'`;
  return `${Math.round((hours / 24) * 10) / 10} ימים`;
}

/** The dashboard's wording: whole hours under two days, days above. */
export function fmtLongHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return DASH;
  return hours >= 48 ? `${Math.round((hours / 24) * 10) / 10} ימים` : `${Math.round(hours)} שעות`;
}

/** "לפני 5 דק'" - how long ago. */
export function fmtAgo(value: string | number | Date | null | undefined, now: number = Date.now()): string {
  const date = toDate(value);
  if (!date) return DASH;
  const minutes = (now - date.getTime()) / 60_000;
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${Math.round(minutes)} דק'`;
  if (minutes < 48 * 60) return `לפני ${Math.round(minutes / 60)} ש'`;
  return `לפני ${Math.round(minutes / 1440)} ימים`;
}

/** The round avatar's letters: the first letter of the first two words. */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
}

/** `Y-m-d` of a local date (what the API takes and what `<input type="date">` holds). */
export function toDayString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The server prints booking dates as `d/m/Y`; an `<input type="date">` wants `Y-m-d`. Anything else comes back unchanged. */
export function dmyToIso(value: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return value;
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}
