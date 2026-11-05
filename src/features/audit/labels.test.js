import { describe, expect, it } from 'vitest';

import { mergeOneSave } from './labels';

const change = (id, at, before, after, extra = {}) => ({
  id, occurred_at: at, action: 'user.permissions.change', result: 'success', actor_id: '1', entity_id: '9', reason: 'r',
  before: { permissions: before }, after: { permissions: after }, ...extra,
});

describe('mergeOneSave', () => {
  it('makes the two requests of one save one row, from the first before to the last after', () => {
    const rows = [change(2, '2026-11-05T10:00:02Z', ['a'], ['b']), change(1, '2026-11-05T10:00:00Z', ['a', 'x'], ['a'])];
    const merged = mergeOneSave(rows);
    expect(merged).toHaveLength(1);
    expect(merged[0].before.permissions).toEqual(['a', 'x']);
    expect(merged[0].after.permissions).toEqual(['b']);
    expect(merged[0].occurred_at).toBe('2026-11-05T10:00:02Z');
  });

  it('never chains a third record onto a merged save', () => {
    const rows = [change(3, '2026-11-05T10:00:10Z', [], []), change(2, '2026-11-05T10:00:05Z', [], []), change(1, '2026-11-05T10:00:00Z', [], [])];
    expect(mergeOneSave(rows)).toHaveLength(2);
  });

  it('keeps saves with another reason or another person apart', () => {
    const rows = [change(2, '2026-11-05T10:00:01Z', [], [], { reason: 'other' }), change(1, '2026-11-05T10:00:00Z', [], [])];
    expect(mergeOneSave(rows)).toHaveLength(2);
  });
});
