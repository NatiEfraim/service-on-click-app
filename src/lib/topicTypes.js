/**
 * The booking types of the two request topics the website serves on its own - ביטחון מידע and תקשוב (the API's
 * SystemDomainEnum): opened here, handled here, never in the mobile app. Two of their kinds have a route of their own
 * (lib/routeTypes): the clearance grant (14) and the six תקשוב types (20-25, the service desk). The other two of
 * ביטחון מידע (15, 16) have no approval route: a user opens the request and one role - the קצין ביטחון מידע - handles it,
 * with no camp commander, no גורם מטפל / מפקד תחום / מימוש; that "one handler" reading is what the rest of this file is.
 */
import { hasOwnRoute, routeStatusLabel } from './routeTypes';

export const INFOSEC_TYPES = [14, 15, 16];
/** The six תקשוב types (installations, faults, user management); the "permissions" kinds (17-19) were removed. */
export const ICT_TYPES = [20, 21, 22, 23, 24, 25];

/** The topic a type belongs to (`infosec` / `ict`), or null for the service domains of the mobile app. */
export function topicOf(bookingTypeId) {
  const id = Number(bookingTypeId);
  if (INFOSEC_TYPES.includes(id)) return 'infosec';
  if (ICT_TYPES.includes(id)) return 'ict';
  return null;
}

/** A type of ביטחון מידע / תקשוב: opened on this website, handled here, never in the mobile app (no target, no sync). */
export const isTopicType = (bookingTypeId) => topicOf(bookingTypeId) !== null;

/**
 * The one role that handles a type of these topics (`infosec_officer` on 15 and 16), or null for any other type -
 * including a type with a route of its own, whose roles come from the route (lib/routeTypes: the clearance grant, the
 * service desk).
 */
export function topicHandlerRole(bookingTypeId) {
  if (hasOwnRoute(bookingTypeId)) return null;
  return topicOf(bookingTypeId) === 'infosec' ? 'infosec_officer' : null;
}

/** The handler of each topic, as people read it. */
const HANDLER_NAME = { infosec_officer: 'קצין ביטחון מידע' };

/** The name of the one role that handles a type of these topics (קצין ביטחון מידע), or null. */
export function topicHandlerName(bookingTypeId) {
  const role = topicHandlerRole(bookingTypeId);
  return role ? HANDLER_NAME[role] : null;
}

/**
 * A status as these topics read it: the API names its statuses for the approval route (an "order", a "technical
 * factor"), but here one handler takes the request from opening to closing. A route type names its shared statuses its
 * own way (lib/routeTypes: the desk's "הקריאה נשלחה", the clearance grant's refusal). null for any other type, or a
 * status the topics do not use - the API's own name stands then.
 */
export function topicStatusLabel(statusId, bookingTypeId) {
  if (hasOwnRoute(bookingTypeId)) return routeStatusLabel(statusId, bookingTypeId);
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

/** A route type's booking with its shared statuses named the route's way (status and history); the same object when nothing changes. */
function routeBooking(booking) {
  const typeId = booking.booking_type_id;
  const statusLabel = routeStatusLabel(booking.status_id, typeId);
  const history = Array.isArray(booking.history) ? booking.history.map((entry) => ({ entry, label: routeStatusLabel(entry.status_id, typeId) })) : null;
  if (!statusLabel && !history?.some((row) => row.label)) return booking;
  return {
    ...booking,
    topic_named: true,
    status_label: statusLabel ?? booking.status_label,
    ...(history ? { history: history.map(({ entry, label }) => (label ? { ...entry, status_label: label } : entry)) } : {}),
  };
}

/**
 * A management booking (GET bookings, GET bookings/{uuid}) as these topics read it: its status, stage, actions and
 * history named by its one handler instead of the approval route's roles. A route type keeps the server's stage and
 * actions (they are its own) and only names its shared statuses its way; any other booking is returned as it is - so is
 * one already read (safe to apply twice).
 */
export function topicBooking(booking) {
  if (!booking || booking.topic_named) return booking;
  if (hasOwnRoute(booking.booking_type_id)) return routeBooking(booking);
  const handler = topicHandlerName(booking.booking_type_id);
  if (!handler) return booking;
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
