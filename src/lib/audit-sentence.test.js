import { describe, expect, it } from 'vitest';

import { auditActor, auditCategory, auditReason, auditSentence } from './audit-sentence';

const TYPES = { 1: 'רכב שיתופי', 3: 'ציוד גברים', 4: 'ציוד נשים', 8: 'הובלות', 11: 'מזון בתוך היחידה' };
const STATUSES = { 1: 'ההזמנה נשלחה', 3: 'ההזמנה אושרה', 4: 'נדחה ע"י גורם טכני', 15: 'הועברה לאישור סופי', 16: 'הועברה לביטול סופי', 6: 'בוטל ע"י משתמש' };
const names = {
  typeName: (id) => TYPES[id] ?? `תחום ${id}`,
  unitName: (id) => (id === 1 ? 'H' : `יחידה ${id}`),
  departmentName: (id) => ({ 3: 'לוגיסטיקה' })[id] ?? null,
  statusName: (id) => STATUSES[id] ?? `סטטוס ${id}`,
};

/** A row as `GET /audit` returns it; the tests say only what differs. */
function row(partial) {
  return {
    id: 1,
    occurred_at: '2026-11-01 14:16:15.038910',
    actor_type: 'user',
    actor_id: '99804761',
    actor_name: 'רועי סחייק',
    source: 'internal',
    entity_type: null,
    entity_id: null,
    booking_serial: null,
    unit_id: 1,
    booking_type_id: null,
    before: null,
    after: null,
    reason: null,
    result: 'success',
    correlation_id: null,
    ...partial,
  };
}
const sentence = (r) => auditSentence(r, names);

// Rows marked "real" are copied from the live audit log; the others follow the payloads the API code writes (AuditsConfigChanges etc.).
describe('bookings', () => {
  it('real: a vice approver passes a booking on to the final approval', () => {
    const r = row({ action: 'booking.status_change', actor_id: '99807387', actor_name: 'אופיר גולדברג', entity_type: 'booking', entity_id: '56031', booking_serial: 56031, booking_type_id: 4, before: { status_id: 1, version: 1 }, after: { status_id: 15, version: 2 } });
    expect(sentence(r)).toBe('אופיר גולדברג העביר/ה לאישור סופי את קריאה 56031 (ציוד נשים)');
  });

  it('real: the approver rejects (the comment is the reason, shown in its own column)', () => {
    const r = row({ action: 'booking.status_change', booking_serial: 54815, booking_type_id: 3, before: { status_id: 16, version: 1 }, after: { status_id: 4, version: 2 }, reason: 'חסר מידע בבקשה' });
    expect(sentence(r)).toBe('רועי סחייק דחה/תה את קריאה 54815 (ציוד גברים)');
    expect(auditReason(r)).toBe('חסר מידע בבקשה');
  });

  it('names the new status when the decision has no verb of its own', () => {
    const r = row({ action: 'booking.status_change', booking_serial: 7, after: { status_id: 6, version: 3 } });
    expect(sentence(r)).toBe('רועי סחייק שינה/תה ל"בוטל ע"י משתמש" את סטטוס קריאה 7');
  });

  it('a refused decision', () => {
    const r = row({ action: 'booking.status_change', result: 'denied', booking_serial: 9, reason: 'transition 15->3 not allowed' });
    expect(sentence(r)).toBe('רועי סחייק ניסה/תה לשנות את סטטוס קריאה 9 ונחסם/ה');
    expect(auditReason(r, names)).toBe('המעבר מ"הועברה לאישור סופי" ל"ההזמנה אושרה" אינו מותר למשתמש בשלב זה');
    expect(auditReason({ ...r, reason: 'requester_only' })).toBe('ביטול על ידי המבקש מתבצע באפליקציה בלבד');
    expect(auditReason({ ...r, reason: 'not_visible' })).toBe('הקריאה אינה גלויה למשתמש');
  });

  it('real: corrected date and time, old and new value', () => {
    const r = row({
      action: 'booking.values.update',
      booking_serial: 256420,
      booking_type_id: 1,
      before: { 'תאריך התחלה': '2026-12-27', 'שעת התחלה': '11:12', 'תאריך סיום': '2026-12-30' },
      after: { 'תאריך התחלה': '2026-12-20', 'שעת התחלה': '10:30', 'תאריך סיום': '2026-12-21' },
      reason: 'תיאום מחדש',
    });
    expect(sentence(r)).toBe('רועי סחייק עדכן/ה בקריאה 256420 (רכב שיתופי): תאריך התחלה מ-27.12.2026 ל-20.12.2026, שעת התחלה מ-11:12 ל-10:30, תאריך סיום מ-30.12.2026 ל-21.12.2026');
    expect(auditReason(r)).toBe('תיאום מחדש');
  });

  it('a refused correction', () => {
    expect(sentence(row({ action: 'booking.values.update', result: 'denied', booking_serial: 5, reason: 'not_allowed_at_stage' }))).toBe('רועי סחייק ניסה/תה לעדכן פרטים בקריאה 5 ונחסם/ה');
  });

  it('a new booking can only be opened in the app', () => {
    const r = row({ action: 'booking.create', result: 'denied', reason: 'web_system_cannot_create_bookings' });
    expect(sentence(r)).toBe('רועי סחייק ניסה/תה לפתוח קריאה חדשה - הפעולה נחסמה (קריאות נפתחות באפליקציה בלבד)');
    expect(auditReason(r)).toBe('קריאות נפתחות באפליקציה בלבד');
  });

  it('a blocked date cancels a booking by itself', () => {
    const r = row({ action: 'booking.canceled_by_restriction', source: 'automation', booking_serial: 88, booking_type_id: 8, reason: 'התאריך נחסם להזמנות: 2026-12-01' });
    expect(sentence(r)).toBe('קריאה 88 (הובלות) בוטלה אוטומטית בעקבות חסימת תאריך');
    expect(auditReason(r)).toBe('התאריך נחסם להזמנות: 2026-12-01');
  });
});

