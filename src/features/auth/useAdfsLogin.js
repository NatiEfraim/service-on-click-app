'use client';

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { ADFS_URL } from '@/lib/config';

/**
 * ADFS sign-in: a hidden iframe of `${ADFS_URL}/api/token` posts the user's token to this window; it is sent to the
 * API's /login, which sets the session cookie, and then `onSignedIn` runs. Messages from any other origin are ignored.
 * The iframe is added only after the listener is on: a frame in the page's HTML can answer before React has hydrated,
 * and that one message would be lost. Returns the state for the page ('off' when ADFS is not configured).
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

    const frame = document.createElement('iframe');
    frame.title = 'ADFS';
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:0;height:0;border:0';
    frame.src = `${ADFS_URL}/api/token`;
    document.body.append(frame);

    return () => {
      window.removeEventListener('message', onMessage);
      frame.remove();
    };
  }, []);

  return { state, error };
}
