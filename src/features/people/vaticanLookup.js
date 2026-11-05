import { PERSONAL_NUMBER_PATTERN } from '@/lib/patterns';

/** Only a completed 404 for the current number permits manual entry. */
export function lookupState(number, settledNumber, query) {
  const valid = PERSONAL_NUMBER_PATTERN.test(number);
  const current = valid && number === settledNumber && !query.isFetching;
  const person = current && query.isSuccess ? query.data : null;
  const notFound = Boolean(current && query.isError && query.error.status === 404);
  return { valid, person, notFound, ready: Boolean(person) || notFound, manual: notFound };
}
