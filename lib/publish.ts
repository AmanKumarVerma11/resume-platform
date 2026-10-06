// Publishing a resume version: validate the content and store it. PDFs are rendered on demand (lib/pdf.ts).
import { createHash } from 'node:crypto';
import { db, latestVersion, type VersionDoc } from './db';
import { ResumeSchema, type ResumeData } from './resume-schema';

// Top-level routes a resume name would clash with.
const RESERVED = new Set(['admin', 'api', 'go', 'fonts', 'privacy', 'terms', 'cookies', 'mcp', 'oauth', 'render']);
export const isValidSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug) && !RESERVED.has(slug);

export type PublishResult = { status: 'unchanged' | 'published'; version: number };

export async function publishVersion(input: {
  slug: string;
  content: ResumeData;
  note?: string;
  source: NonNullable<VersionDoc['source']>;
}): Promise<PublishResult> {
  const content = ResumeSchema.parse(input.content); // also fixes key order, so the hash is stable
  const contentHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');

  const { versions, events } = await db();
  await Promise.all([
    versions.createIndex({ slug: 1, number: -1 }, { unique: true }),
    events.createIndex({ slug: 1, createdAt: -1 }),
  ]);
  const latest = await latestVersion(input.slug);
  if (latest?.contentHash === contentHash) return { status: 'unchanged', version: latest.number };

  const number = (latest?.number ?? 0) + 1;
  await versions.insertOne({
    slug: input.slug,
    number,
    content,
    contentHash,
    note: input.note,
    source: input.source,
    createdAt: new Date(),
  });
  return { status: 'published', version: number };
}
