/**
 * The `?next=` of the login page says where to go after signing in. It must stay on this site: `?next=//evil.example` (or
 * `/\evil.example`, or `/<TAB>/evil.example`, which a browser turns into `//evil.example` because it strips tabs and newlines
 * before parsing) would otherwise turn the login page into an open redirect. The URL parser is the judge, not string checks.
 */
export function safeNext(raw: string | null | undefined, origin: string): string {
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
