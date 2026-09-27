import type { Metadata } from 'next';
import type { VersionDoc } from '@/lib/db';
import { CookieNotice } from './CookieNotice';
import { LegalLinks } from './LegalLinks';
import { Resume } from './Resume';
import { Tracker } from './Tracker';
import '@/styles/fonts.css';
import '@/styles/resume.css';

// The public resume page, shared by the bare domain (primary resume) and /<slug>.
export function ResumeView({ version }: { version: VersionDoc }) {
  return (
    <main className="viewer">
      <nav className="toolbar">
        <a className="download" href={`/${version.slug}/pdf`}>
          Download PDF
        </a>
      </nav>
      <Resume data={version.content} />
      <footer className="site-footer">
        <LegalLinks />
      </footer>
      <CookieNotice />
      <Tracker slug={version.slug} version={version.number} />
    </main>
  );
}

export const resumeMetadata = (version: VersionDoc | null): Metadata => ({
  title: version ? `${version.content.basics.name} – Resume` : 'Not found',
  description: version?.content.basics.label,
  robots: { index: false, follow: false },
});
