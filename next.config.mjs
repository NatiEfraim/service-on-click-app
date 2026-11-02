/**
 * Where the Laravel API (service-on-click-api) listens. The browser never talks to it directly: every `/api/*` request goes to this
 * Next.js server, which forwards it. One origin means no CORS, and the HttpOnly `ServOnClickAccessToken` cookie the API sets at login
 * just works (the app itself never sees or stores a token).
 */
const API_ORIGIN = (process.env.API_ORIGIN ?? 'http://localhost:8000').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
