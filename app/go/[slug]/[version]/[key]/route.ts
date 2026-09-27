import { db } from '@/lib/db';
import { findLink } from '@/lib/links';
import { recordEvent } from '@/lib/tracking';

// Links inside the PDF point here, so clicks from a downloaded PDF are counted.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; version: string; key: string }> },
) {
  const { slug, version, key } = await params;
  const { versions } = await db();
  const doc = await versions.findOne({ slug, number: Number(version) }, { projection: { content: 1, number: 1 } });
  const url = doc && findLink(doc.content, key);
  if (!doc || !url) return new Response('Not found', { status: 404 });

  await recordEvent(slug, doc.number, 'click', key);
  return new Response(null, { status: 302, headers: { Location: url } });
}
