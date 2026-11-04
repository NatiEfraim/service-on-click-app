import { describe, expect, it, vi } from 'vitest';
import { notifyBookingDecision, subscribeBookingDecisions } from './booking-decisions';

describe('drawer decisions reach list animations', () => {
  it('relays approval and refusal outcomes with the booking serial', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBookingDecisions(listener);
    try {
      expect(notifyBookingDecision(123, 'ok')).toBe(true);
      expect(listener).toHaveBeenLastCalledWith(123, 'ok');
      expect(notifyBookingDecision(456, 'bad')).toBe(true);
      expect(listener).toHaveBeenLastCalledWith(456, 'bad');
    } finally { unsubscribe(); }
  });
  it('does not defer refresh when no list is mounted', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeBookingDecisions(listener);
    unsubscribe();
    expect(notifyBookingDecision(123, 'ok')).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });
});
