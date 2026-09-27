// Publishing a resume version: validate it, render its PDF, store both.
import { createHash, randomBytes } from 'node:crypto';
import { Binary } from 'mongodb';
import { printPdf } from './chrome';
import { db, latestVersion, type VersionDoc } from './db';
import { ResumeSchema, type ResumeData } from './resume-schema';
import { baseUrl } from './site';

// Top-level routes a resume name would clash with.
const RESERVED = new Set(['admin', 'api', 'go', 'fonts', 'privacy', 'terms', 'cookies', 'mcp', 'oauth', 'render']);
export const isValidSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug) && !RESERVED.has(slug);

// Renders the PDF for a version: links inside it point to /go/<slug>/<version>/<key>.
export type Renderer = (content: ResumeData, slug: string, version: number) => Promise<{ pdf: Buffer; overflowPx: number }>;

export type PublishResult =
  | { status: 'unchanged'; version: number }
  | { status: 'published'; version: number; pdfBytes: number; overflowPx: number };

export async function publishVersion(input: {
  slug: string;
  content: ResumeData;
  note?: string;
  source: NonNullable<VersionDoc['source']>;
  force?: boolean;
  render: Renderer;
}): Promise<PublishResult> {
  const content = ResumeSchema.parse(input.content); // also fixes key order, so the hash is stable
  const contentHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');

  const { versions, events, renderJobs } = await db();
  await Promise.all([
    versions.createIndex({ slug: 1, number: -1 }, { unique: true }),
    events.createIndex({ slug: 1, createdAt: -1 }),
    renderJobs.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  const latest = await latestVersion(input.slug);
  if (latest?.contentHash === contentHash && !input.force) return { status: 'unchanged', version: latest.number };

  const number = (latest?.number ?? 0) + 1;
  const { pdf, overflowPx } = await input.render(content, input.slug, number);
  await versions.insertOne({
    slug: input.slug,
    number,
    content,
    contentHash,
    pdf: new Binary(pdf),
    note: input.note,
    source: input.source,
    createdAt: new Date(),
  });
  return { status: 'published', version: number, pdfBytes: pdf.length, overflowPx };
}

// Server-side renderer: headless Chrome opens /render/<id>, a normal page of this site, and prints it.
// The job is short-lived, unguessable, and deleted as soon as the PDF exists.
export const renderWithSitePage: Renderer = async (content, slug, version) => {
  const id = randomBytes(32).toString('base64url');
  const { renderJobs } = await db();
  await renderJobs.insertOne({ _id: id, slug, version, content, expiresAt: new Date(Date.now() + 5 * 60 * 1000) });
  try {
    return await printPdf((page) => page.goto(`${baseUrl()}/render/${id}`, { waitUntil: 'networkidle0' }));
  } finally {
    await renderJobs.deleteOne({ _id: id });
  }
};
