import type { AuditRow, BookingAuditRow } from './api/types';
import { fmtLongHours } from './format';
import { ROLE_NAME } from './labels';

/** A full audit row, or the shorter one embedded in a booking. */
export type AuditRowLike = BookingAuditRow & Partial<Pick<AuditRow, 'actor_type' | 'entity_id' | 'booking_serial' | 'unit_id' | 'booking_type_id'>>;

/** The booking the row is shown on. */
export interface AuditContext {
  serial?: number;
  bookingTypeId?: number;
}

/** Name lookups supplied by the session. */
export interface AuditNames {
  typeName: (bookingTypeId: number) => string;
  unitName: (unitId: number | null | undefined) => string;
  departmentName: (departmentId: number | null | undefined) => string | null;
  statusName?: (statusId: number) => string;
}

/** Target status id -> what the person did. */
const VERB: Record<number, string> = {
  3: 'אישר/ה סופית',
  4: 'דחה/תה',
  5: 'סגר/ה',
  7: 'ביטל/ה',
  8: 'העביר/ה להמתנה לקבצים',
  9: 'העביר/ה להמתנה לאישור ספק',
  10: 'העביר/ה להמתנה למספר ספק',
  11: 'אישר/ה כטופל ע"י הספר',
  13: 'ביטל/ה בשל שינוי זמנים',
  15: 'העביר/ה לאישור סופי',
  16: 'העביר/ה לביטול סופי',
  17: 'אישר/ה כרמ"ד תו"ב',
  18: 'דחה/תה כרמ"ד תו"ב',
};

/** Setting keys (`system_reference` values) in user-facing words. */
const SETTING_LABEL: Record<string, string> = {
  contact_phone: 'טלפון',
  start_time: 'משעה',
  end_time: 'עד שעה',
  stock_cars: 'רכבים',
  max: 'מקסימום',
  multiple_of: 'כפולות של',
  count_businsday: 'ימי עסקים',
  min: 'מינימום',
  cancellation_advance_days: 'ימים לביטול מראש',
  minimum_advance_days: 'ימים מינימום להזמנה מראש',
  max_advance_days: 'ימים מקסימום להזמנה מראש',
  haircut_time: 'דקות לתספורת',
  clean_time: 'דקות לניקיון',
  drivers_amount: 'נהגים',
  bookings_limit_time: 'שעות להגבלת הזמנות',
  dates: 'תאריכים חסומים',
};

/** Action names for refused attempts that have no sentence of their own. */
const ACTION_NOUN: Record<string, string> = {
  'booking.status_change': 'לשנות סטטוס של קריאה',
  'booking.values.update': 'לעדכן פרטים בקריאה',
  'booking.create': 'לפתוח קריאה חדשה',
  'config.view': 'לפתוח הגדרות תחום',
  'config.restriction_impact': 'לבדוק חסימת תאריכים',
  'config.sla_target.set': 'לקבוע יעד טיפול',
  'config.system_reference.update': 'לעדכן הגדרות תחום',
  'config.form_field.create': 'להוסיף שדה לטופס',
  'config.form_field.update': 'לעדכן שדה בטופס',
  'config.form_field.reorder': 'לשנות את סדר השדות בטופס',
  'config.form_field.archive': 'להסיר שדה מהטופס',
  'config.form_field.delete': 'למחוק שדה מהטופס',
  'config.form_field.editable': 'לשנות אם מאשר יכול לתקן שדה',
  'user.permissions.change': 'להקצות הרשאה',
  'user.department.change': 'לשנות מחלקה של משתמש',
  'org.unit.create': 'להוסיף יחידה',
  'org.unit.update': 'לעדכן יחידה',
  'org.department.create': 'להוסיף מחלקה',
  'org.department.update': 'לעדכן מחלקה',
  'sync.sync.view': 'לפתוח את מסך הסנכרון',
  'sync.sync.operate': 'להפעיל פעולת סנכרון',
  'sync.outbound.retry': 'לשלוח שוב קובץ לאפליקציה',
  'audit.modify': 'לשנות את היסטוריית השינויים',
};

