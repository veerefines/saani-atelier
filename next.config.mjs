/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The journey and keepsakes check which media files exist at request time.
  // On Vercel, ship those files with the server code too, or every check says "missing".
  outputFileTracingIncludes: {
    '/journey': ['./public/journey/**/*', './public/her/**/*'],
    '/home/**': ['./public/her/**/*'],
    '/wall/**': ['./public/her/**/*'],
    '/home': ['./public/her/**/*'],
    '/wall': ['./public/her/**/*'],
  },
  async headers() {
    return [
      // always fetch the newest service worker
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};
export default nextConfig;
