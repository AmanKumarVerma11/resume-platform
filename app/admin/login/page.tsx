import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkPassword, COOKIE_OPTIONS, OWNER_COOKIE, ownerToken } from '@/lib/owner';

async function login(formData: FormData) {
  'use server';
  if (!checkPassword(String(formData.get('password') ?? ''))) redirect('/admin/login?error=1');
  (await cookies()).set(OWNER_COOKIE, ownerToken(), COOKIE_OPTIONS);
  redirect('/admin');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <h1>Sign in</h1>
      <form action={login}>
        <input type="password" name="password" placeholder="Admin password" aria-label="Admin password" required autoFocus />
        <button type="submit">Sign in</button>
      </form>
      {error && <p className="error">Wrong password.</p>}
      <p className="muted">Signing in on a device also stops your own visits on that device from being counted.</p>
    </>
  );
}
