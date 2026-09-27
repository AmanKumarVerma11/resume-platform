import { db, type EventType } from './db';

type Stat = { _id: { slug: string; type: EventType }; total: number; unique: number; last: Date };

// Every published resume with its latest version number and publish date.
export async function listResumes() {
  const { versions } = await db();
  return versions
    .aggregate<{ _id: string; latest: number; publishedAt: Date }>([
      { $project: { slug: 1, number: 1, createdAt: 1 } },
      { $sort: { number: -1 } },
      { $group: { _id: '$slug', latest: { $first: '$number' }, publishedAt: { $first: '$createdAt' } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
}

// Counts per resume and event type, ignoring bots: total, unique visitors (cookie), and the latest time.
export async function eventStats() {
  const { events } = await db();
  const stats = await events
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
    .toArray();
  return (slug: string, type: EventType) => stats.find((s) => s._id.slug === slug && s._id.type === type);
}
