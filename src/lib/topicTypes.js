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
