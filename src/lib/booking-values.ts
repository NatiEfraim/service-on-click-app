import type { BookingValueNode, OptionNode } from './api/types';
import { dmyToIso } from './format';

/**
 * `booking_values` of a booking arrive as a tree with three kinds of nodes (see BookingValueNode):
 *  - a plain field, with `value`;
 *  - a choice, with `option_fields` (one option, an option that chains into another, or a list for a multi-select);
 *  - a group that carries child `form_fields` and may also have a choice of its own.
 * `describeValues` flattens that tree into lines a person reads: label, text, and how deep it sits.
 */

export interface ValueLine {
  label: string;
  /** What the booking holds; "—" when nothing was chosen or typed. */
  text: string;
  /** 0 for a top-level field, 1+ for the children of a group. */
  depth: number;
  /** True for a group heading that has children below it. */
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

/** The text of a chosen option, a chain of options, or a list of options (multi-select). */
export function optionText(options: OptionNode | OptionNode[] | undefined): string {
  if (!options) return '';
  const list = Array.isArray(options) ? options : [options];
  return list
    .map(optionLabel)
    .filter(Boolean)
    .join(', ');
}

/** Field types whose value is a list of uploads: `file` (13) and `image` (23). */
const UPLOAD_FIELD_TYPES = new Set(['file', 'image']);

/**
 * A file / image field. The server lists its uploads inside `booking_values` too, each with a presigned URL that points straight
 * at the storage bucket - the app never uses those. The uploads are shown from `attachments` (served through the API with the
 * login cookie), so these nodes are left out of the details.
 */
export function isUploadNode(node: BookingValueNode): boolean {
  return UPLOAD_FIELD_TYPES.has(node.field_type?.name) || (Array.isArray(node.value) && node.value.length > 0 && node.value.every((item) => typeof item === 'object' && item !== null && 'type' in item && ['file', 'image'].includes(String((item as { type: unknown }).type))));
}

function plainText(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (Array.isArray(value)) {
    // a list of plain values (e.g. several dates); anything that is not plain text or a number is not for display
    const items = value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').map(String).filter(Boolean);
    return items.length ? items.join(', ') : EMPTY;
  }
  if (typeof value === 'string' || typeof value === 'number') return present(value) ? String(value) : EMPTY;
  return EMPTY;
}

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

/**
 * What to put into an `<input type="date|time">` for a field the approver may correct. The server prints dates `d/m/Y`
 * and times `HH:MM`; the inputs and the API want `Y-m-d` and `HH:MM`.
 */
export function editableInitialValue(nodes: BookingValueNode[] | undefined, formFieldId: number, kind: 'date' | 'time'): string {
  const node = findValueNode(nodes, formFieldId);
  const raw = node && present(node.value) ? String(node.value) : '';
  if (!raw) return '';
  return kind === 'date' ? dmyToIso(raw) : raw.slice(0, 5);
}