describe('configuration', () => {
  it('sets, changes and removes the handling target', () => {
    expect(sentence(row({ action: 'config.sla_target.set', entity_id: '1', booking_type_id: 1, before: null, after: { target_hours: 48, warn_ratio: 0.8 } }))).toBe('רועי סחייק קבע/ה יעד טיפול של 2 ימים לתחום רכב שיתופי');
    expect(sentence(row({ action: 'config.sla_target.set', entity_id: '1', booking_type_id: 1, before: { target_hours: '48.00', warn_ratio: '0.80' }, after: { target_hours: 24, warn_ratio: 0.8 } }))).toBe(
      'רועי סחייק קבע/ה יעד טיפול של 24 שעות לתחום רכב שיתופי (קודם: 2 ימים)',
    );
    expect(sentence(row({ action: 'config.sla_target.remove', entity_id: '1', booking_type_id: 1, before: { target_hours: 72, warn_ratio: 0.8 }, after: null }))).toBe('רועי סחייק הסיר/ה את יעד הטיפול של תחום רכב שיתופי (היה: 3 ימים)');
  });

  it('a refused target', () => {
    expect(sentence(row({ action: 'config.sla_target.set', result: 'denied', booking_type_id: 3, reason: 'no_permission' }))).toBe('רועי סחייק ניסה/תה לקבוע יעד טיפול ונחסם/ה');
  });

  it('settings of a booking type: values, and blocked dates added / removed', () => {
    expect(sentence(row({ action: 'config.system_reference.update', entity_type: 'system_reference', entity_id: '12', booking_type_id: 1, before: { stock_cars: 10 }, after: { stock_cars: 15 } }))).toBe('רועי סחייק עדכן/ה הגדרות תחום (רכב שיתופי): רכבים מ-10 ל-15');
    expect(
      sentence(row({ action: 'config.system_reference.update', booking_type_id: 8, before: { dates: ['2026-12-01'] }, after: { dates: ['2026-12-01', '2026-12-02', '2026-12-03'] } })),
    ).toBe('רועי סחייק עדכן/ה הגדרות תחום (הובלות): נוספו תאריכים חסומים: 02.12.2026, 03.12.2026');
    expect(sentence(row({ action: 'config.system_reference.update', booking_type_id: 8, before: { dates: ['2026-12-01'] }, after: { dates: [] } }))).toBe('רועי סחייק עדכן/ה הגדרות תחום (הובלות): הוסרו תאריכים חסומים: 01.12.2026');
  });

  it('real: a form field is created and deleted (the snapshot carries its name)', () => {
    const snapshot = { id: 106, field_name: 'int_7d396affdc95', unit_id: 1, booking_type_id: 11, field_display_name: 'בדיקה - בחירה זמנית', field_type_id: 5, is_required: false, editable: false, position: 1, version: 1, is_custom: true, options: ['אפשרות א', 'אפשרות ב'] };
    expect(sentence(row({ action: 'config.form_field.create', entity_type: 'form_field', entity_id: 'int_7d396affdc95', booking_type_id: 11, before: null, after: snapshot }))).toBe(
      'רועי סחייק הוסיף/ה לטופס את השדה "בדיקה - בחירה זמנית" (מזון בתוך היחידה)',
    );
    expect(sentence(row({ action: 'config.form_field.delete', entity_type: 'form_field', entity_id: 'int_7d396affdc95', booking_type_id: 11, before: snapshot, after: null }))).toBe(
      'רועי סחייק מחק/ה מהטופס את השדה "בדיקה - בחירה זמנית" (מזון בתוך היחידה)',
    );
    expect(sentence(row({ action: 'config.form_field.archive', booking_type_id: 11, before: snapshot, after: null }))).toBe(
      'רועי סחייק הסיר/ה מהטופס את השדה "בדיקה - בחירה זמנית" (מזון בתוך היחידה) (הערכים בקריאות קיימות נשמרו)',
    );
  });

  it('a form field is renamed, made required, made correctable', () => {
    const before = { field_display_name: 'תאריך', field_type_id: 3, is_required: false, editable: false };
    expect(sentence(row({ action: 'config.form_field.update', booking_type_id: 1, before, after: { ...before, field_display_name: 'תאריך התחלה' } }))).toBe('רועי סחייק שינה/תה את שם השדה "תאריך" ל-"תאריך התחלה" (רכב שיתופי)');
    expect(sentence(row({ action: 'config.form_field.update', booking_type_id: 1, before, after: { ...before, is_required: true, editable: true } }))).toBe(
      'רועי סחייק "תאריך": הוגדר כשדה חובה; "תאריך": מאשר יכול לתקן אותו (רכב שיתופי)',
    );
    expect(sentence(row({ action: 'config.form_field.update', booking_type_id: 1, before, after: before }))).toBe('רועי סחייק עדכן/ה את השדה "תאריך" (רכב שיתופי)');
  });

  it('the editable switch carries only the flag, so the sentence names the booking type', () => {
    expect(sentence(row({ action: 'config.form_field.editable', entity_id: 'int_5405820de102', booking_type_id: 1, before: { editable: false }, after: { editable: true } }))).toBe('רועי סחייק איפשר/ה למאשר לתקן שדה בטופס (רכב שיתופי)');
    expect(sentence(row({ action: 'config.form_field.editable', booking_type_id: 1, before: { editable: true }, after: { editable: false } }))).toBe('רועי סחייק ביטל/ה את האפשרות למאשר לתקן שדה בטופס (רכב שיתופי)');
  });

  it('the fields are put in another order', () => {
    expect(sentence(row({ action: 'config.form_field.reorder', entity_id: '1:1', booking_type_id: 1, before: { order: ['a', 'b'] }, after: { order: ['b', 'a'] } }))).toBe('רועי סחייק שינה/תה את סדר השדות בטופס (רכב שיתופי)');
  });

  it('real: options are added (the "before" of an empty list is [] not {}), renamed, removed', () => {
    const add = row({ action: 'config.options.update', entity_type: 'form_field', entity_id: '106', booking_type_id: 11, before: [], after: { '353': { name: 'אפשרות ג', parent_id: null } } });
    expect(sentence(add)).toBe('רועי סחייק הוסיף/ה אפשרות "אפשרות ג" בשדה בחירה בטופס (מזון בתוך היחידה)');
    const child = row({ action: 'config.options.update', booking_type_id: 11, before: [], after: { '355': { name: 'ילד', parent_id: 353 } } });
    expect(sentence(child)).toBe('רועי סחייק הוסיף/ה תת-אפשרות "ילד" בשדה בחירה בטופס (מזון בתוך היחידה)');
    const rename = row({ action: 'config.options.update', booking_type_id: 11, before: { '351': { name: 'אפשרות א', parent_id: null } }, after: { '351': { name: 'אפשרות א - שונתה', parent_id: null } } });
    expect(sentence(rename)).toBe('רועי סחייק שינה/תה את שם האפשרות "אפשרות א" ל-"אפשרות א - שונתה" בשדה בחירה בטופס (מזון בתוך היחידה)');
    const remove = row({ action: 'config.options.remove', booking_type_id: 11, before: { '355': { name: 'ילד', parent_id: 353 } }, after: [] });
    expect(sentence(remove)).toBe('רועי סחייק הסיר/ה אפשרות "ילד" בשדה בחירה בטופס (מזון בתוך היחידה)');
  });

  it('the statement of a booking type', () => {
    const s = { statement: 'אני מצהיר', is_active: true, show_time: 1 };
    expect(sentence(row({ action: 'config.statement.update', booking_type_id: 3, before: [], after: s }))).toBe('רועי סחייק הפעיל/ה את ההצהרה והוסיף/ה הצהרה (ציוד גברים)');
    expect(sentence(row({ action: 'config.statement.update', booking_type_id: 3, before: s, after: { ...s, statement: 'נוסח אחר' } }))).toBe('רועי סחייק עדכן/ה את נוסח ההצהרה (ציוד גברים)');
    expect(sentence(row({ action: 'config.statement.update', booking_type_id: 3, before: s, after: { ...s, is_active: false } }))).toBe('רועי סחייק כיבה/תה את ההצהרה (ציוד גברים)');
  });
});

