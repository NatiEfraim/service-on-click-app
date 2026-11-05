import { expect, it } from 'vitest';
import { lookupState } from './vaticanLookup';
const number = '01234567';
const found = { isSuccess: true, data: { personal_number: number, full_name: 'ישראל ישראלי' } };

it('keeps details locked before a valid number has completed lookup', () => {
  expect(lookupState('', '', {}).ready).toBe(false);
  expect(lookupState('123456', '123456', {}).manual).toBe(false);
  expect(lookupState(number, number, { isFetching: true }).ready).toBe(false);
});
it('shows found details without allowing manual edits', () => {
  expect(lookupState(number, number, found)).toMatchObject({ person: found.data, ready: true, manual: false });
});
it('unlocks manual entry only on not found', () => {
  expect(lookupState(number, number, { isError: true, error: { status: 404 } })).toMatchObject({ ready: true, manual: true });
});
it.each([0, 400, 401, 403, 500, 503])('keeps details locked on failure %s', (status) => {
  expect(lookupState(number, number, { isError: true, error: { status } })).toMatchObject({ ready: false, manual: false });
});
it('ignores a previous number result while the edited number settles', () => {
  expect(lookupState('1234567', number, found)).toMatchObject({ person: null, ready: false, manual: false });
  expect(lookupState('1234567', number, { isError: true, error: { status: 404 } }).manual).toBe(false);
});
it('locks details during a new request even if a prior result is cached', () => {
  expect(lookupState(number, number, { isError: true, error: { status: 404 }, isFetching: true }).manual).toBe(false);
});
