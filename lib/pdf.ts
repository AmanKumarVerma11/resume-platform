// PDFs are never stored. Each one is printed on demand from a version's content: headless Chrome opens
// that version's signed render page (app/render/[slug]/[version]) and prints it.
import { printPdf } from './chrome';
import type { VersionDoc } from './db';
import { renderSignature } from './owner';
import { baseUrl } from './site';

const renderUrl = (slug: string, version: number) =>
  `${baseUrl()}/render/${slug}/${version}?sig=${renderSignature(slug, version)}`;

const renderVersion = (slug: string, version: number) =>
  printPdf((page) => page.goto(renderUrl(slug, version), { waitUntil: 'networkidle0' }));

export async function pdfResponse(version: Pick<VersionDoc, 'slug' | 'number' | 'content'>) {
  const { pdf } = await renderVersion(version.slug, version.number);
  const fileName = `${version.content.basics.name.replace(/\s+/g, '_')}_Resume.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

// How many pixels a version runs past one page (0 if it fits), or null if Chrome couldn't check in time.
export async function pageOverflow(slug: string, version: number) {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 25_000));
  try {
    const result = await Promise.race([renderVersion(slug, version), timeout]);
    return result ? result.overflowPx : null;
  } catch {
    return null;
  }
}
