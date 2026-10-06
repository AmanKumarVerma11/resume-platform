import type { NextConfig } from 'next';

// The routes that print PDFs with headless Chrome. Its binary is loaded at runtime, so tracing can't find it.
// Keys are globs, so brackets like [slug] can't be written literally: '/**/pdf' matches every PDF route.
const chromium = ['./node_modules/@sparticuz/chromium/bin/**/*'];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/mcp': chromium,
    '/**/pdf': chromium,
  },
};

export default nextConfig;