describe('people and organisation', () => {
  it('real: roles are granted - the unchanged base permissions are left out', () => {
    const r = row({
      action: 'user.permissions.change',
      actor_id: '99810738',
      actor_name: 'נתנאל רפאל אפרים',
      entity_type: 'user',
      entity_id: '99807387',
      before: { permissions: ['user_1', 'user_10', 'user_11', 'user_13', 'user_2', 'user_3', 'user_4', 'user_5', 'user_8'] },
      after: { permissions: ['user_1', 'user_10', 'user_11', 'user_13', 'user_2', 'user_3', 'user_4', 'user_5', 'user_8', 'vice_approver_1', 'vice_approver_10', 'vice_approver_11', 'vice_approver_13', 'vice_approver_2', 'vice_approver_3', 'vice_approver_4', 'vice_approver_5', 'vice_approver_8'] },
      reason: 'משתמש בדיקה - גורם מטפל',
    });
    expect(sentence(r)).toBe('נתנאל רפאל אפרים שינה/תה הרשאות למשתמש 99807387 - נוסף: גורם מטפל ב-9 תחומים');
    expect(auditReason(r)).toBe('משתמש בדיקה - גורם מטפל');
  });

  it('a role is exchanged for another on one or two booking types', () => {
    const r = row({ action: 'user.permissions.change', entity_id: '99815386', before: { permissions: ['approver_1', 'approver_3'] }, after: { permissions: ['approver_1', 'vice_approver_3'] } });
    expect(sentence(r)).toBe('רועי סחייק שינה/תה הרשאות למשתמש 99815386 - נוסף: גורם מטפל ציוד גברים | הוסר: מפקד תחום ציוד גברים');
  });

  it('refused role grants say why', () => {
    const r = row({ action: 'user.permissions.change', result: 'denied', reason: 'self_grant' });
    expect(sentence(r)).toBe('רועי סחייק ניסה/תה להקצות הרשאה מחוץ לסמכות ונחסם/ה');
    expect(auditReason(r)).toBe('ניסיון להעניק הרשאה לעצמו');
    expect(auditReason({ ...r, reason: 'outside_admin_scope' })).toBe('ההרשאה מחוץ לתחומים וליחידה של המשתמש שהקצה אותה');
  });

  it('a user is created', () => {
    const r = row({ action: 'user.create', entity_id: '99800001', after: { personal_number: '99800001', full_name: 'דנה כהן', unit_id: 1, department_id: null } });
    expect(sentence(r)).toBe('רועי סחייק יצר/ה משתמש חדש: דנה כהן (99800001) בH');
  });

  it('a user moves between departments', () => {
    expect(sentence(row({ action: 'user.department.change', entity_id: '99800001', before: { department_id: null }, after: { department_id: 3 } }))).toBe('רועי סחייק העביר/ה את המשתמש 99800001 למחלקת לוגיסטיקה');
    expect(sentence(row({ action: 'user.department.change', entity_id: '99800001', before: { department_id: 3 }, after: { department_id: null } }))).toBe('רועי סחייק העביר/ה את המשתמש 99800001 ללא מחלקה (קודם: לוגיסטיקה)');
  });

  it('units: created, renamed, re-lettered', () => {
    expect(sentence(row({ action: 'org.unit.create', entity_id: '2', after: { code: 'N', name: 'NASA' } }))).toBe('רועי סחייק הוסיף/ה את היחידה "NASA" (באות N)');
    expect(sentence(row({ action: 'org.unit.update', entity_id: '2', before: { code: 'N', name: 'N' }, after: { code: 'N', name: 'NASA' } }))).toBe('רועי סחייק שינה/תה את שם היחידה N מ-"N" ל-"NASA"');
    expect(sentence(row({ action: 'org.unit.update', entity_id: '2', before: { code: 'N', name: 'NASA' }, after: { code: 'K', name: 'NASA' } }))).toBe('רועי סחייק שינה/תה את האות של "NASA" מ-N ל-K');
  });

  it('departments: created, renamed, switched off and on', () => {
    expect(sentence(row({ action: 'org.department.create', unit_id: 1, after: { name: 'לוגיסטיקה', is_active: true } }))).toBe('רועי סחייק הוסיף/ה את המחלקה "לוגיסטיקה" בH');
    expect(sentence(row({ action: 'org.department.update', before: { name: 'לוגיסטיקה', is_active: true }, after: { name: 'לוגיסטיקה', is_active: false } }))).toBe('רועי סחייק השבית/ה את המחלקה "לוגיסטיקה"');
    expect(sentence(row({ action: 'org.department.update', before: { name: 'לוגיסטיקה', is_active: false }, after: { name: 'לוגיסטיקה', is_active: true } }))).toBe('רועי סחייק הפעיל/ה מחדש את המחלקה "לוגיסטיקה"');
    expect(sentence(row({ action: 'org.department.update', before: { name: 'לוג', is_active: true }, after: { name: 'לוגיסטיקה', is_active: true } }))).toBe('רועי סחייק שינה/תה את שם המחלקה "לוג" ל-"לוגיסטיקה"');
  });
});

