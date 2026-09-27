import Link from 'next/link';
import { LocalTime } from '@/components/LocalTime';
import { connectedApps, mcpUrl } from '@/lib/oauth';
import { requireOwner } from '@/lib/owner';
import { siteSettings } from '@/lib/settings';
import { eventStats, listResumes } from '@/lib/stats';
import { disconnectApps, makePrimary, setActive } from './actions';

export default async function AdminPage() {
  await requireOwner();
  const [resumes, stat, { primary, inactive }, apps] = await Promise.all([
    listResumes(),
    eventStats(),
    siteSettings(),
    connectedApps(),
  ]);

  return (
    <>
      <h1>Resumes</h1>
      <p>
        {primary ? (
          <>
            The bare domain (<a href="/">/</a>) shows <strong>{primary}</strong>, your primary resume.
          </>
        ) : (
          'No primary resume yet, so the bare domain shows a 404. Make one primary below.'
        )}
      </p>
      {resumes.length === 0 ? (
        <p>
          No resumes yet. Publish one with <code>npm run publish-resume -- &lt;slug&gt;</code>.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Resume</th>
                <th>Share link</th>
                <th>Status</th>
                <th>Version</th>
                <th>Opens</th>
                <th>Visitors</th>
                <th>Downloads</th>
                <th>Downloaders</th>
                <th>Printed</th>
                <th>PDF link clicks</th>
                <th>Last opened</th>
              </tr>
            </thead>
            <tbody>
              {resumes.map(({ _id: slug, latest, publishedAt }) => {
                const views = stat(slug, 'view');
                const downloads = stat(slug, 'download');
                const isPrimary = slug === primary;
                const isActive = !inactive.includes(slug);
                return (
                  <tr key={slug} className={isActive ? undefined : 'muted'}>
                    <td>
                      <Link href={`/admin/${slug}`}>{slug}</Link>
                    </td>
                    <td>
                      {isPrimary && (
                        <>
                          <a href="/">/</a> and{' '}
                        </>
                      )}
                      <a href={`/${slug}`}>/{slug}</a>
                    </td>
                    <td>
                      {isPrimary ? <strong>Primary</strong> : isActive ? 'Active' : 'Inactive (redirects to primary)'}
                      {!isPrimary && (
                        <div className="actions">
                          <form action={makePrimary.bind(null, slug)}>
                            <button type="submit">Make primary</button>
                          </form>
                          <form action={setActive.bind(null, slug, !isActive)}>
                            <button type="submit">{isActive ? 'Deactivate' : 'Activate'}</button>
                          </form>
                        </div>
                      )}
                    </td>
                    <td className="num" title={`Published ${publishedAt.toISOString().slice(0, 10)}`}>
                      v{latest}
                    </td>
                    <td className="num">{views?.total ?? 0}</td>
                    <td className="num">{views?.unique ?? 0}</td>
                    <td className="num">{downloads?.total ?? 0}</td>
                    <td className="num">{downloads?.unique ?? 0}</td>
                    <td className="num">{stat(slug, 'print')?.total ?? 0}</td>
                    <td className="num">{stat(slug, 'click')?.total ?? 0}</td>
                    <td>{views ? <LocalTime iso={views.last.toISOString()} /> : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted">
        Your own visits and known bots are not counted. A visit counts as an open once the page has been on screen for
        3 seconds. Visitors and downloaders are counted once per browser (cookie).
      </p>

      <h2>AI apps</h2>
      <p>
        Connect Claude, ChatGPT, Codex or any MCP app to <code>{mcpUrl()}</code> to create and edit resumes. Each app
        asks you to approve it with your admin password.
      </p>
      {apps.length === 0 ? (
        <p className="muted">No apps connected.</p>
      ) : (
        <>
          <p>Connected: {apps.map((app) => app.clientName).join(', ')}</p>
          <form action={disconnectApps}>
            <button type="submit" className="secondary">
              Disconnect all apps
            </button>
          </form>
        </>
      )}
    </>
  );
}
