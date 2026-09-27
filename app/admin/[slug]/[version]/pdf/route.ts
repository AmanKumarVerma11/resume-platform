import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { isOwner, OWNER_COOKIE } from '@/lib/owner';
import { pdfResponse } from '@/lib/pdf-response';

// Any stored version's PDF, for you only. Not counted as a download.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; version: string }> }) {
  if (!isOwner((await cookies()).get(OWNER_COOKIE)?.value)) return new Response('Unauthorized', { status: 401 });

  const { slug, version } = await params;
  const { versions } = await db();
  const doc = await versions.findOne({ slug, number: Number(version) });
  return doc ? pdfResponse(doc) : new Response('Not found', { status: 404 });
}
