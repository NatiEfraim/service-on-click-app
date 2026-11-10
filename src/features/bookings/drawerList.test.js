import { describe, expect, it } from 'vitest';
import { placeInList } from './drawerList';

const list = (serials, extra = {}) => ({ serials, total: null, hasMore: false, loadMore: () => {}, ...extra });

describe('placeInList', () => {
  it('finds the neighbours of a booking in the middle', () => {
    expect(placeInList(list([11, 22, 33]), 22)).toEqual({ index: 1, count: 3, previous: 11, next: 33, nextNeedsLoad: false });
  });

  it('has no previous at the first and no next at the last', () => {
    expect(placeInList(list([11, 22, 33]), 11).previous).toBeNull();
    expect(placeInList(list([11, 22, 33]), 33).next).toBeNull();
  });

  it('counts the whole list when the server gave a total, not only the loaded rows', () => {
    expect(placeInList(list([11, 22], { total: 47 }), 22).count).toBe(47);
  });

  it('asks for the next page at the last loaded row of a paged list', () => {
    expect(placeInList(list([11, 22], { hasMore: true }), 22).nextNeedsLoad).toBe(true);
    expect(placeInList(list([11, 22], { hasMore: true }), 11).nextNeedsLoad).toBe(false);
  });

  it('gives null when the booking was not opened from this list, or there is no list', () => {
    expect(placeInList(list([11, 22]), 99)).toBeNull();
    expect(placeInList(null, 11)).toBeNull();
  });
});
