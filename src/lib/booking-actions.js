/** Prioritize permitted final decisions without inventing or discarding API actions. */
export function bookingActions(actions) {
  const decisions = actions.filter((action) => [3, 4].includes(action.status_id));
  if (!decisions.length) return actions;
  return [...decisions.sort((a, b) => a.status_id - b.status_id), ...actions.filter((action) => ![3, 4].includes(action.status_id))];
}
