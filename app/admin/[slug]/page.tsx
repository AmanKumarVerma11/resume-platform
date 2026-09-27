import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, type EventDoc } from '@/lib/db';
import { requireOwner } from '@/lib/owner';
import { describeUserAgent, formatDate } from '../format';

const LABELS: Record<EventDoc['type'], string> = {
  view: 'Opened',
  download: 'Downloaded PDF',
  print: 'Printed',
  click: 'Clicked in PDF',
};

export default async function ResumeStatsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireOwner();
  const { slug } = await params;
  const { versions, events } = await db();
  const [history, recent] = await Promise.all([
    versions.find({ slug }, { projection: { pdf: 0, content: 0 }, sort: { number: -1 } }).toArray(),
    events.find({ slug }, { sort: { createdAt: -1 }, limit: 100 }).toArray(),
  ]);
  if (history.length === 0) notFound();

  return (
    <>
      <p>
        <Link href="/admin">← All resumes</Link>
      </p>
      <h1>
        {slug} <a className="muted" href={`/${slug}`}>/{slug}</a>
      </h1>

      <h2>Versions</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Published</th>
              <th>Note</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {history.map((v) => (
              <tr key={v.number}>
                <td className="num">v{v.number}</td>
                <td>{formatDate(v.createdAt)}</td>
                <td>{v.note ?? ''}</td>
                <td>
                  <a href={`/admin/${slug}/${v.number}/pdf`}>Download</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Recent activity</h2>
      {recent.length === 0 ? (
        <p className="muted">Nothing yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Event</th>
                <th>IP</th>
                <th>Location</th>
                <th>Device</th>
                <th>Visitor</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e._id.toString()} className={e.isBot ? 'muted' : undefined}>
                  <td>{formatDate(e.createdAt)}</td>
                  <td>
                    {LABELS[e.type]}
                    {e.target && `: ${e.target}`} · v{e.version}
                    {e.isBot && ' (bot, not counted)'}
                  </td>
                  <td className="num">{e.ip ?? '–'}</td>
                  <td>{[e.city, e.country].filter(Boolean).join(', ') || '–'}</td>
                  <td title={e.userAgent}>{describeUserAgent(e.userAgent)}</td>
                  <td className="num">{e.visitorId.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
