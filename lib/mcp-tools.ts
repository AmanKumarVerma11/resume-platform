import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { db, latestVersion, type EventType } from './db';
import { describeUserAgent } from './format';
import { isValidSlug, publishVersion, renderWithSitePage } from './publish';
import { ResumeSchema } from './resume-schema';
import { setActive, setPrimary, siteSettings } from './settings';
import { baseUrl } from './site';
import { eventStats, listResumes } from './stats';

const ok = (data: unknown): CallToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const fail = (message: string): CallToolResult => ({ content: [{ type: 'text', text: message }], isError: true });

const Slug = z
  .string()
  .describe('The resume\'s name, which is also its link: "fde" is the resume at /fde. Lowercase letters, digits, dashes.');

const READ = { readOnlyHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

export function registerTools(server: McpServer) {
  server.registerTool(
    'list_resumes',
    {
      title: 'List resumes',
      description: 'Every resume with its link, status (primary, active or inactive), latest version and headline stats.',
      annotations: READ,
    },
    async () => {
      const [resumes, stat, { primary, inactive }] = await Promise.all([listResumes(), eventStats(), siteSettings()]);
      return ok(
        resumes.map(({ _id: slug, latest, publishedAt }) => ({
          slug,
          link: `${baseUrl()}/${slug}`,
          status:
            slug === primary
              ? 'primary (also shown on the bare domain)'
              : inactive.includes(slug)
                ? 'inactive (its link redirects to the primary resume)'
                : 'active',
          latestVersion: latest,
          publishedAt,
          opens: stat(slug, 'view')?.total ?? 0,
          downloads: stat(slug, 'download')?.total ?? 0,
          lastOpened: stat(slug, 'view')?.last ?? null,
        })),
      );
    },
  );

  server.registerTool(
    'get_resume',
    {
      title: 'Get a resume',
      description: 'The content of a resume: the latest version, or an older one. Edit it and pass it to save_resume.',
      inputSchema: z.object({
        slug: Slug,
        version: z.number().int().positive().optional().describe('Leave out for the latest version'),
      }),
      annotations: READ,
    },
    async ({ slug, version }) => {
      const { versions } = await db();
      const doc = version
        ? await versions.findOne({ slug, number: version }, { projection: { pdf: 0 } })
        : await latestVersion(slug);
      if (!doc) return fail(`There is no resume "${slug}"${version ? ` version ${version}` : ''}. Use list_resumes.`);
      return ok({ slug, version: doc.number, publishedAt: doc.createdAt, note: doc.note, content: doc.content });
    },
  );

  server.registerTool(
    'list_versions',
    {
      title: 'List versions',
      description: 'The version history of a resume, newest first. To go back, get_resume an old version and save it.',
      inputSchema: z.object({ slug: Slug }),
      annotations: READ,
    },
    async ({ slug }) => {
      const { versions } = await db();
      const history = await versions
        .find({ slug }, { projection: { number: 1, createdAt: 1, note: 1, source: 1 }, sort: { number: -1 } })
        .toArray();
      if (history.length === 0) return fail(`There is no resume "${slug}". Use list_resumes.`);
      return ok(history.map((v) => ({ version: v.number, publishedAt: v.createdAt, note: v.note, via: v.source })));
    },
  );

  server.registerTool(
    'save_resume',
    {
      title: 'Save a resume',
      description:
        'Publish a new version of a resume, or create a new resume under a new name. The content is checked, a PDF ' +
        'is generated, and the live page updates immediately; earlier versions are kept. Dates are "YYYY" or ' +
        '"YYYY-MM". basics.summary and work[].highlights accept **bold**. A resume should fit on one page; the ' +
        'result warns when it does not. Start from get_resume so nothing is lost.',
      inputSchema: z.object({
        slug: Slug,
        content: ResumeSchema,
        note: z.string().max(200).optional().describe('What changed, shown in the version history'),
      }),
      annotations: WRITE,
    },
    async ({ slug, content, note }) => {
      if (!isValidSlug(slug)) return fail(`"${slug}" can't be used as a name. Use lowercase letters, digits and dashes.`);
      const result = await publishVersion({ slug, content, note, source: 'mcp', render: renderWithSitePage });
      if (result.status === 'unchanged') return ok({ message: `No changes since version ${result.version}.` });
      return ok({
        message: `Published ${slug} version ${result.version}.`,
        link: `${baseUrl()}/${slug}`,
        ...(result.overflowPx > 0 && {
          warning: `The content is ${result.overflowPx}px taller than one page, so the PDF has 2 pages. Shorten it.`,
        }),
      });
    },
  );

  server.registerTool(
    'set_primary',
    {
      title: 'Make a resume primary',
      description: "Show this resume on the site's home page (the bare domain). This also activates it.",
      inputSchema: z.object({ slug: Slug }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    async ({ slug }) => {
      if (!(await latestVersion(slug))) return fail(`There is no resume "${slug}". Use list_resumes.`);
      await setPrimary(slug);
      return ok({ message: `${slug} is now the primary resume, shown at ${baseUrl()}.` });
    },
  );

  server.registerTool(
    'set_active',
    {
      title: 'Activate or deactivate a resume',
      description: "A deactivated resume's link redirects to the primary resume. The primary can't be deactivated.",
      inputSchema: z.object({ slug: Slug, active: z.boolean() }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    async ({ slug, active }) => {
      if (!(await latestVersion(slug))) return fail(`There is no resume "${slug}". Use list_resumes.`);
      if (!(await setActive(slug, active))) {
        return fail(`${slug} is the primary resume, so it can't be deactivated. Make another resume primary first.`);
      }
      return ok({
        message: active ? `${slug} is active.` : `${slug} is deactivated; its link redirects to the primary resume.`,
      });
    },
  );

  server.registerTool(
    'get_stats',
    {
      title: 'Resume stats',
      description:
        'Opens, downloads, prints and clicks on links inside the PDF, with unique visitors, plus recent activity ' +
        '(time, event, IP, location, device). The owner\'s own visits and bots are not counted.',
      inputSchema: z.object({
        slug: Slug,
        recent: z.number().int().min(0).max(100).default(20).describe('How many recent events to include'),
      }),
      annotations: READ,
    },
    async ({ slug, recent }) => {
      const { events } = await db();
      const [stat, activity] = await Promise.all([
        eventStats(),
        events.find({ slug, isBot: false }, { sort: { createdAt: -1 }, limit: recent }).toArray(),
      ]);
      const count = (type: EventType) => ({ total: stat(slug, type)?.total ?? 0, unique: stat(slug, type)?.unique ?? 0 });
      return ok({
        slug,
        opens: count('view'),
        downloads: count('download'),
        prints: count('print'),
        pdfLinkClicks: count('click'),
        recent: activity.map((e) => ({
          at: e.createdAt,
          event: e.type,
          link: e.target,
          version: e.version,
          ip: e.ip,
          location: [e.city, e.country].filter(Boolean).join(', ') || null,
          device: describeUserAgent(e.userAgent),
        })),
      });
    },
  );
}
