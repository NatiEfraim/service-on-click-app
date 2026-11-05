import { afterEach, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { http } from './client';
import { peopleApi } from './endpoints';

const adapter = http.defaults.adapter;
afterEach(() => { http.defaults.adapter = adapter; });

it('looks up with GET and keeps leading zeros and missing directory fields', async () => {
  http.defaults.adapter = async (config) => {
    expect(config.method).toBe('get');
    expect(config.url).toBe('/users/lookup-vatican');
    expect(config.params).toEqual({ personal_number: '01234567' });
    expect(config.data).toBeUndefined();
    return { data: { data: { personal_number: '01234567', personal_id: '001234567', full_name: null } }, status: 200, headers: {}, config };
  };
  expect(await peopleApi.lookupVatican('01234567')).toEqual({ personal_number: '01234567', personal_id: '001234567', full_name: null });
});

it.each([400, 403, 404, 503])('preserves status %s for lookup feedback', async (status) => {
  http.defaults.adapter = async (config) => {
    throw new AxiosError('failure', 'ERR_BAD_RESPONSE', config, null, { status, data: {}, headers: {}, config });
  };
  await expect(peopleApi.lookupVatican('01234567')).rejects.toMatchObject({ status });
});
it.each([[], {}, null, { personal_number: '01234567' }, { personal_number: '7654321', personal_id: null, full_name: 'ישראל ישראלי' }])('rejects invalid lookup records instead of reporting found: %j', async (data) => {
  http.defaults.adapter = async (config) => ({ data: { data }, status: 200, headers: {}, config });
  await expect(peopleApi.lookupVatican('01234567')).rejects.toMatchObject({ status: 502 });
});
