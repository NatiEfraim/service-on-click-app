
import { dmyToIso } from './format';



const EMPTY = '—';

function present(value) {
  return value !== undefined && value !== null && value !== '';
}

function optionLabel(option) {
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
export function optionText(options) {
  if (!options) return '';
  const list = Array.isArray(options) ? options : [options];
  return list
    .map(optionLabel)
    .filter(Boolean)
    .join(', ');
}

const UPLOAD_FIELD_TYPES = new Set(['file', 'image']);

/** Upload nodes are omitted from the textual details and displayed in the attachments panel. */
export function isUploadNode(node) {
  return UPLOAD_FIELD_TYPES.has(node.field_type?.name) || (Array.isArray(node.value) && node.value.length > 0 && node.value.every((item) => typeof item === 'object' && item !== null && 'type' in item && ['file', 'image'].includes(String((item).type))));
}

/** Normalizes a file stored in booking_values to the shape used by the shared attachments panel. */
export function uploadAttachment(entry, index = 0) {
  const name = entry.display_name ?? entry.name ?? 'קובץ';
  const url = entry.url ?? null;
  const path = `${name} ${url ?? ''}`.toLowerCase().split('?')[0];
  const image = entry.type === 'image' || /\.(jpe?g|png|gif|webp)\b/.test(path);
  const pdf = /\.pdf\b/.test(path) || (entry.mime_type ?? entry.mime ?? '') === 'application/pdf';
  return {
    id: entry.id ?? index,
    kind: image ? 'image' : 'file',
    name,
    url,
    mime: entry.mime_type ?? entry.mime ?? (pdf ? 'application/pdf' : null),
    available: Boolean(url),
    inline: image || pdf,
  };
}

/** Files embedded in the booking_values tree, including files inside nested form groups. */
export function uploadAttachments(nodes) {
  const entries = [];
  const walk = (items) => {
    for (const node of items ?? []) {
      if (Array.isArray(node?.value)) {
        for (const entry of node.value) {
          if (entry?.type === 'file' || entry?.type === 'image') entries.push(uploadAttachment(entry, entries.length));
        }
      }
      walk(node?.form_fields);
    }
  };
  walk(nodes);
  return entries;
}

function plainText(value) {
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (Array.isArray(value)) {
    // only plain text / numbers are displayed
    const items = value.filter((item) => typeof item === 'string' || typeof item === 'number').map(String).filter(Boolean);
    return items.length ? items.join(', ') : EMPTY;
  }
  if (typeof value === 'string' || typeof value === 'number') return present(value) ? String(value) : EMPTY;
  return EMPTY;
}

/** Flattens the `booking_values` tree into label / text / depth lines. */
export function describeValues(nodes, depth = 0) {
  const lines = [];
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
export function findValueNode(nodes, formFieldId) {
  for (const node of nodes ?? []) {
    if (node.form_field_id === formFieldId) return node;
    const inChild = findValueNode(node.form_fields, formFieldId);
    if (inChild) return inChild;
  }
  return null;
}

/** Initial `<input type="date|time">` value; the server prints `d/m/Y`, the input and API want `Y-m-d`. */
export function editableInitialValue(nodes, formFieldId, kind) {
  const node = findValueNode(nodes, formFieldId);
  const raw = node && present(node.value) ? String(node.value) : '';
  if (!raw) return '';
  return kind === 'date' ? dmyToIso(raw) : raw.slice(0, 5);
}
