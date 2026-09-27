import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CookieNotice } from '@/components/CookieNotice';
import { LegalLinks } from '@/components/LegalLinks';
import { Resume } from '@/components/Resume';
import { Tracker } from '@/components/Tracker';
import { latestVersion } from '@/lib/db';
import '@/styles/fonts.css';
import '@/styles/resume.css';

// Always show the latest published version.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const version = await latestVersion((await params).slug);
  return {
    title: version ? `${version.content.basics.name} – Resume` : 'Not found',
    description: version?.content.basics.label,
    robots: { index: false, follow: false },
  };
}

export default async function ResumePage({ params }: Props) {
  const { slug } = await params;
  const version = await latestVersion(slug);
  if (!version) notFound();

  return (
    <main className="viewer">
      <nav className="toolbar">
        <a className="download" href={`/${slug}/pdf`}>
          Download PDF
        </a>
      </nav>
      <Resume data={version.content} />
      <footer className="site-footer">
        <LegalLinks />
      </footer>
      <CookieNotice />
      <Tracker slug={slug} version={version.number} />
    </main>
  );
}
