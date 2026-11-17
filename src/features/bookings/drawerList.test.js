import { describe, expect, it } from 'vitest';
import { placeInList } from './drawerList';
import { bookingKey, isBookingKey } from './useBookingDrawer';

// the list holds the bookings' keys (their uuids), in the list's order
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const list = (keys, extra = {}) => ({ keys, total: null, hasMore: false, loadMore: () => {}, ...extra });

describe('placeInList', () => {
  it('finds the neighbours of a booking in the middle', () => {
    expect(placeInList(list([A, B, C]), B)).toEqual({ index: 1, count: 3, previous: A, next: C, nextNeedsLoad: false });
  });

  it('has no previous at the first and no next at the last', () => {
    expect(placeInList(list([A, B, C]), A).previous).toBeNull();
    expect(placeInList(list([A, B, C]), C).next).toBeNull();
  });

  it('counts the whole list when the server gave a total, not only the loaded rows', () => {
    expect(placeInList(list([A, B], { total: 47 }), B).count).toBe(47);
  });

  it('asks for the next page at the last loaded row of a paged list', () => {
    expect(placeInList(list([A, B], { hasMore: true }), B).nextNeedsLoad).toBe(true);
    expect(placeInList(list([A, B], { hasMore: true }), A).nextNeedsLoad).toBe(false);
  });

  it('gives null when the booking was not opened from this list, or there is no list', () => {
    expect(placeInList(list([A, B]), C)).toBeNull();
    expect(placeInList(null, A)).toBeNull();
  });
});

describe('booking keys', () => {
  it('opens a booking by its uuid, falling back to its number only when it has none', () => {
    expect(bookingKey({ uuid: A, serial_number: 419626 })).toBe(A);
    expect(bookingKey({ serial_number: 419626 })).toBe('419626');
    expect(bookingKey(null)).toBeNull();
  });

  it('matches the open booking by its uuid, or by its number from an older link', () => {
    const booking = { uuid: A, serial_number: 419626 };
    expect(isBookingKey(booking, A)).toBe(true);
    expect(isBookingKey(booking, '419626')).toBe(true);
    expect(isBookingKey(booking, B)).toBe(false);
    expect(isBookingKey(booking, null)).toBe(false);
  });
});
