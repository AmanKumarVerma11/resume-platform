import { isbot } from 'isbot';
import { cookies, headers } from 'next/headers';
import { db, type EventType } from './db';
import { COOKIE_OPTIONS, isOwner, OWNER_COOKIE } from './owner';

// Random per-browser ID, so repeat opens/downloads from the same browser count as one visitor.
const VISITOR_COOKIE = 'rv_id';

// Call from Route Handlers only (it may set a cookie). Your own visits are never recorded.
export async function recordEvent(slug: string, version: number, type: EventType, target?: string) {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  if (isOwner(jar.get(OWNER_COOKIE)?.value)) return;

  let visitorId = jar.get(VISITOR_COOKIE)?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    jar.set(VISITOR_COOKIE, visitorId, COOKIE_OPTIONS);
  }

  const userAgent = h.get('user-agent') ?? '';
  const city = h.get('x-vercel-ip-city'); // location headers exist only when deployed on Vercel
  const { events } = await db();
  await events.insertOne({
    slug,
    version,
    type,
    ...(target && { target }),
    visitorId,
    ip: h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip'),
    userAgent,
    country: h.get('x-vercel-ip-country'),
    city: city && decodeURIComponent(city),
    isBot: isbot(userAgent),
    createdAt: new Date(),
  });
}
