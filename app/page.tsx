import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResumeView, resumeMetadata } from '@/components/ResumeView';
import { latestVersion, siteSettings } from '@/lib/db';

// The bare domain shows whichever resume is marked primary in /admin.
export const dynamic = 'force-dynamic';

async function primaryVersion() {
  const { primary } = await siteSettings();
  return primary ? latestVersion(primary) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  return resumeMetadata(await primaryVersion());
}

export default async function HomePage() {
  const version = await primaryVersion();
  if (!version) notFound();
  return <ResumeView version={version} />;
}
