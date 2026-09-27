import { MongoClient, type Binary } from 'mongodb';
import type { ResumeData } from './resume-schema';

export type VersionDoc = {
  slug: string;
  number: number;
  content: ResumeData;
  contentHash: string;
  pdf: Binary;
  note?: string;
  source?: 'cli' | 'mcp'; // how it was published
  createdAt: Date;
};

export type EventType = 'view' | 'download' | 'print' | 'click';

export type EventDoc = {
  slug: string;
  version: number;
  type: EventType;
  target?: string; // link key, for clicks
  visitorId: string;
  ip: string | null;
  userAgent: string;
  country: string | null;
  city: string | null;
  isBot: boolean;
  createdAt: Date;
};

// Site-wide choices made in /admin: which resume the bare domain shows, and which are switched off.
export type SettingsDoc = { _id: 'site'; primary?: string; inactive?: string[] };

// A resume waiting to be printed to PDF by the server (see renderWithSitePage). Lives for minutes.
export type RenderJobDoc = { _id: string; slug: string; version: number; content: ResumeData; expiresAt: Date };

// OAuth for the MCP endpoint. Codes and tokens are stored as SHA-256 hashes, never in plain text.
export type OAuthClientDoc = { _id: string; clientName: string; redirectUris: string[]; createdAt: Date };
export type OAuthCodeDoc = {
  _id: string; // hash of the code
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string;
  expiresAt: Date;
};
export type OAuthTokenDoc = {
  _id: string; // hash of the token
  kind: 'access' | 'refresh';
  clientId: string;
  resource: string;
  expiresAt: Date;
  createdAt: Date;
};

// One client per process, reused across hot reloads.
const cache = globalThis as unknown as { mongo?: Promise<MongoClient> };

function client() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  cache.mongo ??= new MongoClient(uri).connect();
  return cache.mongo;
}

export async function db() {
  const database = (await client()).db(process.env.MONGODB_DB || 'resume');
  return {
    versions: database.collection<VersionDoc>('versions'),
    events: database.collection<EventDoc>('events'),
    settings: database.collection<SettingsDoc>('settings'),
    renderJobs: database.collection<RenderJobDoc>('render_jobs'),
    oauthClients: database.collection<OAuthClientDoc>('oauth_clients'),
    oauthCodes: database.collection<OAuthCodeDoc>('oauth_codes'),
    oauthTokens: database.collection<OAuthTokenDoc>('oauth_tokens'),
  };
}

export async function closeDb() {
  if (cache.mongo) await (await cache.mongo).close();
}

export async function latestVersion(slug: string, { withPdf = false } = {}) {
  const { versions } = await db();
  return versions.findOne({ slug }, { sort: { number: -1 }, projection: withPdf ? undefined : { pdf: 0 } });
}
