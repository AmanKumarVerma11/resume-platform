// The site's public address (PUBLIC_BASE_URL), used for links inside PDFs and for OAuth.
export function baseUrl() {
  const url = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!url) throw new Error('PUBLIC_BASE_URL is not set');
  return url;
}
