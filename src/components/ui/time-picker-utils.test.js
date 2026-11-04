import { describe, expect, it } from 'vitest';
import { timeParts, timeValue } from './time-picker-utils';
describe('24-hour picker values', () => {
 it('preserves midnight, noon and the last minute without AM/PM conversion', () => {
  for (const value of ['00:00','12:00','17:05','23:59']) { const parts = timeParts(value); expect(timeValue(parts.hour, parts.minute)).toBe(value); }
 });
 it('accepts API seconds and produces the existing HH:mm payload', () => {
  expect(timeParts('08:35:00')).toEqual({hour:8,minute:35});
  expect(timeValue(8,5)).toBe('08:05');
 });
 it('opens invalid or empty input at a valid default', () => {
  for (const value of ['',null,'24:00','12:60']) expect(timeParts(value)).toEqual({hour:8,minute:0});
 });
});
