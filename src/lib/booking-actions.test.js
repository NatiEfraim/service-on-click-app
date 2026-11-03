import { describe, expect, it } from 'vitest';
import { bookingActions } from './booking-actions';
const action = (status_id) => ({ status_id, label: String(status_id), comment_required: status_id === 4 });

describe('bookingActions', () => {
  it('shows final approval and rejection as the two quick actions for senior roles', () => {
    const actions = [17, 18, 8, 9, 10, 3, 4].map(action);
    const result = bookingActions(actions);
    expect(result.slice(0, 2).map((a) => a.status_id)).toEqual([3, 4]);
    expect(result[1]).toBe(actions[6]);
    expect(result[1].comment_required).toBe(true);
    expect(result.map((a) => a.status_id)).toEqual([3, 4, 17, 18, 8, 9, 10]);
    expect(actions.map((a) => a.status_id)).toEqual([17, 18, 8, 9, 10, 3, 4]);
  });
  it('keeps vice approver takeover and hold actions without granting final decisions', () => {
    const actions = [15, 16, 8, 9, 10].map(action);
    expect(bookingActions(actions)).toBe(actions);
  });
  it('does not hide an intermediate action if only final approval is available', () => {
    expect(bookingActions([15, 16, 8, 3].map(action)).map((a) => a.status_id)).toEqual([3, 15, 16, 8]);
  });
  it('keeps completion, cancellation and closed bookings intact', () => {
    expect(bookingActions([5, 7].map(action)).map((a) => a.status_id)).toEqual([5, 7]);
    expect(bookingActions([])).toEqual([]);
  });
});
