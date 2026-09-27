import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The Chromium binary the MCP endpoint prints PDFs with. It is loaded at runtime, so tracing can't find it.
  outputFileTracingIncludes: {
    '/mcp': ['./node_modules/@sparticuz/chromium/bin/**/*'],
  },
};

export default nextConfig;
