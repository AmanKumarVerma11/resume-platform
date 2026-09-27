'use server';

import { revalidatePath } from 'next/cache';
import { db, siteSettings } from '@/lib/db';
import { requireOwner } from '@/lib/owner';

// The primary resume is shown on the bare domain. Making a resume primary also activates it.
export async function makePrimary(slug: string) {
  await requireOwner();
  const { settings } = await db();
  await settings.updateOne({ _id: 'site' }, { $set: { primary: slug }, $pull: { inactive: slug } }, { upsert: true });
  revalidatePath('/admin');
}

// A deactivated resume's link redirects to the primary. The primary itself can't be deactivated.
export async function setActive(slug: string, active: boolean) {
  await requireOwner();
  if (!active && (await siteSettings()).primary === slug) return;
  const { settings } = await db();
  await settings.updateOne(
    { _id: 'site' },
    active ? { $pull: { inactive: slug } } : { $addToSet: { inactive: slug } },
    { upsert: true },
  );
  revalidatePath('/admin');
}
