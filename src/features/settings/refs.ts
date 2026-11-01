import type { SystemReference } from '@/lib/api/types';

/** The blocked-dates list has its own tab; every other system reference is an operating setting. */
export const isDatesReference = (reference: Pick<SystemReference, 'name'>): boolean => reference.name.startsWith('restriction_dates_');

/** What each key of a setting is called next to its input. */
export const REF_KEY_LABEL: Record<string, string> = {
  contact_phone: 'טלפון',
  start_time: 'משעה',
  end_time: 'עד שעה',
  stock_cars: 'רכבים',
  max: 'מקסימום',
  multiple_of: 'כפולות של',
  count_businsday: 'ספירה בימי עסקים בלבד',
  min: 'מינימום',
  cancellation_advance_days: 'ימים לפני האספקה',
  minimum_advance_days: 'ימים מראש',
  max_advance_days: 'עד כמה ימים קדימה',
  haircut_time: 'דקות',
  clean_time: 'דקות',
  drivers_amount: 'נהגים',
  bookings_limit_time: 'שעות מראש',
};

export const refKeyLabel = (key: string): string => REF_KEY_LABEL[key] ?? key;

export type RefInputKind = 'number' | 'time' | 'phone' | 'boolean' | 'text';

const TIME_VALUE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Input kind (count, time, switch or text), inferred from the current value. */
export function refInputKind(key: string, value: unknown): RefInputKind {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && TIME_VALUE.test(value)) return 'time';
  if (key === 'contact_phone') return 'phone';
  return 'text';
}

/** A draft holds what the inputs hold: text for everything but the switches. */
export type RefDraft = Record<string, string | boolean>;

export function draftFromValue(value: Record<string, unknown>): RefDraft {
  return Object.fromEntries(
    Object.entries(value).map(([key, current]) => [key, typeof current === 'boolean' ? current : current === null || current === undefined ? '' : String(current)]),
  );
}

export function isDraftDirty(original: Record<string, unknown>, draft: RefDraft): boolean {
  const base = draftFromValue(original);
  return Object.keys(base).some((key) => base[key] !== draft[key]);
}

/** The keys whose input is a count and is empty or not a number - nothing to send for them yet. */
export function draftProblems(original: Record<string, unknown>, draft: RefDraft): Record<string, string> {
  const problems: Record<string, string> = {};
  for (const [key, current] of Object.entries(original)) {
    const value = draft[key];
    const kind = refInputKind(key, current);
    if (kind === 'number' && (typeof value !== 'string' || value.trim() === '' || !Number.isFinite(Number(value)))) problems[key] = 'יש להזין מספר';
    else if (kind === 'number' && Number(value) < 0) problems[key] = 'יש להזין מספר חיובי';
    else if (kind === 'time' && (typeof value !== 'string' || !TIME_VALUE.test(value))) problems[key] = 'יש להזין שעה';
    else if ((kind === 'text' || kind === 'phone') && (typeof value !== 'string' || value.trim() === '')) problems[key] = 'יש למלא את השדה';
  }
  return problems;
}

/** Body for `PUT system-references`: every key of the setting, numbers as numbers, switches as booleans. */
export function draftToValue(original: Record<string, unknown>, draft: RefDraft): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(original).map(([key, current]) => {
      const kind = refInputKind(key, current);
      const value = draft[key];
      if (kind === 'boolean') return [key, value === true];
      if (kind === 'number') return [key, Number(value)];
      return [key, typeof value === 'string' ? value.trim() : value];
    }),
  );
}
