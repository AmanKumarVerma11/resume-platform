import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { registerTools } from '@/lib/mcp-tools';
import { verifyAccessToken } from '@/lib/oauth';

// The MCP endpoint (<PUBLIC_BASE_URL>/mcp). Every request needs an OAuth access token.
export const maxDuration = 60; // save_resume starts Chrome to render the PDF

const handler = createMcpHandler(registerTools, {
  serverInfo: { name: 'resume-platform', version: '1.0.0' },
});

const authed = withMcpAuth(
  handler,
  async (_request, bearerToken) => {
    const token = bearerToken && (await verifyAccessToken(bearerToken));
    if (!token) return undefined;
    return {
      token: bearerToken,
      clientId: token.clientId,
      scopes: [],
      expiresAt: Math.floor(token.expiresAt.getTime() / 1000),
      resource: new URL(token.resource),
    };
  },
  { required: true, resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp' },
);

export { authed as DELETE, authed as GET, authed as POST };
