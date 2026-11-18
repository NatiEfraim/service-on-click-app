import { hasOwnRoute } from './routeTypes';

/** Prioritize permitted final decisions without inventing or discarding API actions. */
export function bookingActions(actions) {
  const decisions = actions.filter((action) => [3, 4].includes(action.status_id));
  if (!decisions.length) return actions;
  return [...decisions.sort((a, b) => a.status_id - b.status_id), ...actions.filter((action) => ![3, 4].includes(action.status_id))];
}

/**
 * The buttons of a booking, in the order to draw them: the approval route's final decisions first (bookingActions); a
 * route type's moves (lib/routeTypes) exactly as the server lists them - forward, then back, then the refusal.
 */
export function orderedActions(booking) {
  const actions = Array.isArray(booking?.actions) ? booking.actions : [];
  return hasOwnRoute(booking?.booking_type_id) ? actions : bookingActions(actions);
}

/** Barber answers update a row in place; the active list filter decides whether it stays. */
export function isBarberDecision(booking, action) {
  return Number(booking.booking_type_id) === 5 && [11, 12].includes(Number(action.status_id));
}
