/** Blocked dates are plain calendar days (`Y-m-d`), never instants: nothing here goes through the time zone. */

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day written `Y-m-d` (2031-02-30 is not one). */
export function isValidDay(value: string): boolean {
  const match = DAY_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Friday or Saturday - the server refuses to block them (a booking cannot be made on them anyway). */
export function isWeekend(day: string): boolean {
  const match = DAY_PATTERN.exec(day);
  if (!match) return false;
  const weekday = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
  return weekday === 5 || weekday === 6;
}

/** Each day once, oldest first. */
export function normalizeDays(days: readonly string[]): string[] {
  return [...new Set(days)].sort();
}

export function sameDays(a: readonly string[], b: readonly string[]): boolean {
  const left = normalizeDays(a);
  const right = normalizeDays(b);
  return left.length === right.length && left.every((day, index) => day === right[index]);
}

/** Why a day cannot be added to the list, or null. */
export function dayError(day: string, current: readonly string[]): string | null {
  if (!day) return 'יש לבחור תאריך';
  if (!isValidDay(day)) return 'התאריך אינו תקין';
  if (current.includes(day)) return 'התאריך כבר ברשימה';
  if (isWeekend(day)) return 'לא ניתן לחסום יום שישי או שבת - הזמנות אינן נקבעות בהם ממילא';
  return null;
}

const dayFormat = new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

/** "יום ד׳, 12.03.2031" */
export function fmtDay(day: string): string {
  if (!isValidDay(day)) return day;
  const [year, month, date] = day.split('-').map(Number);
  return dayFormat.format(new Date(year, month - 1, date));
}
