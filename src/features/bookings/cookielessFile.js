'use client';

import { useEffect, useState } from 'react';

/**
 * An attachment's address is a link straight to the file store (MinIO, e.g. http://localhost:9000/...). A browser sends a
 * host's cookies to every port of that host, so an <img> / <iframe> / link to it would carry the app's large login
 * cookies too - and the store refuses a request whose headers are that big ("MetadataTooLarge"). So the file is fetched
 * here without cookies (credentials: 'omit') and shown from memory (an object URL). Fetched once per address.
 */
const cache = new Map();

/**
 * Whether the file needs the cookie-less fetch at all: only when it sits on the site's own host (e.g. localhost and
 * localhost:9000), where the browser would send the site's cookies with it. On another host (a deployment's own store)
 * the cookies never go there, so the direct address is used as is - no extra request that the store's CORS would block.
 */
export function needsCookieless(url) {
  if (typeof window === 'undefined' || !url) return false;
  try {
    return new URL(url, window.location.href).hostname === window.location.hostname;
  } catch {
    return false;
  }
}

/** The file at `url` as an object URL, fetched without cookies (once per address); rejects when it cannot be fetched. */
export function fetchCookieless(url) {
  if (!cache.has(url)) {
    const loading = fetch(url, { credentials: 'omit' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
    // a failure is not kept: the next try fetches again
    loading.catch(() => cache.delete(url));
    cache.set(url, loading);
  }
  return cache.get(url);
}

/**
 * `{ src, failed }` for the file at `url`: `src` once it is in memory. When the cookie-less fetch fails - typically the
 * store does not allow this site to read it from code (CORS), as on a deployment where the store has its own address
 * and the cookie problem does not arise - `src` falls back to the direct address, which an <img> / <iframe> may load.
 * `failed` only when there is no address at all.
 */
export function useCookielessFile(url) {
  const [state, setState] = useState({ src: null, failed: false });
  useEffect(() => {
    if (!url) {
      setState({ src: null, failed: true });
      return undefined;
    }
    // on another host: the direct address only (one request)
    if (!needsCookieless(url)) {
      setState({ src: url, failed: false });
      return undefined;
    }
    let current = true;
    setState({ src: null, failed: false });
    fetchCookieless(url).then(
      (src) => current && setState({ src, failed: false }),
      () => current && setState({ src: url, failed: false }),
    );
    return () => {
      current = false;
    };
  }, [url]);
  return state;
}
