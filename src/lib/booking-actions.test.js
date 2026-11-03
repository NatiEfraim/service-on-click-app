import { describe, expect, it } from 'vitest';
import { bookingActions } from './booking-actions';

const action = (status_id) => ({ status_id, label: String(status_id) });

describe('bookingActions', () => {
  it('puts the permitted final approval in the first two card actions and removes intermediate approvals', () => {
    const final = action(3);
    const result = bookingActions([action(15), action(16), action(8), final]);
    expect(result.map((a) => a.status_id)).toEqual([3, 16, 8]);
    expect(result[0]).toBe(final);
  });
  it('preserves handler actions when the API does not permit final approval', () => {
    const actions = [action(15), action(16)];
    expect(bookingActions(actions)).toBe(actions);
  });
  it('preserves rejection and hold actions while replacing the control officer approval', () => {
    expect(bookingActions([17, 18, 8, 9, 10, 3].map(action)).map((a) => a.status_id)).toEqual([3, 18, 8, 9, 10]);
  });
  it('keeps completed and closed booking actions intact', () => {
    expect(bookingActions([5, 7].map(action)).map((a) => a.status_id)).toEqual([5, 7]);
    expect(bookingActions([])).toEqual([]);
  });
});
