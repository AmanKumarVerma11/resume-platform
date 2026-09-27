import { MongoClient, type Binary } from 'mongodb';
import type { ResumeData } from './resume-schema';

export type VersionDoc = {
  slug: string;
  number: number;
  content: ResumeData;
  contentHash: string;
  pdf: Binary;
  note?: string;
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
  };
}

export async function siteSettings() {
  const { settings } = await db();
  const doc = await settings.findOne({ _id: 'site' });
  return { primary: doc?.primary ?? null, inactive: doc?.inactive ?? [] };
}

export async function closeDb() {
  if (cache.mongo) await (await cache.mongo).close();
}

export async function latestVersion(slug: string, { withPdf = false } = {}) {
  const { versions } = await db();
  return versions.findOne({ slug }, { sort: { number: -1 }, projection: withPdf ? undefined : { pdf: 0 } });
}
