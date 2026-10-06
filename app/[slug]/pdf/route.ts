import { latestVersion } from '@/lib/db';
import { pdfResponse } from '@/lib/pdf';
import { siteSettings } from '@/lib/settings';
import { recordEvent } from '@/lib/tracking';

export const maxDuration = 60; // the PDF is printed by headless Chrome on each download

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { primary, inactive } = await siteSettings();
  if (inactive.includes(slug)) {
    return primary
      ? new Response(null, { status: 307, headers: { Location: `/${primary}/pdf` } })
      : new Response('Not found', { status: 404 });
  }

  const version = await latestVersion(slug);
  if (!version) return new Response('Not found', { status: 404 });

  await recordEvent(slug, version.number, 'download');
  return pdfResponse(version);
}
