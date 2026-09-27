import { corsPreflight, oauthJson, registerClient } from '@/lib/oauth';

// Dynamic Client Registration (RFC 7591).
export async function POST(request: Request) {
  const client = await registerClient(await request.json().catch(() => null));
  if (!client) {
    return oauthJson(
      { error: 'invalid_client_metadata', error_description: 'Send 1 to 10 https (or loopback http) redirect_uris.' },
      400,
    );
  }
  return oauthJson(client, 201);
}

export const OPTIONS = corsPreflight;