describe('sync with the app', () => {
  const system = { actor_type: 'system', actor_id: 'sync:import', actor_name: null, source: 'automation' };

  it('a conflict is found: both sides moved', () => {
    const r = row({ ...system, action: 'sync.conflict.detected', entity_type: 'booking', entity_id: '56031', booking_serial: 56031, booking_type_id: 4, before: { internal_status_id: 15 }, after: { external_status_id: 6 }, result: 'failed' });
    expect(sentence(r)).toBe('קריאה 56031 (ציוד נשים) שונתה במקביל באפליקציה - נדרשת הכרעה (כאן "הועברה לאישור סופי", באפליקציה "בוטל ע"י משתמש")');
  });

  it('a person settles it', () => {
    const base = { action: 'sync.conflict.resolve', booking_serial: 56031, booking_type_id: 4, before: { internal_status_id: 15, external_status_id: 6 }, reason: 'האפליקציה מעודכנת יותר' };
    expect(sentence(row({ ...base, after: { resolution: 'keep_internal', status_id: 15 } }))).toBe('רועי סחייק יישב/ה התנגשות בקריאה 56031 (ציוד נשים): נשמרה ההחלטה שהתקבלה כאן');
    expect(sentence(row({ ...base, after: { resolution: 'accept_external', status_id: 6 } }))).toBe('רועי סחייק יישב/ה התנגשות בקריאה 56031 (ציוד נשים): התקבל המצב באפליקציה');
  });

  it('the import settles it by itself', () => {
    const base = { ...system, action: 'sync.conflict.auto_resolve', booking_serial: 12, before: { internal_status_id: 15 } };
    expect(sentence(row({ ...base, after: { resolution: 'confirmed_by_mobile', status_id: 15 } }))).toBe('ההתנגשות בקריאה 12 נסגרה אוטומטית: האפליקציה אישרה את ההחלטה שהתקבלה כאן');
    expect(sentence(row({ ...base, after: { resolution: 'superseded_by_mobile', status_id: 6 } }))).toBe('ההתנגשות בקריאה 12 נסגרה אוטומטית: המצב באפליקציה גבר על ההחלטה שהתקבלה כאן');
  });

  it('files: sent again by hand, held back, sent, failed', () => {
    expect(sentence(row({ action: 'sync.outbound.manual_retry', entity_type: 'sync_file', entity_id: '7' }))).toBe('רועי סחייק הפעיל/ה שליחה חוזרת של קובץ 7 לאפליקציה');
    const blocked = row({ actor_type: 'system', actor_id: 'sync:export', actor_name: null, source: 'automation', action: 'sync.outbound.blocked', entity_id: '8', result: 'denied', reason: 'internal name in changes.0.data' });
    expect(sentence(blocked)).toBe('קובץ 8 לאפליקציה נחסם כי הוא מכיל שם פנימי של יחידה או מחלקה');
    expect(auditReason(blocked)).toBe('הקובץ מכיל שם פנימי של יחידה או מחלקה');
    expect(sentence(row({ action: 'sync.outbound.sent', entity_id: '9' }))).toBe('נשלח קובץ 9 לאפליקציה');
    expect(sentence(row({ action: 'sync.outbound.failed', entity_id: '9', result: 'failed' }))).toBe('שליחת קובץ 9 לאפליקציה נכשלה');
  });

  it('refused sync actions', () => {
    expect(sentence(row({ action: 'sync.outbound.retry', result: 'denied', reason: 'no_permission' }))).toBe('רועי סחייק ניסה/תה לשלוח שוב קובץ לאפליקציה ונחסם/ה');
    expect(sentence(row({ action: 'sync.sync.view', result: 'denied' }))).toBe('רועי סחייק ניסה/תה לפתוח את מסך הסנכרון ונחסם/ה');
  });
});

