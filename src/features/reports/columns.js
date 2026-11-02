

import { parseServerDate } from '@/lib/format';







const pad = (n) => String(n).padStart(2, '0');

/** `29.10.2026` - the local calendar day of an instant the server sent. */
export function dayText(value) {
  if (!value) return '';
  const date = parseServerDate(value);
  return Number.isNaN(date.getTime()) ? '' : `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/** The instant as a date with no time (local midnight): what an Excel date cell should hold. */
export function dayValue(value) {
  if (!value) return null;
  const date = parseServerDate(value);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole hours below two days, days from there - the wording of the dashboard. Empty when there is no value. */
export function durationText(hours) {
  if (hours === null || hours === undefined) return '';
  return hours >= 48 ? `${Math.round((hours / 24) * 10) / 10} ימים` : `${Math.round(hours * 10) / 10} שעות`;
}

const hoursValue = (hours) => (hours === null || hours === undefined ? null : Math.round(hours * 10) / 10);

/** A closed booking is not "over target" any more: the column is empty for it. */
const overdueText = (row) => (row.stage === 'closed' ? '' : row.overdue ? 'כן' : 'לא');

export const COLUMNS = [
  { key: 'serial', label: 'מספר הזמנה', filter: 'text', hint: 'למשל 6032297', text: (r) => String(r.serial_number), sort: (r) => r.serial_number, firstDir: 'desc', cell: (r) => r.serial_number },
  { key: 'group', label: 'תחום', filter: 'select', text: (r) => r.group_label ?? '', sort: (r) => r.group_label, firstDir: 'asc' },
  { key: 'type', label: 'סוג הזמנה', filter: 'select', text: (r) => r.booking_type_label, sort: (r) => r.booking_type_label, firstDir: 'asc' },
  { key: 'status', label: 'סטטוס', filter: 'select', text: (r) => r.status_label, sort: (r) => r.status_label, firstDir: 'asc' },
  { key: 'stage', label: 'שלב נוכחי', filter: 'select', text: (r) => r.stage_label, sort: (r) => r.stage_label, firstDir: 'asc' },
  { key: 'requester', label: 'שם המבקש', filter: 'text', hint: 'שם או חלק משם', text: (r) => r.owner_name ?? '', sort: (r) => r.owner_name, firstDir: 'asc' },
  { key: 'personal_id', label: 'מספר אישי', filter: 'text', hint: 'מספר אישי או תחילתו', text: (r) => r.owner_personal_id ?? '', sort: (r) => r.owner_personal_id, firstDir: 'asc' },
  { key: 'unit', label: 'יחידה', filter: 'select', text: (r) => r.unit_name ?? '', sort: (r) => r.unit_name, firstDir: 'asc' },
  { key: 'department', label: 'מחלקה', filter: 'select', text: (r) => r.department_name ?? '', sort: (r) => r.department_name, firstDir: 'asc' },
  { key: 'opened', label: 'תאריך פתיחה', filter: 'dates', text: (r) => dayText(r.opened), sort: (r) => r.opened, firstDir: 'desc', cell: (r) => dayValue(r.opened) },
  { key: 'updated', label: 'עדכון אחרון', filter: 'dates', text: (r) => dayText(r.updated), sort: (r) => r.updated, firstDir: 'desc', cell: (r) => dayValue(r.updated) },
  {
    key: 'age',
    label: 'זמן מפתיחה',
    filter: 'min_days',
    text: (r) => durationText(r.total_age_hours),
    sort: (r) => r.total_age_hours,
    firstDir: 'desc',
    cell: (r) => hoursValue(r.total_age_hours),
    excelLabel: 'זמן מפתיחה (שעות)',
  },
  { key: 'target', label: 'יעד טיפול', filter: null, text: (r) => durationText(r.target_hours), sort: (r) => r.target_hours, firstDir: 'desc', cell: (r) => hoursValue(r.target_hours), excelLabel: 'יעד טיפול (שעות)' },
  { key: 'overdue', label: 'חורגת מיעד', filter: 'yesno', text: overdueText, sort: (r) => overdueText(r) || null, firstDir: 'desc' },
  {
    key: 'handling',
    label: 'זמן טיפול (סגורות)',
    filter: null,
    text: (r) => durationText(r.handling_hours),
    sort: (r) => r.handling_hours,
    firstDir: 'desc',
    cell: (r) => hoursValue(r.handling_hours),
    excelLabel: 'זמן טיפול (שעות)',
  },
];

export const COLUMN_KEYS = COLUMNS.map((c) => c.key);

export const columnOf = (key) => COLUMNS.find((c) => c.key === key);

/** Ready-made column sets; "חריגות" also asks for the bookings that are over target. */
export const PRESETS = [
  { id: 'basic', label: 'בסיסי', cols: ['serial', 'type', 'status', 'opened'] },
  { id: 'overdue', label: 'חריגות', cols: ['serial', 'type', 'stage', 'age', 'target', 'overdue'], filters: { overdue: 'yes' } },
  { id: 'requester', label: 'לפי מבקש', cols: ['serial', 'requester', 'personal_id', 'department', 'status'] },
];

const collator = new Intl.Collator('he', { numeric: true, sensitivity: 'base' });



/** Sorted copy: numbers by value, text by Hebrew collation; empty values last. */
export function sortRows(rows, sort) {
  const accessor = columnOf(sort.key).sort;
  const factor = sort.dir === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: accessor(row) }))
    .sort((a, b) => {
      const empty = (v) => v === null || v === '';
      if (empty(a.value) || empty(b.value)) return empty(a.value) === empty(b.value) ? a.index - b.index : empty(a.value) ? 1 : -1;
      const x = a.value;
      const y = b.value;
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y));
      return order === 0 ? a.index - b.index : order * factor;
    })
    .map((entry) => entry.row);
}

export const PAGE_SIZE = 25;

export function pageCount(total, size = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / size));
}

/** The rows of one page (1-based); a page past the end is the last one. */
export function pageSlice(rows, page, size = PAGE_SIZE) {
  const p = Math.min(Math.max(1, page), pageCount(rows.length, size));
  return rows.slice((p - 1) * size, p * size);
}
