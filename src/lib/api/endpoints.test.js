import { describe, expect, it } from 'vitest';
import { http } from './client';
import { authApi } from './endpoints';

/** Records the request the call would send instead of sending it. */
async function sentBy(call) {
  let sent = null;
  const adapter = http.defaults.adapter;
  http.defaults.adapter = async (config) => {
    sent = { method: config.method, url: config.url, body: JSON.parse(config.data) };
    return { data: {}, status: 201, statusText: 'Created', headers: {}, config };
  };
  try {
    await call();
  } finally {
    http.defaults.adapter = adapter;
  }
  return sent;
}

describe('authApi', () => {
  it('logs in locally with the personal number only', async () => {
    expect(await sentBy(() => authApi.login('9810738'))).toEqual({ method: 'post', url: '/login', body: { personal_number: '9810738' } });
  });

  it('logs in through ADFS by sending the token ADFS handed the page, and nothing else', async () => {
    expect(await sentBy(() => authApi.loginWithToken('token-from-adfs'))).toEqual({ method: 'post', url: '/login', body: { token: 'token-from-adfs' } });
  });
});
