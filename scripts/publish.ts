// Publishes resumes/<slug>.json as a new version: validates it, renders the PDF with your local
// Chrome, and stores both in MongoDB. Nothing is published if the content hasn't changed, unless
// you pass --force (e.g. after changing the template, CSS or fonts). Settings come from .env.local,
// or from --env <file> (e.g. .env.prod.local to publish to the production database).
//
//   npm run publish-resume -- <slug> [--note "what changed"] [--force] [--overwrite] [--env <file>]
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { closeDb, latestVersion } from '../lib/db';
import { isValidSlug, publishVersion } from '../lib/publish';
import { renderWithHtml } from './render-html';
import { ResumeSchema } from '../lib/resume-schema';

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      note: { type: 'string' },
      force: { type: 'boolean' },
      overwrite: { type: 'boolean' },
      env: { type: 'string' },
    },
  });
  if (values.env && !existsSync(values.env)) throw new Error(`Env file not found: ${values.env}`);
  const envFile = values.env ?? '.env.local';
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const slug = positionals[0];
  if (!slug || !isValidSlug(slug)) {
    throw new Error(
      'Usage: npm run publish-resume -- <slug> [--note "..."] [--force] [--overwrite] [--env <file>]  (slug: lowercase letters, digits, dashes)',
    );
  }

  const parsed = ResumeSchema.safeParse(JSON.parse(readFileSync(`resumes/${slug}.json`, 'utf8')));
  if (!parsed.success) throw new Error(`resumes/${slug}.json is invalid:\n${z.prettifyError(parsed.error)}`);

  // Once a resume has been edited through the MCP, the database is ahead of this file.
  const latest = await latestVersion(slug);
  if (latest?.source === 'mcp' && !values.overwrite) {
    throw new Error(
      `${slug} v${latest.number} was saved through the MCP, so resumes/${slug}.json may be out of date. ` +
        'Publishing it would replace the live version. Re-run with --overwrite if that is what you want.',
    );
  }

  const result = await publishVersion({
    slug,
    content: parsed.data,
    note: values.note,
    source: 'cli',
    force: values.force,
    render: renderWithHtml,
  });
  if (result.status === 'unchanged') {
    console.log(`No changes since ${slug} v${result.version}. Nothing published (use --force to re-render anyway).`);
    return;
  }
  if (result.overflowPx > 0) {
    console.warn(`Warning: content is ${result.overflowPx}px taller than one page, so the PDF has 2 pages.`);
  }
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  console.log(`Published ${slug} v${result.version} (${Math.round(result.pdfBytes / 1024)} KB PDF). Share link: ${base}/${slug}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
