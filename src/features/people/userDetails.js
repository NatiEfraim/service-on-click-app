/** Only populated directory fields are locked; missing fields use the draft. */
export function userDetails(person, draft) {
  const result = {};
  for (const [field, key] of [['firstName', 'first_name'], ['surname', 'surname'], ['phone', 'phone']]) {
    const value = typeof person?.[key] === 'string' ? person[key].trim() : '';
    result[field] = value || draft[field] || '';
    result[field + 'Locked'] = Boolean(value);
  }
  result.fullName = [result.firstName.trim(), result.surname.trim()].filter(Boolean).join(' ');
  return result;
}