describe('the log itself, and anything new', () => {
  it('an attempt to change the history is refused and recorded', () => {
    const r = row({ action: 'audit.modify', result: 'denied', entity_type: 'audit_log', entity_id: '5', reason: 'append_only' });
    expect(sentence(r)).toBe('רועי סחייק ניסה/תה לשנות את היסטוריית השינויים ונחסם/ה');
    expect(auditReason(r)).toBe('היסטוריית השינויים לקריאה בלבד');
  });

  it('refused attempts of other kinds still read as a sentence', () => {
    expect(sentence(row({ action: 'config.view', result: 'denied' }))).toBe('רועי סחייק ניסה/תה לפתוח הגדרות תחום ונחסם/ה');
    expect(sentence(row({ action: 'org.unit.create', result: 'denied' }))).toBe('רועי סחייק ניסה/תה להוסיף יחידה ונחסם/ה');
    expect(sentence(row({ action: 'something.new', result: 'denied' }))).toBe('רועי סחייק ניסה/תה לבצע פעולה (something.new) ונחסם/ה');
  });

  it('an action the screen does not know falls back to "who: action"', () => {
    expect(sentence(row({ action: 'something.new' }))).toBe('רועי סחייק: something.new');
  });

  it('works for the short row embedded in a booking, with the booking as context', () => {
    const embedded = { occurred_at: '2026-11-01 14:16:15', actor_id: '99807387', actor_name: 'אופיר גולדברג', source: 'internal', action: 'booking.status_change', before: { status_id: 1 }, after: { status_id: 15 }, reason: null, result: 'success', correlation_id: null };
    expect(auditSentence(embedded, names, { serial: 56031, bookingTypeId: 4 })).toBe('אופיר גולדברג העביר/ה לאישור סופי את קריאה 56031 (ציוד נשים)');
  });
});

