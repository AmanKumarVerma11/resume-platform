import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms and Conditions' };

export default function TermsPage() {
  return (
    <>
      <h1>Terms and Conditions</h1>
      <p className="updated">Last updated: 26 September 2026</p>

      <p>By using cv.amankrverma.in (&ldquo;the site&rdquo;), you agree to these terms.</p>

      <h2>Use of the site</h2>
      <p>
        The site hosts the resume of Aman Kumar Verma. You may view it, download it, and share it with people involved
        in evaluating the candidate for a role.
      </p>

      <h2>Content</h2>
      <p>
        All content on the site belongs to Aman Kumar Verma. Don&rsquo;t republish it or use it commercially without
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
