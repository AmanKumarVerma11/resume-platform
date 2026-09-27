import type { ResumeData } from './resume-schema';

// Stable keys for the resume's web links. Links inside the PDF go through /go/<slug>/<version>/<key>.
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const profileKey = (profile: { network: string }) => slugify(profile.network);
export const projectKey = (project: { name: string }) => `project-${slugify(project.name)}`;

export function findLink(data: ResumeData, key: string) {
  if (key === 'website') return data.basics.url;
  return (
    data.basics.profiles.find((p) => profileKey(p) === key)?.url ??
    data.projects.find((p) => projectKey(p) === key)?.url
  );
}