describe('who', () => {
  it('names the person, or the machine', () => {
    expect(auditActor({ actor_name: 'דנה', actor_id: '1', source: 'internal' })).toBe('דנה');
    expect(auditActor({ actor_name: null, actor_id: 'sync:import', source: 'automation', actor_type: 'system' })).toBe('תהליך הקליטה מהאפליקציה');
    expect(auditActor({ actor_name: null, actor_id: 'sync:export', source: 'automation', actor_type: 'system' })).toBe('תהליך השליחה לאפליקציה');
    expect(auditActor({ actor_name: null, actor_id: null, source: 'external' })).toBe('האפליקציה');
    expect(auditActor({ actor_name: null, actor_id: '99800009', source: 'internal', actor_type: 'user' })).toBe('משתמש 99800009');
    expect(auditActor({ actor_name: null, actor_id: null, source: 'internal', actor_type: 'system' })).toBe('המערכת');
  });
});

describe('category and reason', () => {
  it('groups by the first part of the action; a refused or failed row has its own icon', () => {
    expect(auditCategory({ action: 'booking.status_change', result: 'success' })).toBe('booking');
    expect(auditCategory({ action: 'config.sla_target.set', result: 'success' })).toBe('config');
    expect(auditCategory({ action: 'org.unit.create', result: 'success' })).toBe('org');
    expect(auditCategory({ action: 'sync.conflict.resolve', result: 'success' })).toBe('sync');
    expect(auditCategory({ action: 'booking.create', result: 'denied' })).toBe('denied');
    expect(auditCategory({ action: 'sync.conflict.detected', result: 'failed' })).toBe('failed');
  });

  it('leaves a person comment alone, even one that looks like a code', () => {
    expect(auditReason({ reason: 'no_permission', result: 'success' })).toBe('no_permission');
    expect(auditReason({ reason: null, result: 'denied' })).toBeNull();
    expect(auditReason({ reason: '  ', result: 'denied' })).toBeNull();
    expect(auditReason({ reason: 'something unexpected', result: 'denied' })).toBe('something unexpected');
  });
});

