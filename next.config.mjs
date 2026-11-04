/**
 * Where the Laravel API (service-on-click-api) listens. The browser never talks to it directly: every `/api/*` request goes to this
 * Next.js server, which forwards it. One origin means no CORS, and the HttpOnly `ServOnClickAccessToken` cookie the API sets at login
 * just works (the app itself never sees or stores a token).
 */
// Origin only (`http://host:port`): the rewrite below adds the API's own `/api` prefix, so a trailing `/api` - how the API's address
// is usually written - is dropped instead of turning every call into `/api/api/...`.
const API_ORIGIN = (process.env.API_ORIGIN ?? 'http://localhost:8000').replace(/\/+$/, '').replace(/\/api$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // SAMEORIGIN, not DENY: the booking viewer shows a PDF attachment in an iframe served from this same origin
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
