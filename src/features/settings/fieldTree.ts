import type { FormField } from '@/lib/api/types';

/** The form's order: `position`, then `id` (the server sorts the same way, and every seeded field has position 0). */
export function byPosition(a: Pick<FormField, 'position' | 'id'>, b: Pick<FormField, 'position' | 'id'>): number {
  return a.position - b.position || a.id - b.id;
}

export interface FieldNode {
  field: FormField;
  /** 0 for a stand-alone field, 1 for a field inside it, ... */
  depth: number;
  children: FieldNode[];
}

/** The form as a flat ordered tree; fields with a missing parent are kept at the end. */
export function buildFieldTree(fields: readonly FormField[]): { roots: FieldNode[]; orphans: FormField[] } {
  const sorted = [...fields].sort(byPosition);
  const ids = new Set(sorted.map((field) => field.id));
  const nodes = new Map<number, FieldNode>(sorted.map((field) => [field.id, { field, depth: 0, children: [] }]));

  const roots: FieldNode[] = [];
  const orphans: FormField[] = [];
  for (const field of sorted) {
    const node = nodes.get(field.id) as FieldNode;
    if (field.parent_id === null) roots.push(node);
    else if (ids.has(field.parent_id)) (nodes.get(field.parent_id) as FieldNode).children.push(node);
    else orphans.push(field);
  }

  const setDepth = (node: FieldNode, depth: number) => {
    node.depth = depth;
    node.children.forEach((child) => setDepth(child, depth + 1));
  };
  roots.forEach((root) => setDepth(root, 0));

  return { roots, orphans };
}

/** A node and everything inside it, parents first. */
export function flattenNode(node: FieldNode): FieldNode[] {
  return [node, ...node.children.flatMap(flattenNode)];
}

/** The ids the reorder call must carry: ALL the stand-alone fields, in the order shown. */
export function standAloneIds(fields: readonly FormField[]): number[] {
  return fields
    .filter((field) => field.parent_id === null)
    .sort(byPosition)
    .map((field) => field.id);
}

/** `ids` with the item at `from` moved to `to` (a new array; out-of-range positions leave it as it was). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Fields as they will be after saving `orderedIds`, for the optimistic update. */
export function applyOrder(fields: readonly FormField[], orderedIds: readonly number[]): FormField[] {
  const place = new Map(orderedIds.map((id, index) => [id, index]));
  return fields.map((field) => (place.has(field.id) ? { ...field, position: place.get(field.id) as number } : field));
}

/** True when the list is exactly the stand-alone fields of the form, each once (otherwise the server answers 409). */
export function isCompleteOrder(fields: readonly FormField[], orderedIds: readonly number[]): boolean {
  const expected = standAloneIds(fields);
  return expected.length === orderedIds.length && [...expected].sort((a, b) => a - b).join() === [...orderedIds].sort((a, b) => a - b).join();
}
