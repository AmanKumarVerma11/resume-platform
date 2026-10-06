// Imports a resume from a JSON file into the database as a new version. The file isn't kept: the
// database is the only place resumes live. Settings come from .env.local, or from --env <file>.
//
//   npm run import-resume -- <slug> <file.json> [--note "what changed"] [--env <file>]
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { closeDb } from '../lib/db';
import { isValidSlug, publishVersion } from '../lib/publish';
import { ResumeSchema } from '../lib/resume-schema';
import { baseUrl } from '../lib/site';

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { note: { type: 'string' }, env: { type: 'string' } },
  });
  if (values.env && !existsSync(values.env)) throw new Error(`Env file not found: ${values.env}`);
  const envFile = values.env ?? '.env.local';
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const [slug, file] = positionals;
  if (!slug || !file || !isValidSlug(slug)) {
    throw new Error(
      'Usage: npm run import-resume -- <slug> <file.json> [--note "..."] [--env <file>]  (slug: lowercase letters, digits, dashes)',
    );
  }
  const link = `${baseUrl()}/${slug}`;

  const parsed = ResumeSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) throw new Error(`${file} is invalid:\n${z.prettifyError(parsed.error)}`);

  const result = await publishVersion({ slug, content: parsed.data, note: values.note, source: 'cli' });
  console.log(
    result.status === 'unchanged'
      ? `No changes since ${slug} v${result.version}. Nothing imported.`
      : `Imported ${slug} v${result.version}. Link: ${link}`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
