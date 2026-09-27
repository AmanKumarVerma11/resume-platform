// A minimal OAuth 2.1 authorization server for the MCP endpoint, with one user: the site owner.
// Apps register themselves (RFC 7591), the owner approves them with the admin password, and they
// get short-lived access tokens for /mcp only. PKCE (S256) is required.
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from './db';
import { baseUrl } from './site';

export { baseUrl };

const CODE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// The MCP endpoint is the OAuth "resource": tokens are only valid there.
export const mcpUrl = () => `${baseUrl()}/mcp`;

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const randomSecret = () => randomBytes(32).toString('base64url');

// Expired codes and tokens are deleted by MongoDB's TTL monitor. Expiry is still checked on every use.
let ttlIndexes: Promise<unknown> | undefined;
async function collections() {
  const c = await db();
  ttlIndexes ??= Promise.all([
    c.oauthCodes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.oauthTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]).catch((error) => {
    ttlIndexes = undefined;
    console.error('Could not create OAuth TTL indexes', error);
  });
  await ttlIndexes;
  return c;
}

// Redirect URIs must be https, or http on a loopback address (desktop and command-line apps).
function isAllowedRedirect(uri: string) {
  try {
    const url = new URL(uri);
    return !url.hash && (url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname)));
  } catch {
    return false;
  }
}

// Exact match, except that loopback redirects may use any port (RFC 8252).
export function redirectMatches(registered: string[], requested: string) {
  if (registered.includes(requested)) return true;
  if (!isAllowedRedirect(requested)) return false;
  const want = new URL(requested);
  if (want.protocol !== 'http:') return false;
  return registered.some((uri) => {
    const url = new URL(uri);
    return (
      url.protocol === 'http:' &&
      url.hostname === want.hostname &&
      url.pathname === want.pathname &&
      url.search === want.search
    );
  });
}

export const isMcpResource = (resource: string) => resource.replace(/\/$/, '') === mcpUrl();

const ClientMetadata = z.object({
  redirect_uris: z.array(z.string().max(500).refine(isAllowedRedirect)).min(1).max(10),
  client_name: z.string().max(100).optional(),
});

// Dynamic Client Registration (RFC 7591). Registering grants nothing: the owner still has to approve.
export async function registerClient(body: unknown) {
  const parsed = ClientMetadata.safeParse(body);
  if (!parsed.success) return null;
  const clientId = randomSecret();
  const clientName = parsed.data.client_name || 'Unnamed app';
  const createdAt = new Date();
  const { oauthClients } = await collections();
  await oauthClients.insertOne({ _id: clientId, clientName, redirectUris: parsed.data.redirect_uris, createdAt });
  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(createdAt.getTime() / 1000),
    client_name: clientName,
    redirect_uris: parsed.data.redirect_uris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  };
}

export async function findClient(clientId: string) {
  const { oauthClients } = await collections();
  return oauthClients.findOne({ _id: clientId });
}

export async function createAuthCode(grant: { clientId: string; redirectUri: string; codeChallenge: string }) {
  const code = randomSecret();
  const { oauthCodes } = await collections();
  await oauthCodes.insertOne({
    _id: hash(code),
    ...grant,
    resource: mcpUrl(),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

type TokenResult =
  | { error: 'invalid_request' | 'invalid_grant' | 'invalid_target' | 'unsupported_grant_type' }
  | { tokens: { access_token: string; token_type: 'Bearer'; expires_in: number; refresh_token: string } };

async function issueTokens(clientId: string, resource: string): Promise<TokenResult> {
  const access = randomSecret();
  const refresh = randomSecret();
  const now = Date.now();
  const { oauthTokens } = await collections();
  await oauthTokens.insertMany([
    { _id: hash(access), kind: 'access', clientId, resource, createdAt: new Date(now), expiresAt: new Date(now + ACCESS_TTL_MS) },
    { _id: hash(refresh), kind: 'refresh', clientId, resource, createdAt: new Date(now), expiresAt: new Date(now + REFRESH_TTL_MS) },
  ]);
  return {
    tokens: { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL_MS / 1000, refresh_token: refresh },
  };
}

// Authorization code grant. Codes are single-use: the lookup deletes them.
export async function exchangeCode(p: {
  code: string;
  codeVerifier: string;
  clientId?: string;
  redirectUri?: string;
  resource?: string;
}): Promise<TokenResult> {
  if (!p.code || !p.codeVerifier) return { error: 'invalid_request' };
  const { oauthCodes } = await collections();
  const grant = await oauthCodes.findOneAndDelete({ _id: hash(p.code) });
  if (!grant || grant.expiresAt < new Date()) return { error: 'invalid_grant' };
  if ((p.clientId && p.clientId !== grant.clientId) || (p.redirectUri && p.redirectUri !== grant.redirectUri)) {
    return { error: 'invalid_grant' };
  }
  if (createHash('sha256').update(p.codeVerifier).digest('base64url') !== grant.codeChallenge) {
    return { error: 'invalid_grant' };
  }
  if (p.resource && !isMcpResource(p.resource)) return { error: 'invalid_target' };
  return issueTokens(grant.clientId, grant.resource);
}

// Refresh token grant. Refresh tokens rotate: each one works once.
export async function refreshTokens(p: { refreshToken: string; clientId?: string; resource?: string }): Promise<TokenResult> {
  if (!p.refreshToken) return { error: 'invalid_request' };
  const { oauthTokens } = await collections();
  const old = await oauthTokens.findOneAndDelete({ _id: hash(p.refreshToken), kind: 'refresh' });
  if (!old || old.expiresAt < new Date() || (p.clientId && p.clientId !== old.clientId)) return { error: 'invalid_grant' };
  if (p.resource && !isMcpResource(p.resource)) return { error: 'invalid_target' };
  return issueTokens(old.clientId, old.resource);
}

export async function verifyAccessToken(token: string) {
  const { oauthTokens } = await collections();
  const doc = await oauthTokens.findOne({ _id: hash(token), kind: 'access' });
  return doc && doc.expiresAt > new Date() && isMcpResource(doc.resource) ? doc : null;
}

// Apps that can still refresh their access, for /admin.
export async function connectedApps() {
  const { oauthTokens, oauthClients } = await collections();
  const ids = await oauthTokens.distinct('clientId', { kind: 'refresh', expiresAt: { $gt: new Date() } });
  return oauthClients.find({ _id: { $in: ids } }, { sort: { createdAt: -1 } }).toArray();
}

// Signs every app out. They can reconnect, but you'll be asked to approve again.
export async function disconnectAllApps() {
  const { oauthTokens, oauthCodes } = await collections();
  await Promise.all([oauthTokens.deleteMany({}), oauthCodes.deleteMany({})]);
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const oauthJson = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });

export const corsPreflight = () => new Response(null, { status: 204, headers: CORS });
