
import { PERSONAL_NUMBER_PATTERN } from '@/lib/patterns';

export const FULL_NAME_MAX = 30;
export const PERSONAL_NUMBER_MAX = 8;
export const PHONE_LENGTH = 10;

const NAME_CHARS = /^[א-ת'\-\s]+$/u;
const PHONE = /^05\d{8}$/;






export function validateNewUser(input) {
  const errors = {};

  const name = input.fullName.trim();
  if (!name || name.length > FULL_NAME_MAX) errors.fullName = `שם מלא הוא שדה חובה ואינו יכול לעלות על ${FULL_NAME_MAX} תווים`;
  else if (!NAME_CHARS.test(name)) errors.fullName = 'שם מלא יכול להכיל אותיות בעברית בלבד';

  if (!PERSONAL_NUMBER_PATTERN.test(input.personalNumber.trim())) errors.personalNumber = 'מספר אישי אינו תקין';

  const phone = input.phone.trim();
  if (phone && !PHONE.test(phone)) errors.phone = 'מספר טלפון אינו תקין - יש להזין 10 ספרות המתחילות ב-05';

  return errors;
}

/** Keeps digits only, at most `max`. */
export function digitsOnly(value, max) {
  return value.replace(/\D/g, '').slice(0, max);
}

/** `unitId` only for the super admin: the server puts everybody else's new users in their own unit. */
export function toNewUserBody(input, choice) {
  const phone = input.phone.trim();
  return {
    personal_number: input.personalNumber.trim(),
    full_name: input.fullName.trim(),
    phone: phone || null,
    ...(choice.unitId !== undefined ? { unit_id: choice.unitId } : {}),
    department_id: choice.departmentId,
  };
}

/** Which form field a server validation error (`errors` of a 422) belongs to. */
export function fieldOfServerError(key) {
  switch (key) {
    case 'full_name':
      return 'fullName';
    case 'personal_number':
      return 'personalNumber';
    case 'phone':
      return 'phone';
    default:
      return null;
  }
}