/** Actions whose denied sentence is more specific than the generic one. */
const HAS_OWN_DENIED_SENTENCE = new Set(['booking.status_change', 'booking.values.update', 'booking.create', 'user.permissions.change', 'audit.modify']);

type Bag = Record<string, unknown> | unknown[] | null | undefined;

/** `before` / `after` may be `[]` (PHP serialises an empty array that way). */
function asRecord(bag: Bag): Record<string, unknown> {
  return bag && typeof bag === 'object' && !Array.isArray(bag) ? (bag as Record<string, unknown>) : {};
}

const text = (bag: Bag, key: string): string => {
  const value = asRecord(bag)[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

const num = (bag: Bag, key: string): number | null => {
  const value = asRecord(bag)[key];
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const flag = (bag: Bag, key: string): boolean | null => {
  const value = asRecord(bag)[key];
  return typeof value === 'boolean' ? value : null;
};

const list = (bag: Bag, key: string): unknown[] => {
  const value = asRecord(bag)[key];
  return Array.isArray(value) ? value : [];
};

const quote = (value: string): string => `"${value}"`;

/** `2026-12-27` -> `27.12.2026` (calendar day, no time zone). */
function showValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const raw = String(value);
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return day ? `${day[3]}.${day[2]}.${day[1]}` : raw;
}

/** Up to `max` items, then "ועוד N". */
function joinShort(items: string[], max = 3): string {
  if (items.length <= max) return items.join(', ');
  return `${items.slice(0, max).join(', ')} ועוד ${items.length - max}`;
}

function statusLabel(names: AuditNames, id: number | null): string {
  if (id === null) return 'לא ידוע';
  return names.statusName ? names.statusName(id) : `סטטוס ${id}`;
}

/** The person's name, or the automated process that acted. */
export function auditActor(row: Pick<AuditRowLike, 'actor_name' | 'actor_id' | 'source'> & Partial<Pick<AuditRow, 'actor_type'>>): string {
  if (row.actor_name) return row.actor_name;
  if (row.actor_id === 'sync:import') return 'תהליך הקליטה מהאפליקציה';
  if (row.actor_id === 'sync:export') return 'תהליך השליחה לאפליקציה';
  if (row.source === 'external') return 'האפליקציה';
  if (row.source === 'automation') return 'תהליך אוטומטי';
  if (row.actor_id && row.actor_type !== 'system') return `משתמש ${row.actor_id}`;
  return 'המערכת';
}

/** `user_N` is everyone's base permission and is skipped; the rest are `{role}_{booking type id}`. */
function permissionChange(before: unknown[], after: unknown[], names: AuditNames): string {
  const parse = (items: unknown[]) =>
    items
      .map((item) => /^(.*)_(\d+)$/.exec(String(item)))
      .filter((m): m is RegExpExecArray => m !== null && m[1] !== 'user')
      .map((m) => ({ role: m[1], type: Number(m[2]) }));
  const was = parse(before);
  const now = parse(after);
  const key = (p: { role: string; type: number }) => `${p.role}_${p.type}`;
  const describe = (items: typeof was): string => {
    const byRole = new Map<string, number[]>();
    for (const item of items) byRole.set(item.role, [...(byRole.get(item.role) ?? []), item.type]);
    return [...byRole.entries()]
      .map(([role, types]) => `${ROLE_NAME[role] ?? role} ${types.length <= 2 ? types.map((id) => names.typeName(id)).join(', ') : `ב-${types.length} תחומים`}`)
      .join('; ');
  };
  const added = now.filter((p) => !was.some((q) => key(q) === key(p)));
  const removed = was.filter((p) => !now.some((q) => key(q) === key(p)));
  const parts = [added.length ? `נוסף: ${describe(added)}` : '', removed.length ? `הוסר: ${describe(removed)}` : ''].filter(Boolean);
  return parts.join(' | ');
}

/** Option changes; the payload holds only changed options (`{ optionId: { name, parent_id } }`). */
function optionChanges(before: Bag, after: Bag, removing: boolean): string[] {
  const was = asRecord(before);
  const now = asRecord(after);
  const nameOf = (entry: unknown) => text(entry as Record<string, unknown>, 'name');
  const out: string[] = [];
  if (removing) {
    for (const entry of Object.values(was)) out.push(`הסיר/ה אפשרות ${quote(nameOf(entry))}`);
    return out;
  }
  for (const [id, entry] of Object.entries(now)) {
    const parent = (entry as Record<string, unknown> | null)?.parent_id;
    if (id in was) {
      const oldName = nameOf(was[id]);
      const newName = nameOf(entry);
      out.push(oldName !== newName ? `שינה/תה את שם האפשרות ${quote(oldName)} ל-${quote(newName)}` : `העביר/ה את האפשרות ${quote(newName)}`);
    } else {
      out.push(parent ? `הוסיף/ה תת-אפשרות ${quote(nameOf(entry))}` : `הוסיף/ה אפשרות ${quote(nameOf(entry))}`);
    }
  }
  for (const [id, entry] of Object.entries(was)) if (!(id in now)) out.push(`הסיר/ה אפשרות ${quote(nameOf(entry))}`);
  return out;
}

/** A changed value, or blocked dates that were added / removed. */
function settingChanges(before: Bag, after: Bag): string[] {
  const was = asRecord(before);
  const now = asRecord(after);
  const out: string[] = [];
  for (const key of Object.keys(now)) {
    const label = SETTING_LABEL[key] ?? key;
    const oldValue = was[key];
    const newValue = now[key];
    if (Array.isArray(newValue) || Array.isArray(oldValue)) {
      const oldList = (Array.isArray(oldValue) ? oldValue : []).map(String);
      const newList = (Array.isArray(newValue) ? newValue : []).map(String);
      const added = newList.filter((d) => !oldList.includes(d));
      const removed = oldList.filter((d) => !newList.includes(d));
      if (added.length) out.push(`נוספו ${label}: ${joinShort(added.map(showValue))}`);
      if (removed.length) out.push(`הוסרו ${label}: ${joinShort(removed.map(showValue))}`);
    } else {
      out.push(`${label} מ-${showValue(oldValue)} ל-${showValue(newValue)}`);
    }
  }
  return out;
}

function fieldChanges(before: Bag, after: Bag): { rename: string | null; others: string[] } {
  const oldName = text(before, 'field_display_name');
  const newName = text(after, 'field_display_name') || oldName;
  const others: string[] = [];
  const required = [flag(before, 'is_required'), flag(after, 'is_required')];
  if (required[0] !== null && required[1] !== null && required[0] !== required[1]) others.push(required[1] ? 'הוגדר כשדה חובה' : 'הוגדר כשדה רשות');
  const editable = [flag(before, 'editable'), flag(after, 'editable')];
  if (editable[0] !== null && editable[1] !== null && editable[0] !== editable[1]) others.push(editable[1] ? 'מאשר יכול לתקן אותו' : 'מאשר לא יכול לתקן אותו');
  const type = [num(before, 'field_type_id'), num(after, 'field_type_id')];
  if (type[0] !== null && type[1] !== null && type[0] !== type[1]) others.push('סוג השדה שונה');
  return { rename: oldName && newName !== oldName ? oldName : null, others };
}

/** One-sentence summary of an audit row; unknown actions fall back to "who: action". */
export function auditSentence(row: AuditRowLike, names: AuditNames, context: AuditContext = {}): string {
  const who = auditActor(row);
  const serial = row.booking_serial ?? context.serial ?? '';
  const typeId = row.booking_type_id ?? context.bookingTypeId ?? null;
  const inType = typeId ? ` (${names.typeName(typeId)})` : '';
  const denied = row.result === 'denied';
  const { before, after } = row;
  const target = row.entity_id != null ? String(row.entity_id) : '';

  // refused attempt: only the intent is known
  if (denied && ACTION_NOUN[row.action] && !HAS_OWN_DENIED_SENTENCE.has(row.action)) return `${who} ניסה/תה ${ACTION_NOUN[row.action]} ונחסם/ה`;

  switch (row.action) {
    case 'booking.status_change': {
      if (denied) return `${who} ניסה/תה לשנות את סטטוס קריאה ${serial}${inType} ונחסם/ה`;
      const to = num(after, 'status_id');
      const verb = to !== null && VERB[to] ? `${VERB[to]} את` : `שינה/תה ל"${statusLabel(names, to)}" את סטטוס`;
      return `${who} ${verb} קריאה ${serial}${inType}`;
    }
    case 'booking.values.update': {
      if (denied) return `${who} ניסה/תה לעדכן פרטים בקריאה ${serial}${inType} ונחסם/ה`;
      const now = asRecord(after);
      const was = asRecord(before);
      const changes = Object.keys(now).map((key) => (key in was ? `${key} מ-${showValue(was[key])} ל-${showValue(now[key])}` : `${key}: ${showValue(now[key])}`));
      return `${who} עדכן/ה בקריאה ${serial}${inType}${changes.length ? `: ${changes.join(', ')}` : ''}`;
    }
    case 'booking.create':
      return `${who} ניסה/תה לפתוח קריאה חדשה - הפעולה נחסמה (קריאות נפתחות באפליקציה בלבד)`;
    case 'booking.canceled_by_restriction':
      return `קריאה ${serial}${inType} בוטלה אוטומטית בעקבות חסימת תאריך`;

    case 'config.sla_target.set': {
      const hours = num(after, 'target_hours');
      const was = num(before, 'target_hours');
      const type = typeId ? names.typeName(typeId) : target;
      return `${who} קבע/ה יעד טיפול של ${fmtLongHours(hours)} לתחום ${type}${was !== null && was !== hours ? ` (קודם: ${fmtLongHours(was)})` : ''}`;
    }
    case 'config.sla_target.remove': {
      const was = num(before, 'target_hours');
      return `${who} הסיר/ה את יעד הטיפול של תחום ${typeId ? names.typeName(typeId) : target}${was !== null ? ` (היה: ${fmtLongHours(was)})` : ''}`;
    }
    case 'config.system_reference.update': {
      const changes = settingChanges(before, after);
      return `${who} עדכן/ה הגדרות תחום${inType}${changes.length ? `: ${joinShort(changes)}` : ''}`;
    }
    case 'config.options.update':
    case 'config.options.remove': {
      const changes = optionChanges(before, after, row.action === 'config.options.remove');
      return `${who} ${changes.length ? joinShort(changes, 2) : 'עדכן/ה אפשרויות בחירה'} בשדה בחירה בטופס${inType}`;
    }
    case 'config.statement.update': {
      const parts: string[] = [];
      const active = [flag(before, 'is_active'), flag(after, 'is_active')];
      if (active[1] !== null && active[0] !== active[1]) parts.push(active[1] ? 'הפעיל/ה את ההצהרה' : 'כיבה/תה את ההצהרה');
      if (text(before, 'statement') !== text(after, 'statement')) parts.push(Object.keys(asRecord(before)).length ? 'עדכן/ה את נוסח ההצהרה' : 'הוסיף/ה הצהרה');
      if (num(before, 'show_time') !== num(after, 'show_time') && Object.keys(asRecord(before)).length) parts.push('שינה/תה מתי ההצהרה מוצגת');
      return `${who} ${parts.length ? parts.join(' ו') : 'עדכן/ה את ההצהרה'}${inType}`;
    }
    case 'config.form_field.create':
      return `${who} הוסיף/ה לטופס את השדה ${quote(text(after, 'field_display_name'))}${inType}`;
    case 'config.form_field.update': {
      const name = text(after, 'field_display_name') || text(before, 'field_display_name');
      const { rename, others } = fieldChanges(before, after);
      const parts = [rename ? `שינה/תה את שם השדה ${quote(rename)} ל-${quote(name)}` : '', ...others.map((o) => `${quote(name)}: ${o}`)].filter(Boolean);
      return `${who} ${parts.length ? parts.join('; ') : `עדכן/ה את השדה ${quote(name)}`}${inType}`;
    }
    case 'config.form_field.editable':
      return `${who} ${flag(after, 'editable') ? 'איפשר/ה' : 'ביטל/ה את האפשרות'} למאשר לתקן שדה בטופס${inType}`;
    case 'config.form_field.archive':
      return `${who} הסיר/ה מהטופס את השדה ${quote(text(before, 'field_display_name'))}${inType} (הערכים בקריאות קיימות נשמרו)`;
    case 'config.form_field.delete':
      return `${who} מחק/ה מהטופס את השדה ${quote(text(before, 'field_display_name'))}${inType}`;
    case 'config.form_field.reorder':
      return `${who} שינה/תה את סדר השדות בטופס${inType}`;

    case 'user.create': {
      const unit = num(after, 'unit_id');
      return `${who} יצר/ה משתמש חדש: ${text(after, 'full_name') || target}${text(after, 'personal_number') ? ` (${text(after, 'personal_number')})` : ''}${unit ? ` ב${names.unitName(unit)}` : ''}`;
    }
    case 'user.permissions.change': {
      if (denied) return `${who} ניסה/תה להקצות הרשאה מחוץ לסמכות ונחסם/ה`;
      const change = permissionChange(list(before, 'permissions'), list(after, 'permissions'), names);
      return `${who} שינה/תה הרשאות למשתמש ${target}${change ? ` - ${change}` : ''}`;
    }
    case 'user.department.change': {
      const now = num(after, 'department_id');
      const was = num(before, 'department_id');
      const nowName = now !== null ? names.departmentName(now) : null;
      const wasName = was !== null ? names.departmentName(was) : null;
      return `${who} העביר/ה את המשתמש ${target} ${nowName ? `למחלקת ${nowName}` : 'ללא מחלקה'}${wasName ? ` (קודם: ${wasName})` : ''}`;
    }

    case 'org.unit.create':
      return `${who} הוסיף/ה את היחידה ${quote(text(after, 'name'))} (באות ${text(after, 'code')})`;
    case 'org.unit.update':
      return text(before, 'code') !== text(after, 'code')
        ? `${who} שינה/תה את האות של ${quote(text(after, 'name'))} מ-${text(before, 'code')} ל-${text(after, 'code')}`
        : `${who} שינה/תה את שם היחידה ${text(after, 'code')} מ-${quote(text(before, 'name'))} ל-${quote(text(after, 'name'))}`;
    case 'org.department.create':
      return `${who} הוסיף/ה את המחלקה ${quote(text(after, 'name'))} ב${names.unitName(row.unit_id)}`;
    case 'org.department.update': {
      const name = text(after, 'name') || text(before, 'name');
      if (flag(before, 'is_active') === true && flag(after, 'is_active') === false) return `${who} השבית/ה את המחלקה ${quote(name)}`;
      if (flag(before, 'is_active') === false && flag(after, 'is_active') === true) return `${who} הפעיל/ה מחדש את המחלקה ${quote(name)}`;
      return text(before, 'name') && text(before, 'name') !== name
        ? `${who} שינה/תה את שם המחלקה ${quote(text(before, 'name'))} ל-${quote(name)}`
        : `${who} עדכן/ה את המחלקה ${quote(name)}`;
    }

    case 'sync.conflict.detected': {
      const here = num(before, 'internal_status_id');
      const there = num(after, 'external_status_id');
      return `קריאה ${serial}${inType} שונתה במקביל באפליקציה - נדרשת הכרעה (כאן "${statusLabel(names, here)}", באפליקציה "${statusLabel(names, there)}")`;
    }
    case 'sync.conflict.resolve':
      return `${who} יישב/ה התנגשות בקריאה ${serial}${inType}: ${text(after, 'resolution') === 'keep_internal' ? 'נשמרה ההחלטה שהתקבלה כאן' : 'התקבל המצב באפליקציה'}`;
    case 'sync.conflict.auto_resolve':
      return text(after, 'resolution') === 'confirmed_by_mobile'
        ? `ההתנגשות בקריאה ${serial}${inType} נסגרה אוטומטית: האפליקציה אישרה את ההחלטה שהתקבלה כאן`
        : `ההתנגשות בקריאה ${serial}${inType} נסגרה אוטומטית: המצב באפליקציה גבר על ההחלטה שהתקבלה כאן`;
    case 'sync.outbound.manual_retry':
      return `${who} הפעיל/ה שליחה חוזרת של קובץ ${target} לאפליקציה`;
    case 'sync.outbound.blocked':
      return `קובץ ${target} לאפליקציה נחסם כי הוא מכיל שם פנימי של יחידה או מחלקה`;
    case 'sync.outbound.sent':
      return `נשלח קובץ ${target} לאפליקציה`;
    case 'sync.outbound.failed':
      return `שליחת קובץ ${target} לאפליקציה נכשלה`;
    case 'audit.modify':
      return `${who} ניסה/תה לשנות את היסטוריית השינויים ונחסם/ה`;

    default:
      if (denied) return `${who} ניסה/תה ${ACTION_NOUN[row.action] ?? `לבצע פעולה (${row.action})`} ונחסם/ה`;
      return `${who}: ${row.action}`;
  }
}

/** Icon family: the action prefix, or "denied" / "failed" by result. */
export function auditCategory(row: Pick<AuditRow, 'result' | 'action'>): string {
  if (row.result === 'denied') return 'denied';
  if (row.result === 'failed') return 'failed';
  return row.action.split('.')[0] || 'audit';
}

/** Filter families, as `action` prefixes the server understands. */
export const AUDIT_CATEGORIES = [
  { id: '', label: 'הכל' },
  { id: 'booking.', label: 'קריאות' },
  { id: 'config.', label: 'הגדרות וטופס' },
  { id: 'user.', label: 'הרשאות' },
  { id: 'org.', label: 'ארגון' },
  { id: 'sync.', label: 'סנכרון' },
] as const;

/** Shows a person's comment as written and translates the server's refusal codes; null when empty. */
export function auditReason(row: Pick<AuditRow, 'reason' | 'result'>, names?: Pick<AuditNames, 'statusName'>): string | null {
  const reason = row.reason?.trim();
  if (!reason) return null;
  if (row.result === 'success') return reason;

  const transition = /^transition (\d+)->(\d+) not allowed$/.exec(reason);
  if (transition) {
    const name = (id: string) => (names?.statusName ? names.statusName(Number(id)) : `סטטוס ${id}`);
    return `המעבר מ"${name(transition[1])}" ל"${name(transition[2])}" אינו מותר למשתמש בשלב זה`;
  }
  if (/^internal name in /.test(reason)) return 'הקובץ מכיל שם פנימי של יחידה או מחלקה';

  const codes: Record<string, string> = {
    no_permission: 'אין הרשאה לפעולה',
    not_visible: 'הקריאה אינה גלויה למשתמש',
    requester_only: 'ביטול על ידי המבקש מתבצע באפליקציה בלבד',
    not_allowed_at_stage: 'עדכון הפרטים אינו זמין בשלב הנוכחי של הקריאה',
    append_only: 'היסטוריית השינויים לקריאה בלבד',
    web_system_cannot_create_bookings: 'קריאות נפתחות באפליקציה בלבד',
    outside_admin_scope: 'ההרשאה מחוץ לתחומים וליחידה של המשתמש שהקצה אותה',
    self_grant: 'ניסיון להעניק הרשאה לעצמו',
  };
  return codes[reason] ?? reason;
}
