/**
 * The booking types of the two request topics that have no approval route of their own (the API's
 * BookingTypeHasRoleSeeder): a user opens the request and one role handles it - no camp commander, no גורם מטפל /
 * מפקד תחום / מימוש.
 */
export const INFOSEC_TYPES = [14, 15, 16];
export const ICT_TYPES = [17, 18, 19, 20, 21, 22, 23, 24, 25];

/** The one role that handles a type of these topics (`infosec_officer` / `ict_handler`), or null for any other type. */
export function topicHandlerRole(bookingTypeId) {
  const id = Number(bookingTypeId);
  if (INFOSEC_TYPES.includes(id)) return 'infosec_officer';
  if (ICT_TYPES.includes(id)) return 'ict_handler';
  return null;
}

/** The handler of each topic, as people read it. */
const HANDLER_NAME = { infosec_officer: 'קצין ביטחון מידע', ict_handler: 'מנהל תקשוב' };

/** The name of the one role that handles a type of these topics (קצין ביטחון מידע / מנהל תקשוב), or null. */
export function topicHandlerName(bookingTypeId) {
  const role = topicHandlerRole(bookingTypeId);
  return role ? HANDLER_NAME[role] : null;
}

/**
 * A status as these topics read it: the API names its statuses for the approval route (an "order", a "technical
 * factor"), but here one handler takes the request from opening to closing. null for any other type, or a status the
 * topics do not use - the API's own name stands then.
 */
export function topicStatusLabel(statusId, bookingTypeId) {
  const handler = topicHandlerName(bookingTypeId);
  if (!handler) return null;
  const labels = {
    1: 'הקריאה נשלחה',
    2: `בטיפול ${handler}`,
    15: `בטיפול ${handler}`,
    16: `בטיפול ${handler} - לקראת ביטול`,
    3: `אושרה ע"י ${handler}`,
    5: 'סיום טיפול',
    4: `נדחתה ע"י ${handler}`,
    7: `בוטלה ע"י ${handler}`,
    6: 'בוטלה ע"י המבקש',
  };
  return labels[Number(statusId)] ?? null;
}

/**
 * An action of these topics named without the roles they do not have (the API names its moves by the approval route:
 * "אישור והעברה למפקד התחום"…). By the status it leads to; null for a move these words do not cover.
 */
function topicActionLabel(statusId) {
  const labels = {
    15: 'העברה לאישור סופי',
    16: 'העברה לדחייה סופית',
    3: 'אישור סופי',
    4: 'דחייה סופית',
    7: 'ביטול',
    5: 'סיום טיפול',
  };
  return labels[Number(statusId)] ?? null;
}

/**
 * A management booking (GET bookings, GET bookings/{serial}) as these topics read it: its status, stage, actions and
 * history named by its one handler instead of the approval route's roles. Any other booking is returned as it is; so
 * is one already read (safe to apply twice).
 */
export function topicBooking(booking) {
  const handler = topicHandlerName(booking?.booking_type_id);
  if (!handler || booking.topic_named) return booking;
  const closed = booking.stage === 'closed';
  const statusLabel = topicStatusLabel(booking.status_id, booking.booking_type_id) ?? booking.status_label;
  return {
    ...booking,
    topic_named: true,
    status_label: statusLabel,
    stage_label: closed ? statusLabel : booking.stage === 'realization' ? 'מימוש וסגירה' : `בטיפול ${handler}`,
    actions: Array.isArray(booking.actions)
      ? booking.actions.map((action) => ({ ...action, label: topicActionLabel(action.status_id) ?? action.label }))
      : booking.actions,
    history: Array.isArray(booking.history)
      ? booking.history.map((entry) => ({ ...entry, status_label: topicStatusLabel(entry.status_id, booking.booking_type_id) ?? entry.status_label }))
      : booking.history,
  };
}
