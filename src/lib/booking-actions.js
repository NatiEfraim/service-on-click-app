/** Prefer the final approval only when the API explicitly permits it. */
export function bookingActions(actions) {
  const finalApproval = actions.find((action) => action.status_id === 3);
  if (!finalApproval) return actions;
  return [finalApproval, ...actions.filter((action) => ![3, 15, 17].includes(action.status_id))];
}
