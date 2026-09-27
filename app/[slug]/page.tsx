import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ResumeView, resumeMetadata } from '@/components/ResumeView';
import { latestVersion } from '@/lib/db';
import { siteSettings } from '@/lib/settings';

// Always show the latest published version.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return resumeMetadata(await latestVersion((await params).slug));
}

export default async function ResumePage({ params }: Props) {
  const { slug } = await params;
  const { primary, inactive } = await siteSettings();
  // A deactivated resume sends visitors to the primary one (shown on the bare domain).
  if (inactive.includes(slug)) {
    if (primary) redirect('/');
    notFound();
  }

  const version = await latestVersion(slug);
  if (!version) notFound();
  return <ResumeView version={version} />;
}
