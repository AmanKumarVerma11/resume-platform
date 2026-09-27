'use server';

import { revalidatePath } from 'next/cache';
import { disconnectAllApps } from '@/lib/oauth';
import { requireOwner } from '@/lib/owner';
import { setActive as saveActive, setPrimary } from '@/lib/settings';

export async function disconnectApps() {
  await requireOwner();
  await disconnectAllApps();
  revalidatePath('/admin');
}

export async function makePrimary(slug: string) {
  await requireOwner();
  await setPrimary(slug);
  revalidatePath('/admin');
}

export async function setActive(slug: string, active: boolean) {
  await requireOwner();
  await saveActive(slug, active);
  revalidatePath('/admin');
}
