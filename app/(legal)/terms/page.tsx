import type { Metadata } from 'next';
import Link from 'next/link';
import { siteOwner } from '@/lib/settings';
import { baseUrl } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms and Conditions' };
export const dynamic = 'force-dynamic'; // the owner comes from the primary resume

export default async function TermsPage() {
  const owner = await siteOwner();
  const site = new URL(baseUrl()).host;
  return (
    <>
      <h1>Terms and Conditions</h1>
      <p className="updated">Last updated: 26 September 2026</p>

      <p>By using {site} (&ldquo;the site&rdquo;), you agree to these terms.</p>

      <h2>Use of the site</h2>
      <p>
        The site hosts the resumes of {owner.name}. You may view them, download them, and share them with people
        involved in evaluating the candidate for a role.
      </p>

      <h2>Content</h2>
      <p>
        All content on the site belongs to {owner.name}. Don&rsquo;t republish it or use it commercially without
        permission.
      </p>

      <h2>No warranty</h2>
      <p>The site and its content are provided &ldquo;as is&rdquo;, without warranties of any kind.</p>

      <h2>Limitation of liability</h2>
      <p>To the extent permitted by law, we are not liable for any loss or damage arising from your use of the site.</p>

      <h2>Privacy</h2>
      <p>
        The <Link href="/privacy">Privacy Policy</Link> and <Link href="/cookies">Cookie Policy</Link> explain what
        information the site collects.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. Using the site after a change means you accept the updated terms.</p>
    </>
  );
}
