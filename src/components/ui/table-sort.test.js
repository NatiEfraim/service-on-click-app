import { describe, expect, it } from 'vitest';
import { compareValues, nextSort, sortRows } from './table-sort';

describe('compareValues', () => {
  it('orders numbers as numbers, not as text', () => {
    expect([10, 9, 100].sort(compareValues)).toEqual([9, 10, 100]);
  });
  it('orders Hebrew text alphabetically, with digits inside text as numbers', () => {
    expect(['גימל', 'אלף', 'בית'].sort(compareValues)).toEqual(['אלף', 'בית', 'גימל']);
    expect(['יחידה 10', 'יחידה 2'].sort(compareValues)).toEqual(['יחידה 2', 'יחידה 10']);
  });
  it('puts empty values last', () => {
    expect([null, 'ב', '', 'א', undefined].sort(compareValues)).toEqual(['א', 'ב', null, '', undefined]);
  });
});

describe('nextSort', () => {
  it('goes ascending, then descending, then back to no sort', () => {
    const first = nextSort(null, 'name');
    expect(first).toEqual({ id: 'name', dir: 'asc' });
    const second = nextSort(first, 'name');
    expect(second).toEqual({ id: 'name', dir: 'desc' });
    expect(nextSort(second, 'name')).toBeNull();
  });
  it('starts ascending when another column is clicked', () => {
    expect(nextSort({ id: 'name', dir: 'desc' }, 'users')).toEqual({ id: 'users', dir: 'asc' });
  });
});

describe('sortRows', () => {
  const rows = [{ n: 'ב', u: 3 }, { n: 'א', u: 3 }, { n: 'ג', u: 1 }];
  it('sorts both ways without changing the original list', () => {
    expect(sortRows(rows, (r) => r.u, 'asc').map((r) => r.n)).toEqual(['ג', 'ב', 'א']);
    expect(sortRows(rows, (r) => r.n, 'desc').map((r) => r.n)).toEqual(['ג', 'ב', 'א']);
    expect(rows.map((r) => r.n)).toEqual(['ב', 'א', 'ג']);
  });
  it('keeps the original order for equal values in both directions', () => {
    expect(sortRows(rows, (r) => r.u, 'desc').map((r) => r.n)).toEqual(['ב', 'א', 'ג']);
  });
});
