import { describe, expect, it } from 'vitest';

import { buildOptionTree, choiceFields, countOptions, fieldPath } from './options';

function option(id, formFieldId, parent = null, hasCategory = false) {
  return { id, form_field_id: formFieldId, parent_id: parent, name: `אפשרות ${id}`, category_name: null, has_category: hasCategory, gender: 0 };
}

function field(id, type, parent = null) {
  return {
    id,
    parent_id: parent,
    field_name: `f${id}`,
    field_display_name: `שדה ${id}`,
    field_type_id: type,
    is_required: true,
    editable: false,
    position: 0,
    version: 1,
    used_by: 0,
    is_custom: false,
    can_change_type: false,
    can_remove: false,
  };
}

describe('buildOptionTree', () => {
  const options = [option(5, 1, 3), option(3, 1, null, true), option(1, 1), option(9, 2), option(6, 1, 3), option(7, 1, 77)];

  it('nests the options of a category and keeps the id order', () => {
    const tree = buildOptionTree(options, 1);
    expect(tree.map((n) => n.option.id)).toEqual([1, 3, 7]);
    expect(tree[1].children.map((n) => n.option.id)).toEqual([5, 6]);
  });

  it('shows an option whose parent is gone at the top instead of losing it', () => {
    expect(buildOptionTree(options, 1).some((n) => n.option.id === 7)).toBe(true);
  });

  it('counts only the options of the field asked for', () => {
    expect(countOptions(buildOptionTree(options, 1))).toBe(5);
    expect(countOptions(buildOptionTree(options, 2))).toBe(1);
    expect(buildOptionTree(options, 3)).toEqual([]);
  });
});

describe('choiceFields / fieldPath', () => {
  const fields = [field(1, 5), field(2, 2), field(3, 20, 1), field(4, 1, 3), field(5, 14, 3)];

  it('keeps the fields that carry a list of options', () => {
    expect(choiceFields(fields).map((f) => f.id)).toEqual([1, 3, 5]);
  });

  it('names a field inside others with the path to it', () => {
    expect(fieldPath(fields[4], fields)).toBe('שדה 1 › שדה 3 › שדה 5');
    expect(fieldPath(fields[0], fields)).toBe('שדה 1');
  });

  it('does not loop on a broken parent chain', () => {
    const loop = [field(1, 5, 2), field(2, 5, 1)];
    expect(fieldPath(loop[0], loop)).toBe('שדה 2 › שדה 1');
  });
});
