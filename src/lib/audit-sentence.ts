import type { AuditRow, BookingAuditRow } from './api/types';
import { fmtLongHours } from './format';

/** A full audit row, or the shorter one embedded in a booking (no ids: the booking itself is the context). */
export type AuditRowLike = BookingAuditRow & Partial<Pick<AuditRow, 'actor_type' | 'entity_id' | 'booking_serial' | 'unit_id' | 'booking_type_id'>>;

/** What the surrounding screen already knows about the row (the booking it is shown on). */
export interface AuditContext {
  serial?: number;
  bookingTypeId?: number;
}

/** What the sentence builder needs to name things; the session provides all three. */
export interface AuditNames {
  typeName: (bookingTypeId: number) => string;
  unitName: (unitId: number | null | undefined) => string;
  departmentName: (departmentId: number | null | undefined) => string | null;
}

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

type Bag = Record<string, unknown> | null | undefined;
const text = (bag: Bag, key: string): string => {
  const value = bag?.[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

/**
 * One plain-language sentence for an audit row ("היסטוריית שינויים"). Unknown actions fall back to "who: action",
 * so a new server-side action never breaks the screen. The raw before / after values stay available on the row.
 */
export function auditSentence(row: AuditRowLike, names: AuditNames, context: AuditContext = {}): string {
  const who =
    row.actor_name ||
    (row.source === 'external' ? 'האפליקציה' : row.source === 'automation' ? 'תהליך אוטומטי' : row.actor_id ? `משתמש ${row.actor_id}` : 'המערכת');
  const serial = row.booking_serial ?? context.serial ?? '';
  const typeId = row.booking_type_id ?? context.bookingTypeId ?? null;
  const inType = typeId ? ` (${names.typeName(typeId)})` : '';
  const denied = row.result === 'denied';
  const { before, after } = row;
  const target = row.entity_id != null ? String(row.entity_id) : '';

  switch (row.action) {
    case 'booking.status_change': {
      const to = Number(after?.status_id);
      return denied ? `${who} ניסה/תה לשנות סטטוס של קריאה ${serial} ונחסם/ה` : `${who} ${VERB[to] ?? 'עדכן/ה סטטוס של'} את קריאה ${serial}`;
    }
    case 'booking.values.update': {
      if (denied) return `${who} ניסה/תה לעדכן פרטים בקריאה ${serial} ונחסם/ה`;
      const changes = after ? Object.entries(after).map(([key, value]) => `${key} ל-${String(value)}`) : [];
      return `${who} עדכן/ה בקריאה ${serial}${changes.length ? `: ${changes.join(', ')}` : ''}`;
    }
    case 'booking.create':
      return `${who} ניסה/תה לפתוח קריאה חדשה - הפעולה נחסמה (קריאות נפתחות באפליקציה בלבד)`;
    case 'booking.canceled_by_restriction':
      return `קריאה ${serial} בוטלה אוטומטית בעקבות חסימת תאריך`;

    case 'config.sla_target.set':
      return `${who} קבע/ה יעד טיפול של ${fmtLongHours(Number(after?.target_hours))} לתחום ${typeId ? names.typeName(typeId) : target}`;
    case 'config.sla_target.remove':
      return `${who} הסיר/ה את יעד הטיפול של תחום ${typeId ? names.typeName(typeId) : target}`;
    case 'config.system_reference.update':
      return `${who} עדכן/ה הגדרת תחום${inType}`;
    case 'config.options.update':
      return `${who} עדכן/ה אפשרויות בחירה${inType}`;
    case 'config.options.remove':
      return `${who} הסיר/ה אפשרות בחירה${inType}`;
    case 'config.statement.update':
      return `${who} עדכן/ה את ההצהרה${inType}`;
    case 'config.form_field.create':
      return `${who} הוסיף/ה לטופס את השדה "${text(after, 'field_display_name')}"${inType}`;
    case 'config.form_field.update': {
      const was = text(before, 'field_display_name');
      const now = text(after, 'field_display_name') || was;
      return `${who} עדכן/ה את השדה "${now}"${was && now !== was ? ` (קודם: "${was}")` : ''}`;
    }
    case 'config.form_field.editable':
      return `${who} שינה/תה אם מאשר יכול לתקן את השדה "${text(after, 'field_display_name') || text(before, 'field_display_name')}"`;
    case 'config.form_field.archive':
      return `${who} הסיר/ה מהטופס את השדה "${text(before, 'field_display_name')}" (הערכים בקריאות קיימות נשמרו)`;
    case 'config.form_field.delete':
      return `${who} מחק/ה מהטופס את השדה "${text(before, 'field_display_name')}"`;
    case 'config.form_field.reorder':
      return `${who} שינה/תה את סדר השדות בטופס${inType}`;

    case 'user.create':
      return `${who} יצר/ה משתמש חדש (${text(after, 'full_name') || target})`;
    case 'user.permissions.change':
      return denied ? `${who} ניסה/תה להקצות הרשאה מחוץ לסמכות ונחסם/ה` : `${who} שינה/תה הרשאות למשתמש ${target}`;
    case 'user.department.change': {
      const departmentId = after?.department_id;
      const name = typeof departmentId === 'number' ? names.departmentName(departmentId) : null;
      return `${who} העביר/ה את המשתמש ${target} ${name ? `למחלקת ${name}` : 'ללא מחלקה'}`;
    }

    case 'org.unit.create':
      return `${who} הוסיף/ה את היחידה "${text(after, 'name')}" (באות ${text(after, 'code')})`;
    case 'org.unit.update':
      return text(before, 'code') !== text(after, 'code')
        ? `${who} שינה/תה את האות של "${text(after, 'name')}" מ-${text(before, 'code')} ל-${text(after, 'code')}`
        : `${who} שינה/תה את שם היחידה ${text(after, 'code')} מ"${text(before, 'name')}" ל"${text(after, 'name')}"`;
    case 'org.department.create':
      return `${who} הוסיף/ה את המחלקה "${text(after, 'name')}" ב${names.unitName(row.unit_id)}`;
    case 'org.department.update':
      return before?.is_active === true && after?.is_active === false
        ? `${who} השבית/ה את המחלקה "${text(after, 'name')}"`
        : `${who} עדכן/ה את המחלקה "${text(after, 'name') || text(before, 'name')}"`;

    case 'sync.conflict.detected':
      return `קריאה ${serial} שונתה במקביל באפליקציה - נדרשת הכרעה`;
    case 'sync.conflict.resolve':
      return `${who} יישב/ה התנגשות בקריאה ${serial} (${after?.resolution === 'keep_internal' ? 'נשמרה ההחלטה שהתקבלה כאן' : 'התקבל המצב באפליקציה'})`;
    case 'sync.conflict.auto_resolve':
      return `ההתנגשות בקריאה ${serial} נסגרה אוטומטית`;
    case 'sync.outbound.manual_retry':
      return `${who} הפעיל/ה שליחה חוזרת של קובץ לאפליקציה`;
    case 'sync.outbound.blocked':
      return `קובץ לאפליקציה נחסם כי הוא מכיל שם פנימי של יחידה או מחלקה`;
    case 'audit.modify':
      return `${who} ניסה/תה לשנות את היסטוריית השינויים ונחסם/ה`;
    default:
      return `${who}: ${row.action}`;
  }
}

/** The icon family of an audit row: booking / config / user / org / sync / audit, or "denied" / "failed" for a refused or broken one. */
export function auditCategory(row: Pick<AuditRow, 'result' | 'action'>): string {
  if (row.result === 'denied') return 'denied';
  if (row.result === 'failed') return 'failed';
  return row.action.split('.')[0] || 'audit';
}
