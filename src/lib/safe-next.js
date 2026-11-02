/** Restricts `?next=` to same-origin paths (open-redirect guard); the URL parser decides, not string checks. */
export function safeNext(raw, origin) {
  if (!raw || !raw.startsWith('/')) return '/';
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return '/';
    const path = `${url.pathname}${url.search}${url.hash}`;
    // never bounce back to the login page itself
    return url.pathname.startsWith('/login') ? '/' : path;
  } catch {
    return '/';
  }
}
