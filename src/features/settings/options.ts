import type { FormField, OptionRow } from '@/lib/api/types';
import { OPTION_FIELD_TYPES } from '@/lib/labels';

export interface OptionNode {
  option: OptionRow;
  children: OptionNode[];
}

/** Builds the option tree from the flat list; options whose parent is missing (archived) go to the top. */
export function buildOptionTree(options: readonly OptionRow[], formFieldId: number): OptionNode[] {
  const own = options.filter((option) => option.form_field_id === formFieldId).sort((a, b) => a.id - b.id);
  const nodes = new Map<number, OptionNode>(own.map((option) => [option.id, { option, children: [] }]));
  const roots: OptionNode[] = [];
  for (const option of own) {
    const node = nodes.get(option.id) as OptionNode;
    const parent = option.parent_id === null ? undefined : nodes.get(option.parent_id);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** How many options a tree holds, categories included. */
export function countOptions(nodes: readonly OptionNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countOptions(node.children), 0);
}

/** The fields that carry a list of options (select, radio, checkbox, multi-select), in the form's order. */
export function choiceFields(fields: readonly FormField[]): FormField[] {
  return fields.filter((field) => OPTION_FIELD_TYPES.includes(field.field_type_id));
}

/** "ציוד › ביגוד › חולצת בנים" - a field inside another is named with the fields around it. */
export function fieldPath(field: FormField, fields: readonly FormField[]): string {
  const names: string[] = [field.field_display_name];
  const seen = new Set<number>([field.id]);
  let parentId = field.parent_id;
  while (parentId !== null && !seen.has(parentId)) {
    const parent = fields.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    seen.add(parent.id);
    names.unshift(parent.field_display_name);
    parentId = parent.parent_id;
  }
  return names.join(' › ');
}
