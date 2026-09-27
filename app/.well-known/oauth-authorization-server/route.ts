import { baseUrl, corsPreflight, oauthJson } from '@/lib/oauth';

// Authorization Server Metadata (RFC 8414): tells MCP apps where to register, log in and get tokens.
export function GET() {
  const base = baseUrl();
  return oauthJson({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    authorization_response_iss_parameter_supported: true,
  });
}

export const OPTIONS = corsPreflight;
