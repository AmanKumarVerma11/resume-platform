import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler';
import { baseUrl, mcpUrl } from '@/lib/oauth';

// Protected Resource Metadata (RFC 9728) for /mcp. Apps check this path first, then the root one.
export const GET = (request: Request) =>
  protectedResourceHandler({ authServerUrls: [baseUrl()], resourceUrl: mcpUrl() })(request);

export const OPTIONS = metadataCorsOptionsRequestHandler();
