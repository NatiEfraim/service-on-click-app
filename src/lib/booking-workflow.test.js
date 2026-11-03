import { describe, expect, it } from 'vitest';
import { holdDescription, isHoldStatus } from './booking-workflow';
describe('booking holds', () => {
  it.each([8, 9, 10, '8'])('recognizes hold %s', (status) => expect(isHoldStatus(status)).toBe(true));
  it.each([1, 3, 4, 7, 11, 15, 17, null])('does not treat decision %s as a hold', (status) => expect(isHoldStatus(status)).toBe(false));
  it('distinguishes requester files from supplier waits', () => {
    expect(holdDescription(8)).toContain('קבצים');
    expect(holdDescription(9)).toContain('אישור ספק');
    expect(holdDescription(10)).toContain('מספר ספק');
    expect(holdDescription(3)).toBe('');
  });
});
