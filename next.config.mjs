/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.251'],
  poweredByHeader: false,
  // Produces .next/standalone/server.js — a minimal self-contained server we
  // can bundle inside the Electron desktop app.
  output: 'standalone',
  // Pin the tracing root to THIS folder so server.js lands directly in
  // .next/standalone/ (not nested under a subfolder).
  outputFileTracingRoot: import.meta.dirname,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;

