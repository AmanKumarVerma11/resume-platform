// The site's public address (PUBLIC_BASE_URL), used for links inside PDFs and for OAuth.
// "cv.example.com" is accepted too and treated as https.
export function baseUrl() {
  const url = process.env.PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if (!url) throw new Error('PUBLIC_BASE_URL is not set');
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}
