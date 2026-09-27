import Link from 'next/link';
import { db, type EventType } from '@/lib/db';
import { requireOwner } from '@/lib/owner';
import { formatDate } from './format';

type Stat = { _id: { slug: string; type: EventType }; total: number; unique: number; last: Date };

export default async function AdminPage() {
  await requireOwner();
  const { versions, events } = await db();
  const [resumes, stats] = await Promise.all([
    versions
      .aggregate<{ _id: string; latest: number; publishedAt: Date }>([
        { $project: { slug: 1, number: 1, createdAt: 1 } },
        { $sort: { number: -1 } },
        { $group: { _id: '$slug', latest: { $first: '$number' }, publishedAt: { $first: '$createdAt' } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    events
      .aggregate<Stat>([
        { $match: { isBot: false } },
        {
          $group: {
            _id: { slug: '$slug', type: '$type' },
            total: { $sum: 1 },
            visitors: { $addToSet: '$visitorId' },
            last: { $max: '$createdAt' },
          },
        },
        { $project: { total: 1, unique: { $size: '$visitors' }, last: 1 } },
      ])
      .toArray(),
  ]);
  const stat = (slug: string, type: EventType) => stats.find((s) => s._id.slug === slug && s._id.type === type);

  return (
    <>
      <h1>Resumes</h1>
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
                return (
                  <tr key={slug}>
                    <td>
                      <Link href={`/admin/${slug}`}>{slug}</Link>
                    </td>
                    <td>
                      <a href={`/${slug}`}>/{slug}</a>
                    </td>
                    <td className="num" title={`Published ${formatDate(publishedAt)}`}>
                      v{latest}
                    </td>
                    <td className="num">{views?.total ?? 0}</td>
                    <td className="num">{views?.unique ?? 0}</td>
                    <td className="num">{downloads?.total ?? 0}</td>
                    <td className="num">{downloads?.unique ?? 0}</td>
                    <td className="num">{stat(slug, 'print')?.total ?? 0}</td>
                    <td className="num">{stat(slug, 'click')?.total ?? 0}</td>
                    <td>{views ? formatDate(views.last) : '–'}</td>
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
    </>
  );
}