describe('the clearance grant (the requester portal, the handler, the scheduler)', () => {
  it('a request submitted on the portal, and the blocked management attempt as before', () => {
    expect(sentence(row({ action: 'booking.create', source: 'web', booking_serial: 919704, booking_type_id: 14, after: { status_id: 101 } }))).toBe('רועי סחייק פתח/ה קריאה חדשה 919704 (תחום 14)');
    expect(sentence(row({ action: 'booking.create', result: 'denied', reason: 'web_system_cannot_create_bookings' }))).toContain('נחסמה');
  });

  it('a handler assigned, cleared, or refused', () => {
    expect(sentence(row({ action: 'booking.handler_change', booking_serial: 5, booking_type_id: 14, after: { handler_user_id: 3, handler_name: 'מיכל ברק' } }))).toBe('רועי סחייק הקצה/תה את מיכל ברק כמטפל/ת בקריאה 5 (תחום 14)');
    expect(sentence(row({ action: 'booking.handler_change', booking_serial: 5, after: { handler_user_id: null, handler_name: null } }))).toBe('רועי סחייק ביטל/ה את הקצאת המטפל בקריאה 5');
    const denied = row({ action: 'booking.handler_change', result: 'denied', booking_serial: 5, reason: 'not_an_assigner' });
    expect(sentence(denied)).toBe('רועי סחייק ניסה/תה להקצות מטפל לקריאה 5 ונחסם/ה');
    expect(auditReason(denied)).toBe('הפעולה אינה זמינה למשתמש בשלב הנוכחי של הקריאה');
  });

  it('the route\'s moves, by a person or by the scheduler', () => {
    expect(sentence(row({ action: 'booking.status_change', booking_serial: 7, after: { status_id: 104 } }))).toBe('רועי סחייק העביר/ה לקבלת הכשר את קריאה 7');
    expect(sentence(row({ action: 'booking.status_change', actor_name: null, actor_id: null, source: 'system', booking_serial: 7, after: { status_id: 103 } }))).toBe('המערכת סימן/ה כתוחקר/ת את קריאה 7');
  });

  it('a person lookup names no number', () => {
    expect(sentence(row({ action: 'person.lookup', booking_type_id: 14 }))).toBe('רועי סחייק איתר/ה פרטי אדם לפי תעודת זהות (תחום 14)');
  });
});
