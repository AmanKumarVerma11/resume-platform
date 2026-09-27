// Publishes resumes/<slug>.json as a new version: validates it, renders the PDF with your local
// Chrome, and stores both in MongoDB. Nothing is published if the content hasn't changed, unless
// you pass --force (e.g. after changing the template, CSS or fonts). Settings come from .env.local,
// or from --env <file> (e.g. .env.prod.local to publish to the production database).
//
//   npm run publish-resume -- <slug> [--note "what changed"] [--force] [--env <file>]
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Binary } from 'mongodb';
import { chromium } from 'playwright-core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import { Resume } from '../components/Resume';
import { closeDb, db, latestVersion } from '../lib/db';
import { ResumeSchema, type ResumeData } from '../lib/resume-schema';

// Top-level routes a slug would clash with.
const RESERVED = new Set(['admin', 'api', 'go', 'fonts', 'privacy', 'terms', 'cookies']);
const PAGE_HEIGHT_PX = 11 * 96; // US Letter at 96 CSS px per inch

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { note: { type: 'string' }, force: { type: 'boolean' }, env: { type: 'string' } },
  });
  if (values.env && !existsSync(values.env)) throw new Error(`Env file not found: ${values.env}`);
  const envFile = values.env ?? '.env.local';
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const slug = positionals[0];
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || RESERVED.has(slug)) {
    throw new Error(
      'Usage: npm run publish-resume -- <slug> [--note "..."] [--force] [--env <file>]  (slug: lowercase letters, digits, dashes)',
    );
  }
  const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) throw new Error('PUBLIC_BASE_URL is not set (links inside the PDF point there)');

  const parsed = ResumeSchema.safeParse(JSON.parse(readFileSync(`resumes/${slug}.json`, 'utf8')));
  if (!parsed.success) throw new Error(`resumes/${slug}.json is invalid:\n${z.prettifyError(parsed.error)}`);
  const content = parsed.data;
  const contentHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');

  const { versions, events } = await db();
  await versions.createIndex({ slug: 1, number: -1 }, { unique: true });
  await events.createIndex({ slug: 1, createdAt: -1 });

  const latest = await latestVersion(slug);
  if (latest?.contentHash === contentHash && !values.force) {
    console.log(`No changes since ${slug} v${latest.number}. Nothing published (use --force to re-render anyway).`);
    return;
  }

  const number = (latest?.number ?? 0) + 1;
  const pdf = await renderPdf(content, (key) => `${baseUrl}/go/${slug}/${number}/${key}`);
  await versions.insertOne({ slug, number, content, contentHash, pdf: new Binary(pdf), note: values.note, createdAt: new Date() });
  console.log(`Published ${slug} v${number} (${Math.round(pdf.length / 1024)} KB PDF). Share link: ${baseUrl}/${slug}`);
}

// Same component and CSS as the web page. Fonts are inlined so Chrome needs no server.
async function renderPdf(content: ResumeData, href: (key: string) => string) {
  const fonts = readFileSync('styles/fonts.css', 'utf8').replace(
    /url\('\/fonts\/([^']+)'\)/g,
    (_, file) => `url(data:font/ttf;base64,${readFileSync(`public/fonts/${file}`).toString('base64')})`,
  );
  const css = readFileSync('styles/resume.css', 'utf8');
  const body = renderToStaticMarkup(createElement(Resume, { data: content, href }));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${content.basics.name} – Resume</title><style>${fonts}${css}</style></head><body>${body}</body></html>`;

  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const height = await page.evaluate(() => document.querySelector('.resume')!.scrollHeight);
    if (height > PAGE_HEIGHT_PX) {
      console.warn(`Warning: content is ${height - PAGE_HEIGHT_PX}px taller than one page, so the PDF has 2 pages.`);
    }
    return await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
