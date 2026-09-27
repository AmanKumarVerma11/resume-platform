import { latestVersion, siteSettings } from '@/lib/db';
import { pdfResponse } from '@/lib/pdf-response';
import { recordEvent } from '@/lib/tracking';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { primary, inactive } = await siteSettings();
  if (inactive.includes(slug)) {
    return primary
      ? new Response(null, { status: 307, headers: { Location: `/${primary}/pdf` } })
      : new Response('Not found', { status: 404 });
  }

  const version = await latestVersion(slug, { withPdf: true });
  if (!version) return new Response('Not found', { status: 404 });

  await recordEvent(slug, version.number, 'download');
  return pdfResponse(version);
}
