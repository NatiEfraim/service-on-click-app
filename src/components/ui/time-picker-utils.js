export function timeParts(value) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value ?? '');
  return match && Number(match[1]) < 24 && Number(match[2]) < 60
    ? { hour: Number(match[1]), minute: Number(match[2]) }
    : { hour: 8, minute: 0 };
}
export const timeValue = (hour, minute) => String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
