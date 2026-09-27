import { db } from '@/lib/db';
import { recordEvent } from '@/lib/tracking';

// Called by <Tracker> on the resume page.
export async function POST(request: Request) {
  const { slug, version, type } = (await request.json().catch(() => null)) ?? {};
  if (typeof slug !== 'string' || typeof version !== 'number' || (type !== 'view' && type !== 'print')) {
    return new Response(null, { status: 400 });
  }

  const { versions } = await db();
  if (!(await versions.countDocuments({ slug, number: version }, { limit: 1 }))) {
    return new Response(null, { status: 404 });
  }

  await recordEvent(slug, version, type);
  return new Response(null, { status: 204 });
}
