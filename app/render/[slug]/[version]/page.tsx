import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Resume } from '@/components/Resume';
import { db } from '@/lib/db';
import { isValidRenderSignature } from '@/lib/owner';
import { baseUrl } from '@/lib/site';
import '@/styles/fonts.css';
import '@/styles/resume.css';

// Only headless Chrome visits this page, to print a version's PDF (see lib/pdf.ts). The link is signed.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string; version: string }>; searchParams: Promise<{ sig?: string }> };

async function findVersion({ params, searchParams }: Props) {
  const [{ slug, version }, { sig }] = await Promise.all([params, searchParams]);
  const number = Number(version);
  if (!isValidRenderSignature(slug, number, sig)) return null;
  const { versions } = await db();
  return versions.findOne({ slug, number });
}

// The title becomes the PDF's title.
export async function generateMetadata(props: Props): Promise<Metadata> {
  const version = await findVersion(props);
  return {
    title: version ? `${version.content.basics.name} – Resume` : 'Not found',
    robots: { index: false, follow: false },
  };
}

export default async function RenderPage(props: Props) {
  const version = await findVersion(props);
  if (!version) notFound();
  const base = baseUrl();
  return (
    <Resume data={version.content} href={(key) => `${base}/go/${version.slug}/${version.number}/${key}`} />
  );
}
