import { describe, expect, it } from 'vitest';

import { applyOrder, buildFieldTree, byPosition, flattenNode, isCompleteOrder, moveItem, standAloneIds } from './fieldTree';

function field(id, parent = null, position = 0) {
  return {
    id,
    parent_id: parent,
    field_name: `f${id}`,
    field_display_name: `שדה ${id}`,
    field_type_id: 2,
    is_required: true,
    editable: false,
    position,
    version: 1,
    used_by: 0,
    is_custom: false,
    can_change_type: false,
    can_remove: false,
  };
}

describe('byPosition', () => {
  it('orders by position, then by id', () => {
    expect([field(3, null, 1), field(2, null, 1), field(9, null, 0)].sort(byPosition).map((f) => f.id)).toEqual([9, 2, 3]);
  });
});

describe('buildFieldTree', () => {
  it('puts a field under its parent and keeps the form order at every level', () => {
    const fields = [field(5, 2), field(1), field(4, 1), field(2), field(3, 2), field(6, 3)];
    const { roots, orphans } = buildFieldTree(fields);
    expect(roots.map((r) => r.field.id)).toEqual([1, 2]);
    expect(roots[0].children.map((c) => c.field.id)).toEqual([4]);
    expect(roots[1].children.map((c) => c.field.id)).toEqual([3, 5]);
    expect(orphans).toEqual([]);
  });

  it('tells the depth of each node and flattens parents first', () => {
    const { roots } = buildFieldTree([field(1), field(2, 1), field(3, 2), field(4, 1)]);
    expect(flattenNode(roots[0]).map((n) => [n.field.id, n.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 1],
    ]);
  });

  it('keeps a field whose parent is missing instead of losing it', () => {
    const { roots, orphans } = buildFieldTree([field(1), field(7, 99)]);
    expect(roots.map((r) => r.field.id)).toEqual([1]);
    expect(orphans.map((f) => f.id)).toEqual([7]);
  });
});

describe('reordering', () => {
  const fields = [field(1), field(2, 1), field(3), field(4), field(5, 4)];

  it('lists only the stand-alone fields for the reorder call', () => {
    expect(standAloneIds(fields)).toEqual([1, 3, 4]);
  });

  it('moves one id and leaves the input alone', () => {
    const ids = [1, 3, 4];
    expect(moveItem(ids, 2, 0)).toEqual([4, 1, 3]);
    expect(moveItem(ids, 0, 1)).toEqual([3, 1, 4]);
    expect(ids).toEqual([1, 3, 4]);
  });

  it('ignores a move to nowhere', () => {
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 1, 7)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], -1, 0)).toEqual([1, 2, 3]);
  });

  it('shows the new order at once: stand-alone fields take their place as position, children stay', () => {
    const next = applyOrder(fields, [4, 1, 3]);
    expect(standAloneIds(next)).toEqual([4, 1, 3]);
    expect(next.find((f) => f.id === 2)?.position).toBe(0);
    expect(fields.find((f) => f.id === 4)?.position).toBe(0);
  });

  it('knows when a list is exactly the stand-alone set', () => {
    expect(isCompleteOrder(fields, [4, 3, 1])).toBe(true);
    expect(isCompleteOrder(fields, [4, 3])).toBe(false);
    expect(isCompleteOrder(fields, [4, 3, 1, 2])).toBe(false);
    expect(isCompleteOrder(fields, [4, 3, 3])).toBe(false);
  });
});
