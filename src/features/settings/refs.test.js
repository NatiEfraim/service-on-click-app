import { describe, expect, it } from 'vitest';
import { draftFromValue, draftProblems, draftToValue, isDatesReference, isDraftDirty, refInputKind, refKeyLabel } from './refs';

describe('isDatesReference', () => {
  it('sets the blocked-dates list apart from the operating settings', () => {
    expect(isDatesReference({ name: 'restriction_dates_car_booking' })).toBe(true);
    expect(isDatesReference({ name: 'restrictions_car_booking' })).toBe(false);
  });
});

describe('refInputKind', () => {
  it('reads how to edit a key off its current value', () => {
    expect(refInputKind('stock_cars', 15)).toBe('number');
    expect(refInputKind('start_time', '08:00')).toBe('time');
    expect(refInputKind('contact_phone', '03-7371111')).toBe('phone');
    expect(refInputKind('count_businsday', true)).toBe('boolean');
    expect(refInputKind('something', 'text')).toBe('text');
  });

  it('labels the known keys and shows an unknown one as it is', () => {
    expect(refKeyLabel('start_time')).toBe('משעה');
    expect(refKeyLabel('brand_new_key')).toBe('brand_new_key');
  });
});

describe('drafts', () => {
  const original = { start_time: '08:00', end_time: '17:00' };

  it('starts equal to the server value and notices a change', () => {
    const draft = draftFromValue(original);
    expect(draft).toEqual({ start_time: '08:00', end_time: '17:00' });
    expect(isDraftDirty(original, draft)).toBe(false);
    expect(isDraftDirty(original, { ...draft, end_time: '18:00' })).toBe(true);
  });

  it('keeps the type of a switch and of a number', () => {
    expect(draftFromValue({ count_businsday: true, max: 2 })).toEqual({ count_businsday: true, max: '2' });
  });

  it('sends EVERY key, numbers as numbers and switches as booleans', () => {
    const value = { stock_cars: 15, contact_phone: '03-7371111', count_businsday: true };
    const draft = { stock_cars: '20', contact_phone: ' 03-7371112 ', count_businsday: false };
    expect(draftToValue(value, draft)).toEqual({ stock_cars: 20, contact_phone: '03-7371112', count_businsday: false });
  });

  it('points at the keys that cannot be sent yet', () => {
    const value = { stock_cars: 15, start_time: '08:00', contact_phone: '03-7371111' };
    expect(draftProblems(value, { stock_cars: '', start_time: '', contact_phone: ' ' })).toEqual({
      stock_cars: 'יש להזין מספר',
      start_time: 'יש להזין שעה',
      contact_phone: 'יש למלא את השדה',
    });
    expect(draftProblems(value, { stock_cars: '-3', start_time: '09:30', contact_phone: '050-1234567' })).toEqual({ stock_cars: 'יש להזין מספר חיובי' });
    expect(draftProblems(value, { stock_cars: '12', start_time: '09:30', contact_phone: '050-1234567' })).toEqual({});
  });
});
