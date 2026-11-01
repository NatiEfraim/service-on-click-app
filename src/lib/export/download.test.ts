import { describe, expect, it } from 'vitest';
import { reportFileName } from './download';

describe('reportFileName', () => {
  it('names the report in Hebrew with the local date', () => {
    expect(reportFileName('xlsx', new Date(2026, 10, 1, 16, 30))).toBe('דוח קריאות 2026-11-01.xlsx');
    expect(reportFileName('pdf', new Date(2026, 0, 9, 0, 5))).toBe('דוח קריאות 2026-01-09.pdf');
  });

  it('uses the local day, not the UTC one (00:30 in Israel is still yesterday in UTC)', () => {
    const justAfterMidnight = new Date(2026, 10, 1, 0, 30, 0);
    expect(reportFileName('pdf', justAfterMidnight)).toContain('2026-11-01');
  });

  it('contains nothing a file system refuses', () => {
    expect(reportFileName('xlsx')).not.toMatch(/[<>:"/\\|?*\u{0}-\u{1f}]/u);
  });
});
