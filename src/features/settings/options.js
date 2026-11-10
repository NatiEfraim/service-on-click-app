
import { OPTION_FIELD_TYPES } from '@/lib/labels';



/** Builds the option tree from the flat list; options whose parent is missing (archived) go to the top. */
export function buildOptionTree(options, formFieldId) {
  const own = options.filter((option) => option.form_field_id === formFieldId).sort((a, b) => a.id - b.id);
  const nodes = new Map(own.map((option) => [option.id, { option, children: [] }]));
  const roots = [];
  for (const option of own) {
    const node = nodes.get(option.id);
    const parent = option.parent_id === null ? undefined : nodes.get(option.parent_id);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** How many options a tree holds, categories included. */
export function countOptions(nodes) {
  return nodes.reduce((sum, node) => sum + 1 + countOptions(node.children), 0);
}

const FIELD_TYPE_FILE = 13;

/**
 * The fields whose options can be edited, exactly as the mobile app lists them (index-selects):
 * a top-level choice field, and choice fields nested under one. A field with a file child is an upload, not a choice, so it is left out.
 */
export function choiceFields(fields) {
  const isChoice = (field) => OPTION_FIELD_TYPES.includes(field.field_type_id);
  const childrenOf = (id) => fields.filter((field) => field.parent_id === id);
  const hasFileChild = (field) => childrenOf(field.id).some((child) => child.field_type_id === FIELD_TYPE_FILE);
  const result = [];
  const visit = (level) => {
    for (const field of level) {
      if (!isChoice(field) || hasFileChild(field)) continue;
      result.push(field);
      visit(childrenOf(field.id));
    }
  };
  visit(fields.filter((field) => field.parent_id === null));
  return result;
}

/** "ציוד › ביגוד › חולצת בנים" - a field inside another is named with the fields around it. */
export function fieldPath(field, fields) {
  const names = [field.field_display_name];
  const seen = new Set([field.id]);
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
