import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Signing in to /admin sets this cookie. It unlocks the dashboard and stops your own visits being counted.
export const OWNER_COOKIE = 'rv_owner';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
};

function adminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD is not set');
  return password;
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const checkPassword = (given: string) => safeEqual(given, adminPassword());

export const ownerToken = () => createHmac('sha256', adminPassword()).update('resume-owner').digest('hex');

export const isOwner = (cookieValue: string | undefined) => !!cookieValue && safeEqual(cookieValue, ownerToken());

export async function requireOwner() {
  if (!isOwner((await cookies()).get(OWNER_COOKIE)?.value)) redirect('/admin/login');
}
