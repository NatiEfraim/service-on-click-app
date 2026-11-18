/** Hebrew names for the audit log's actions, filter groups and results (the API stores English keys). */

export const ACTION_LABEL = {
  'booking.status_change': 'שינוי סטטוס קריאה',
  'booking.values.update': 'תיקון ערכי קריאה',
  'booking.create': 'פתיחת קריאה',
  'booking.handler_change': 'הקצאת מטפל',
  'person.lookup': 'איתור פרטים לפי ת"ז',
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
  { value: 'person.', label: 'איתור פרטים' },
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

/** Records this close together, by the same person on the same person with the same reason, came from one save. */
const ONE_SAVE_MS = 15_000;

/**
 * One save in the permissions dialog sends the domain roles and the camp-commander roles as two requests, so the log
 * holds two records. Rows come newest first; neighbours from one save become one row, from the oldest "before" to the
 * newest "after".
 */
export function mergeOneSave(rows) {
  const merged = [];
  for (const row of rows) {
    const newer = merged[merged.length - 1];
    // one save is at most two requests, so a row already merged takes no third: separate saves seconds apart never chain
    const sameSave =
      newer &&
      !newer.mergedSave &&
      row.action === 'user.permissions.change' &&
      newer.action === row.action &&
      newer.result === row.result &&
      newer.actor_id === row.actor_id &&
      newer.entity_id === row.entity_id &&
      (newer.reason ?? '') === (row.reason ?? '') &&
      Math.abs(new Date(newer.occurred_at).getTime() - new Date(row.occurred_at).getTime()) <= ONE_SAVE_MS;
    if (sameSave) {
      // this row is older: its "before" is where the save started; the newer row's "after" is where it ended
      // (both records hold the full permission list, so the newer "after" is the whole end state); the time stays the newer one
      merged[merged.length - 1] = { ...newer, mergedSave: true, before: { ...newer.before, ...row.before }, after: { ...row.after, ...newer.after } };
    } else {
      merged.push(row);
    }
  }
  return merged;
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
