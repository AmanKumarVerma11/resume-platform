import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { baseUrl, createAuthCode, findClient, isMcpResource, redirectMatches } from '@/lib/oauth';
import { checkPassword, isOwner, OWNER_COOKIE } from '@/lib/owner';

export const metadata: Metadata = { title: 'Connect an app', robots: { index: false, follow: false } };

// The consent page an MCP app sends you to. Approving needs the admin password (or being signed in to /admin).
const FIELDS = ['response_type', 'client_id', 'redirect_uri', 'code_challenge', 'code_challenge_method', 'state', 'resource', 'scope'] as const;
type Params = Partial<Record<(typeof FIELDS)[number], string>>;

function withParams(url: string, params: Record<string, string | undefined>) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) if (value) target.searchParams.set(key, value);
  return target.toString();
}

const query = (p: Params) =>
  new URLSearchParams(Object.entries(p).filter((entry): entry is [string, string] => !!entry[1])).toString();

type Checked =
  | { kind: 'problem'; message: string } // shown here, never sent to an unverified address
  | { kind: 'error'; url: string } // sent back to the app's verified address
  | {
      kind: 'ok';
      client: { _id: string; clientName: string };
      redirectUri: string;
      codeChallenge: string;
      back: (error: string) => string;
    };

async function check(p: Params): Promise<Checked> {
  const client = p.client_id ? await findClient(p.client_id) : null;
  if (!client) return { kind: 'problem', message: 'This app is not registered. Start connecting it again from the app.' };
  if (!p.redirect_uri || !redirectMatches(client.redirectUris, p.redirect_uri)) {
    return {
      kind: 'problem',
      message: "This app's return address doesn't match what it registered, so it can't be connected.",
    };
  }
  const redirectUri = p.redirect_uri;
  const back = (error: string) => withParams(redirectUri, { error, state: p.state, iss: baseUrl() });
  if (p.response_type !== 'code') return { kind: 'error', url: back('unsupported_response_type') };
  if (!p.code_challenge || p.code_challenge_method !== 'S256') return { kind: 'error', url: back('invalid_request') };
  if (p.resource && !isMcpResource(p.resource)) return { kind: 'error', url: back('invalid_target') };
  return { kind: 'ok', client, redirectUri, codeChallenge: p.code_challenge, back };
}

const fromForm = (form: FormData): Params =>
  Object.fromEntries(FIELDS.map((field) => [field, form.get(field)?.toString() || undefined]));

async function approve(form: FormData) {
  'use server';
  const p = fromForm(form);
  const checked = await check(p);
  if (checked.kind === 'problem') redirect(`/oauth/authorize?${query(p)}`);
  if (checked.kind === 'error') redirect(checked.url);

  const signedIn = isOwner((await cookies()).get(OWNER_COOKIE)?.value);
  if (!signedIn && !checkPassword(form.get('password')?.toString() ?? '')) {
    redirect(`/oauth/authorize?${query(p)}&wrong_password=1`);
  }
  const code = await createAuthCode({
    clientId: checked.client._id,
    redirectUri: checked.redirectUri,
    codeChallenge: checked.codeChallenge,
  });
  redirect(withParams(checked.redirectUri, { code, state: p.state, iss: baseUrl() }));
}

async function deny(form: FormData) {
  'use server';
  const checked = await check(fromForm(form));
  if (checked.kind === 'ok') redirect(checked.back('access_denied'));
  if (checked.kind === 'error') redirect(checked.url);
  redirect('/');
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const p: Params = Object.fromEntries(
    FIELDS.map((field) => [field, typeof raw[field] === 'string' ? raw[field] : undefined]),
  );
  const checked = await check(p);
  if (checked.kind === 'error') redirect(checked.url);
  if (checked.kind === 'problem') {
    return (
      <>
        <h1>Can&rsquo;t connect this app</h1>
        <p>{checked.message}</p>
      </>
    );
  }

  const signedIn = isOwner((await cookies()).get(OWNER_COOKIE)?.value);
  const hidden = FIELDS.map((field) => p[field] && <input key={field} type="hidden" name={field} value={p[field]} />);
  return (
    <>
      <h1>Connect {checked.client.clientName}?</h1>
      <p>
        It will be able to read and edit your resumes on {new URL(baseUrl()).host}, publish new versions, choose which
        one is primary, and see your stats.
      </p>
      <p className="muted">After you allow it, you&rsquo;ll be sent back to {new URL(checked.redirectUri).host}.</p>
      <form action={approve}>
        {hidden}
        {!signedIn && (
          <input type="password" name="password" placeholder="Admin password" aria-label="Admin password" required autoFocus />
        )}
        <button type="submit">Allow</button>
      </form>
      {raw.wrong_password && <p className="error">Wrong password.</p>}
      <form action={deny} className="deny">
        {hidden}
        <button type="submit" className="secondary">
          Cancel
        </button>
      </form>
    </>
  );
}
