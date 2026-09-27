import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Resume } from '@/components/Resume';
import { db } from '@/lib/db';
import { baseUrl } from '@/lib/site';
import '@/styles/fonts.css';
import '@/styles/resume.css';

// Only headless Chrome visits this page, to print a PDF (see renderWithSitePage in lib/publish.ts).
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

async function findJob({ params }: Props) {
  const { renderJobs } = await db();
  const job = await renderJobs.findOne({ _id: (await params).id });
  return job && job.expiresAt > new Date() ? job : null;
}

// The title becomes the PDF's title.
export async function generateMetadata(props: Props): Promise<Metadata> {
  const job = await findJob(props);
  return { title: job ? `${job.content.basics.name} – Resume` : 'Not found', robots: { index: false, follow: false } };
}

export default async function RenderPage(props: Props) {
  const job = await findJob(props);
  if (!job) notFound();

  const base = baseUrl();
  return <Resume data={job.content} href={(key) => `${base}/go/${job.slug}/${job.version}/${key}`} />;
}
