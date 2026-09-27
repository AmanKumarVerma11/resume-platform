import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Cookie Policy' };

export default function CookiesPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p className="updated">Last updated: 26 September 2026</p>

      <p>
        Cookies are small text files a website stores in your browser. cv.amankrverma.in stores the following, all set
        by the site itself:
      </p>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>rv_id</code>
            </td>
            <td>Analytics: a random identifier so repeat visits and downloads from the same browser count once.</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>
              <code>rv_owner</code>
            </td>
            <td>Sign-in for the site owner only. Visitors never receive it.</td>
            <td>1 year</td>
          </tr>
          <tr>
            <td>
              <code>cookie-notice-dismissed</code> (local storage)
            </td>
            <td>Remembers that you closed the cookie notice.</td>
            <td>Until you clear it</td>
          </tr>
        </tbody>
      </table>

      <h2>Managing cookies</h2>
      <p>
        You can block or delete cookies in your browser settings. The site still works without them; your visits just
        can&rsquo;t be recognised as coming from the same browser.
      </p>

      <p>
        For how the collected information is used, see the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </>
  );
}
