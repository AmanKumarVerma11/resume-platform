import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: 26 September 2026</p>

      <p>
        This policy explains what information cv.amankrverma.in (&ldquo;the site&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects when you visit it and how it is used. The site is operated by Aman Kumar Verma.
      </p>

      <h2>Information we collect</h2>
      <p>When you open a resume on the site, we automatically collect:</p>
      <ul>
        <li>your IP address and the approximate location derived from it (city and country);</li>
        <li>information about your browser and device, such as browser type and operating system;</li>
        <li>
          your activity on the site: which resume you opened, whether you downloaded or printed it, which links in
          its PDF you clicked, and when;
        </li>
        <li>a random identifier stored in a cookie, so repeat visits from the same browser can be recognised.</li>
      </ul>
      <p>We don&rsquo;t ask you to enter your name, email address or any other details.</p>

      <h2>How we use it</h2>
      <p>
        We use this information for analytics: to understand how the site and its resumes are used, for example how
        often a resume is opened or downloaded.
      </p>

      <h2>Cookies</h2>
      <p>
        The cookies the site uses are listed in the <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2>Storage</h2>
      <p>
        The information is stored with the providers that host the site and its database, who process it on our
        behalf. We keep it for as long as it is needed for analytics.
      </p>

      <h2>Your choices</h2>
      <p>
        You can block or delete cookies in your browser settings; the site still works without them. To ask about, or
        request deletion of, information collected about you, email{' '}
        <a href="mailto:akverma11aug2002@gmail.com">akverma11aug2002@gmail.com</a>.
      </p>

      <h2>Changes</h2>
      <p>We may update this policy. The date at the top shows when it last changed.</p>
    </>
  );
}
