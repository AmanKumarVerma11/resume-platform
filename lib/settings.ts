import { db, latestVersion } from './db';

// Which resume the bare domain shows (primary), and which resumes are switched off.
export async function siteSettings() {
  const { settings } = await db();
  const doc = await settings.findOne({ _id: 'site' });
  return { primary: doc?.primary ?? null, inactive: doc?.inactive ?? [] };
}

// Whoever runs the site, as the legal pages name them: the person on the primary resume.
export async function siteOwner() {
  const { primary } = await siteSettings();
  const version = primary ? await latestVersion(primary) : null;
  return { name: version?.content.basics.name ?? 'the site owner', email: version?.content.basics.email };
}

// Making a resume primary also activates it.
export async function setPrimary(slug: string) {
  const { settings } = await db();
  await settings.updateOne({ _id: 'site' }, { $set: { primary: slug }, $pull: { inactive: slug } }, { upsert: true });
}

// A deactivated resume's link redirects to the primary. Returns false for the primary, which can't be deactivated.
export async function setActive(slug: string, active: boolean) {
  if (!active && (await siteSettings()).primary === slug) return false;
  const { settings } = await db();
  await settings.updateOne(
    { _id: 'site' },
    active ? { $pull: { inactive: slug } } : { $addToSet: { inactive: slug } },
    { upsert: true },
  );
  return true;
}
