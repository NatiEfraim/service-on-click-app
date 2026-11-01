import type { BookingValueNode, OptionNode } from './api/types';
import { dmyToIso } from './format';

export interface ValueLine {
  label: string;
  /** "—" when nothing was chosen or typed. */
  text: string;
  /** 0 for a top-level field, 1+ for group children. */
  depth: number;
  /** A group heading with children below it. */
  group: boolean;
}

const EMPTY = '—';

function present(value: unknown): value is string | number {
  return value !== undefined && value !== null && value !== '';
}

function optionLabel(option: OptionNode): string {
  let text = option.display_name ?? '';
  if (present(option.value)) text += text ? `: ${option.value}` : String(option.value);
  const next = option.option_fields;
  if (next) {
    const chained = optionText(next);
    if (chained) text += text ? ` › ${chained}` : chained;
  }
  return text;
}

/** Text of a chosen option, an option chain, or a multi-select list. */
export function optionText(options: OptionNode | OptionNode[] | undefined): string {
  if (!options) return '';
  const list = Array.isArray(options) ? options : [options];
  return list
    .map(optionLabel)
    .filter(Boolean)
    .join(', ');
}

const UPLOAD_FIELD_TYPES = new Set(['file', 'image']);

/** Upload nodes carry presigned bucket URLs the app never uses; uploads are shown from `attachments`. */
export function isUploadNode(node: BookingValueNode): boolean {
  return UPLOAD_FIELD_TYPES.has(node.field_type?.name) || (Array.isArray(node.value) && node.value.length > 0 && node.value.every((item) => typeof item === 'object' && item !== null && 'type' in item && ['file', 'image'].includes(String((item as { type: unknown }).type))));
}

function plainText(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (Array.isArray(value)) {
    // only plain text / numbers are displayed
    const items = value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').map(String).filter(Boolean);
    return items.length ? items.join(', ') : EMPTY;
  }
  if (typeof value === 'string' || typeof value === 'number') return present(value) ? String(value) : EMPTY;
  return EMPTY;
}

/** Flattens the `booking_values` tree into label / text / depth lines. */
export function describeValues(nodes: BookingValueNode[] | undefined, depth = 0): ValueLine[] {
  const lines: ValueLine[] = [];
  for (const node of nodes ?? []) {
    if (isUploadNode(node)) continue;
    const label = node.field_display_name || node.field_name;
    const children = Array.isArray(node.form_fields) ? node.form_fields : null;

    if (children) {
      const own = optionText(node.option_fields);
      lines.push({ label, text: own || (children.length ? '' : EMPTY), depth, group: children.length > 0 });
      lines.push(...describeValues(children, depth + 1));
    } else if (node.option_fields) {
      lines.push({ label, text: optionText(node.option_fields) || EMPTY, depth, group: false });
    } else {
      lines.push({ label, text: plainText(node.value), depth, group: false });
    }
  }
  return lines;
}

/** Finds a node by `form_field_id` anywhere in the tree. */
export function findValueNode(nodes: BookingValueNode[] | undefined, formFieldId: number): BookingValueNode | null {
  for (const node of nodes ?? []) {
    if (node.form_field_id === formFieldId) return node;
    const inChild = findValueNode(node.form_fields, formFieldId);
    if (inChild) return inChild;
  }
  return null;
}

/** Initial `<input type="date|time">` value; the server prints `d/m/Y`, the input and API want `Y-m-d`. */
export function editableInitialValue(nodes: BookingValueNode[] | undefined, formFieldId: number, kind: 'date' | 'time'): string {
  const node = findValueNode(nodes, formFieldId);
  const raw = node && present(node.value) ? String(node.value) : '';
  if (!raw) return '';
  return kind === 'date' ? dmyToIso(raw) : raw.slice(0, 5);
}
