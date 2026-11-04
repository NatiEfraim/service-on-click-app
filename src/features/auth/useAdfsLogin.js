'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { ADFS_URL } from '@/lib/config';

/**
 * ADFS sign-in: the hidden iframe of `${ADFS_URL}/api/token` posts the user's token to this window; it is sent to the
 * API's /login, which sets the session cookie, and then `onSignedIn` runs. Messages from any other origin are ignored.
 * Returns the iframe's src (null when ADFS is off) and the state for the page.
 */
export function useAdfsLogin(onSignedIn) {
  const [state, setState] = useState(ADFS_URL ? 'waiting' : 'off');
  const [error, setError] = useState('');
  const done = useRef(false);
  const signedIn = useRef(onSignedIn);
  useEffect(() => {
    signedIn.current = onSignedIn;
  });

  useEffect(() => {
    if (!ADFS_URL) return;
    const origin = new URL(ADFS_URL).origin;
    const onMessage = async (event) => {
      if (event.origin !== origin || typeof event.data !== 'string' || !event.data || done.current) return;
      done.current = true;
      setState('signing-in');
      try {
        await authApi.loginWithToken(event.data);
        signedIn.current();
      } catch (e) {
        done.current = false;
        setError(e instanceof ApiError ? e.message : 'ההתחברות נכשלה.');
        setState('failed');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return { src: ADFS_URL ? `${ADFS_URL}/api/token` : null, state, error };
}
