import { describe, expect, it } from 'vitest';
import { advancedCount, DEFAULT_FILTERS, parseFilters, toApiParams, toSearchParams } from './filters';

const parse = (query: string) => parseFilters(new URLSearchParams(query));

describe('parseFilters', () => {
  it('starts from the open view with the default sort', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
  });

  it('reads a dashboard link', () => {
    const filters = parse('view=overdue&types=3&stage=approver&page=2');
    expect(filters).toMatchObject({ view: 'overdue', types: '3', stage: 'approver', page: 2 });
  });

  it('ignores anything unknown or malformed instead of breaking the screen', () => {
    const filters = parse('view=nonsense&sort=drop_table&dir=sideways&page=-4');
    expect(filters.view).toBe('open');
    expect(filters.sort).toBe(DEFAULT_FILTERS.sort);
    expect(filters.dir).toBe(DEFAULT_FILTERS.dir);
    expect(filters.page).toBe(1);
  });
});

describe('toSearchParams', () => {
  it('leaves out every default so links stay short', () => {
    expect(toSearchParams(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('round-trips a filtered list', () => {
    const filters = parse('view=all&q=%D7%90%D7%A4%D7%A8%D7%99%D7%9D&types=1%2C2&sort=serial_number&dir=asc&page=3');
    expect(parse(toSearchParams(filters).toString())).toEqual(filters);
  });

  it('does not touch the parameters it does not own (the open booking drawer)', () => {
    const params = toSearchParams({ ...DEFAULT_FILTERS, view: 'mine' }, new URLSearchParams('booking=287575&view=all&q=old'));
    expect(params.get('booking')).toBe('287575');
    expect(params.get('view')).toBe('mine');
    expect(params.has('q')).toBe(false);
  });
});

describe('toApiParams', () => {
  it('maps each quick view to the API filters', () => {
    expect(toApiParams({ ...DEFAULT_FILTERS, view: 'open' })).toMatchObject({ open_only: true, mine: false, overdue: false, sync: '' });
    expect(toApiParams({ ...DEFAULT_FILTERS, view: 'mine' })).toMatchObject({ open_only: true, mine: true });
    expect(toApiParams({ ...DEFAULT_FILTERS, view: 'overdue' })).toMatchObject({ open_only: true, overdue: true });
    expect(toApiParams({ ...DEFAULT_FILTERS, view: 'decide' })).toMatchObject({ open_only: false, sync: 'conflict' });
    expect(toApiParams({ ...DEFAULT_FILTERS, view: 'all' })).toMatchObject({ open_only: false, mine: false, overdue: false, sync: '' });
  });

  it('passes the filters and the paging through', () => {
    expect(toApiParams({ ...DEFAULT_FILTERS, types: '3', stage: 'approver', page: 2, ids: '1,2' }, 50)).toMatchObject({ types: '3', stage: 'approver', page: 2, ids: '1,2', per_page: 50 });
  });
});

describe('advancedCount', () => {
  it('counts only the filters behind the "advanced" button', () => {
    expect(advancedCount({ ...DEFAULT_FILTERS, q: 'x', ids: '1' })).toBe(0);
    expect(advancedCount({ ...DEFAULT_FILTERS, types: '3', from: '2026-10-01' })).toBe(2);
  });
});
