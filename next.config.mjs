/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.1.251'],
  // Produces .next/standalone/server.js — a minimal self-contained server we
  // can bundle inside the Electron desktop app.
  output: 'standalone',
  // Pin the tracing root to THIS folder so server.js lands directly in
  // .next/standalone/ (not nested under a subfolder).
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;

