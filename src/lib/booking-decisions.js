const listeners = new Set();

/** Connect a mounted list to decisions made in the booking drawer. */
export function subscribeBookingDecisions(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether a mounted list will animate and refresh this successful decision. */
export function notifyBookingDecision(serial, outcome) {
  for (const listener of listeners) listener(serial, outcome);
  return listeners.size > 0;
}
