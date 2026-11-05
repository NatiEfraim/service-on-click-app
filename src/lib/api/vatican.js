import { ApiError } from './client';
import { PERSONAL_NUMBER_PATTERN } from '@/lib/patterns';

export function validateVaticanPerson(data, personalNumber) {
  if (!data || Array.isArray(data) || typeof data !== 'object'
    || typeof data.personal_number !== 'string' || !PERSONAL_NUMBER_PATTERN.test(data.personal_number)
    || data.personal_number !== personalNumber
    || !('full_name' in data) || (data.full_name !== null && typeof data.full_name !== 'string')
    || !('personal_id' in data) || (data.personal_id !== null && typeof data.personal_id !== 'string')) {
    throw new ApiError(502, 'שירות החיפוש לא החזיר פרטי משתמש תקינים. נסו שוב או פנו למנהל המערכת.');
  }
  return { ...data, full_name: data.full_name?.trim() || null };
}
