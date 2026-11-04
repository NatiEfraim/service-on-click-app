import { describe, expect, it } from 'vitest';
import { validateTargetInput, acceptsWarningInput, warningExplanation } from './validation';
describe('handling target form', () => {
  it('accepts arbitrary valid warning percentages', () => {
    for (const percent of ['1', '23', '64', '99']) expect(validateTargetInput('999', 'h', percent)).toBeNull();
  });
  it('limits targets to three digits and retains the backend day limit', () => {
    for (const value of ['1000', '0', '-1', '2.5', '1e2']) expect(validateTargetInput(value, 'h', '80')).not.toBeNull();
    expect(validateTargetInput('180', 'd', '80')).toBeNull();
    expect(validateTargetInput('181', 'd', '80')).not.toBeNull();
  });
  it('rejects fractional and out-of-range warning input', () => {
    for (const percent of ['', '0', '100', '101', '1000', '-2', 'abc', '64.5', '1e2']) expect(validateTargetInput('24', 'h', percent)).not.toBeNull();
  });
});
it('rejects typing or pasting more than 99, fractions and zero', () => {
  for (const value of ['100', '101', '999', '1000', '50.5', '0', '-1']) expect(acceptsWarningInput(value)).toBe(false);
  for (const value of ['', '1', '50', '99']) expect(acceptsWarningInput(value)).toBe(true);
});
it('explains the actual warning threshold and time remaining', () => {
  expect(warningExplanation('2', 'd', '50')).toBe('תופיע התראה מוקדמת יום לפני היעד, לאחר יום מפתיחת הקריאה.');
  expect(warningExplanation('10', 'h', '80')).toContain('2 שעות לפני היעד');
  expect(warningExplanation('', 'h', '50')).toBe('');
});