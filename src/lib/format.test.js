import { describe, expect, it } from 'vitest';
import { dmyToIso, fmtAgo, fmtHours, fmtLongHours, initials, parseServerDate, toDayString } from './format';

describe('parseServerDate', () => {
  it('reads the audit log timestamp (no zone) as UTC, not local time', () => {
    expect(parseServerDate('2026-11-01 14:16:15.038910').toISOString()).toBe('2026-11-01T14:16:15.038Z');
    expect(parseServerDate('2026-11-01 14:16:15').toISOString()).toBe('2026-11-01T14:16:15.000Z');
  });

  it('keeps an ISO timestamp with an offset exactly as given', () => {
    expect(parseServerDate('2026-11-01T14:16:15+00:00').toISOString()).toBe('2026-11-01T14:16:15.000Z');
    expect(parseServerDate('2026-11-01T16:16:15+02:00').toISOString()).toBe('2026-11-01T14:16:15.000Z');
  });

  it('treats a bare date as a calendar day in local time', () => {
    const day = parseServerDate('2026-12-05');
    expect([day.getFullYear(), day.getMonth() + 1, day.getDate(), day.getHours()]).toEqual([2026, 12, 5, 0]);
  });
});

describe('durations', () => {
  it('picks minutes, hours or days by size', () => {
    expect(fmtHours(0.5)).toBe("30 דק'");
    expect(fmtHours(3.34)).toBe("3.3 ש'");
    expect(fmtHours(72)).toBe('3 ימים');
    expect(fmtHours(null)).toBe('—');
  });

  it('uses whole hours below two days on the dashboard', () => {
    expect(fmtLongHours(36)).toBe('36 שעות');
    expect(fmtLongHours(96)).toBe('4 ימים');
  });

  it('says how long ago', () => {
    const now = Date.parse('2026-11-01T12:00:00Z');
    expect(fmtAgo('2026-11-01T11:59:40Z', now)).toBe('עכשיו');
    expect(fmtAgo('2026-11-01T11:30:00Z', now)).toBe("לפני 30 דק'");
    expect(fmtAgo('2026-11-01T06:00:00Z', now)).toBe("לפני 6 ש'");
    expect(fmtAgo('2026-10-25T12:00:00Z', now)).toBe('לפני 7 ימים');
  });
});

describe('small helpers', () => {
  it('turns the server date d/m/Y into Y-m-d', () => {
    expect(dmyToIso('01/11/2026')).toBe('2026-11-01');
    expect(dmyToIso('5/3/2026')).toBe('2026-03-05');
    expect(dmyToIso('2026-11-01')).toBe('2026-11-01');
  });

  it('formats a local day as Y-m-d', () => {
    expect(toDayString(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('takes the first letters of the first two words', () => {
    expect(initials('רועי סחייק')).toBe('רס');
    expect(initials('  ')).toBe('');
    expect(initials(null)).toBe('');
  });
});
