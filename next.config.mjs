/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The journey and keepsakes check which media files exist at request time.
  // On Vercel, ship those files with the server code too, or every check says "missing".
  outputFileTracingIncludes: {
    '/journey': ['./public/journey/**/*'],
    '/home/**': ['./public/her/**/*'],
    '/wall/**': ['./public/her/**/*'],
    '/home': ['./public/her/**/*'],
    '/wall': ['./public/her/**/*'],
  },
  async headers() {
    return [
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
