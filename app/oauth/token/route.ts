import { corsPreflight, exchangeCode, oauthJson, refreshTokens } from '@/lib/oauth';

// Token endpoint. Only public clients (PKCE) are supported, so a client_secret, if sent, is ignored.
export async function POST(request: Request) {
  const form = new URLSearchParams(await request.text());
  const get = (name: string) => form.get(name) ?? undefined;
  const clientId = get('client_id') ?? basicAuthClientId(request);

  const result =
    get('grant_type') === 'authorization_code'
      ? await exchangeCode({
          code: get('code') ?? '',
          codeVerifier: get('code_verifier') ?? '',
          clientId,
          redirectUri: get('redirect_uri'),
          resource: get('resource'),
        })
      : get('grant_type') === 'refresh_token'
        ? await refreshTokens({ refreshToken: get('refresh_token') ?? '', clientId, resource: get('resource') })
        : ({ error: 'unsupported_grant_type' } as const);

  return 'error' in result ? oauthJson(result, 400) : oauthJson(result.tokens);
}

// Some clients send their client_id in an HTTP Basic header instead of the form.
function basicAuthClientId(request: Request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return undefined;
  return decodeURIComponent(Buffer.from(header.slice(6), 'base64').toString().split(':')[0]) || undefined;
}

export const OPTIONS = corsPreflight;
