/** Hebrew names for the audit log's actions, filter groups and results (the API stores English keys). */

export const ACTION_LABEL = {
  'booking.status_change': 'שינוי סטטוס קריאה',
  'booking.values.update': 'תיקון ערכי קריאה',
  'booking.create': 'ניסיון פתיחת קריאה',
  'booking.canceled_by_restriction': 'ביטול קריאה עקב הגבלה',
  'user.create': 'יצירת משתמש',
  'user.permissions.change': 'שינוי הרשאות',
  'user.department.change': 'שינוי מחלקה',
  'config.form_field.editable': 'שינוי עריכת שדה',
  'config.form_field.reorder': 'שינוי סדר שדות',
  'config.options.update': 'עדכון אפשרויות',
  'config.options.remove': 'הסרת אפשרויות',
  'config.sla_target.set': 'קביעת יעד טיפול',
  'config.sla_target.remove': 'הסרת יעד טיפול',
  'config.statement.update': 'עדכון הצהרה',
  'config.system_reference.update': 'עדכון הגדרות מערכת',
  'config.restriction_impact': 'בדיקת השפעת הגבלה',
  'config.view': 'צפייה בהגדרות',
  'org.unit.create': 'יצירת יחידה',
  'org.unit.update': 'עדכון יחידה',
  'org.department.create': 'יצירת מחלקה',
  'org.department.update': 'עדכון מחלקה',
  'report.export': 'ייצוא דו"ח',
  'sync.conflict.detected': 'זוהתה התנגשות סנכרון',
  'sync.conflict.resolve': 'יישוב התנגשות',
  'sync.conflict.auto_resolve': 'יישוב התנגשות אוטומטי',
  'sync.outbound.manual_retry': 'שליחה חוזרת ידנית',
  'sync.outbound.retry': 'שליחה חוזרת',
  'audit.modify': 'ניסיון שינוי ההיסטוריה',
};

export const actionLabel = (action) => ACTION_LABEL[action] ?? action;

/** The action filter: a prefix the API matches with "starts with". */
export const ACTION_GROUPS = [
  { value: 'booking.', label: 'קריאות' },
  { value: 'user.', label: 'משתמשים והרשאות' },
  { value: 'config.', label: 'הגדרות תחום' },
  { value: 'org.', label: 'יחידות ומחלקות' },
  { value: 'sync.', label: 'סנכרון' },
  { value: 'report.', label: 'דו"חות' },
];

export const RESULT = {
  success: { label: 'בוצע', tone: 'ok' },
  denied: { label: 'נדחה', tone: 'bad' },
  failed: { label: 'נכשל', tone: 'bad' },
};

/** Field names inside before / after, for the details row. */
const FIELD_LABEL = {
  status_id: 'סטטוס',
  parked_status_id: 'סטטוס מושהה',
  version: 'גרסה',
  department_id: 'מחלקה',
  name: 'שם',
  value: 'ערך',
  permissions: 'הרשאות',
  roles: 'תפקידים',
  dates: 'תאריכים',
  minimum_advance_days: 'מינימום ימים מראש',
  hours: 'שעות',
  target_hours: 'יעד בשעות',
  is_editable: 'ניתן לעריכה',
  position: 'מיקום',
};
export const fieldLabel = (key) => FIELD_LABEL[key] ?? key;

/** The fields that differ between before and after (or all of whichever exists), as { key, before, after }. */
export function changedFields(before, after) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  return keys
    .map((key) => ({ key, before: before?.[key], after: after?.[key] }))
    .filter((row) => JSON.stringify(row.before) !== JSON.stringify(row.after));
}

/** What a row acted on, when it is not a booking or a person. */
export const ENTITY_LABEL = {
  audit_log: 'היסטוריית השינויים',
  booking: 'קריאה',
  booking_type: 'תחום',
  department: 'מחלקה',
  form: 'טופס',
  form_field: 'שדה בטופס',
  report: 'דו"ח',
  settings: 'הגדרות',
  sla_target: 'יעד טיפול',
  sync_file: 'קובץ סנכרון',
  system_reference: 'הגדרת מערכת',
  unit: 'יחידה',
  user: 'משתמש',
};

/** A list field (permissions, roles) as what was removed and what was added; null for any other field. */
export function listChange(change) {
  if (!Array.isArray(change.before) && !Array.isArray(change.after)) return null;
  const before = change.before ?? [];
  const after = change.after ?? [];
  return { removed: before.filter((item) => !after.includes(item)), added: after.filter((item) => !before.includes(item)) };
}
