import { describe, expect, it } from 'vitest';
import { dayError, fmtDay, isValidDay, isWeekend, normalizeDays, sameDays } from './dates';

describe('isValidDay', () => {
  it('accepts a real calendar day', () => {
    expect(isValidDay('2031-03-12')).toBe(true);
    expect(isValidDay('2028-02-29')).toBe(true);
  });

  it('refuses what is not a day', () => {
    expect(isValidDay('2031-02-30')).toBe(false);
    expect(isValidDay('2031-13-01')).toBe(false);
    expect(isValidDay('12/03/2031')).toBe(false);
    expect(isValidDay('')).toBe(false);
    expect(isValidDay('2027-02-29')).toBe(false);
  });
});

describe('isWeekend', () => {
  it('knows Friday and Saturday (the days the server will not block)', () => {
    expect(isWeekend('2031-03-14')).toBe(true); // Friday
    expect(isWeekend('2031-03-15')).toBe(true); // Saturday
    expect(isWeekend('2031-03-16')).toBe(false); // Sunday
    expect(isWeekend('2031-03-12')).toBe(false); // Wednesday
  });
});

describe('lists of days', () => {
  it('keeps each day once, oldest first', () => {
    expect(normalizeDays(['2031-03-12', '2030-01-02', '2031-03-12'])).toEqual(['2030-01-02', '2031-03-12']);
  });

  it('compares lists without regard to order', () => {
    expect(sameDays(['2031-03-12', '2030-01-02'], ['2030-01-02', '2031-03-12'])).toBe(true);
    expect(sameDays(['2031-03-12'], [])).toBe(false);
  });
});

describe('dayError', () => {
  it('explains why a day cannot be added', () => {
    expect(dayError('', [])).toBe('יש לבחור תאריך');
    expect(dayError('2031-02-30', [])).toBe('התאריך אינו תקין');
    expect(dayError('2031-03-12', ['2031-03-12'])).toBe('התאריך כבר ברשימה');
    expect(dayError('2031-03-14', [])).toContain('שישי או שבת');
    expect(dayError('2031-03-12', [])).toBeNull();
  });
});

describe('fmtDay', () => {
  it('writes the day with its weekday and the full year', () => {
    const text = fmtDay('2031-03-12');
    expect(text).toContain('2031');
    expect(text).toContain('12');
  });

  it('shows what it cannot read as it is', () => {
    expect(fmtDay('nonsense')).toBe('nonsense');
  });
});
