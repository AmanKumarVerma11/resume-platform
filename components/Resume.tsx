import { profileKey, projectKey } from '@/lib/links';
import type { ResumeData } from '@/lib/resume-schema';

type Props = {
  data: ResumeData;
  // Builds the href for each web link. The PDF passes a tracking URL; the web page links directly.
  href?: (key: string, url: string) => string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-01" → "Jan 2026"; "2024" stays "2024".
function formatDate(date: string) {
  const [year, month] = date.split('-');
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

// "https://www.linkedin.com/in/x/" → "linkedin.com/in/x"
const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

// Renders **bold** segments.
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
      )}
    </>
  );
}

export function Resume({ data, href = (_key, url) => url }: Props) {
  const { basics } = data;
  const [firstProfile, ...otherProfiles] = basics.profiles;
  const link = (key: string, url: string) => <a href={href(key, url)}>{displayUrl(url)}</a>;

  return (
    <article className="resume">
      <header>
        <h1 className="r-name">{basics.name}</h1>
        <p className="r-label">{basics.label}</p>
        <div className="r-contact">
          <div className="r-row">
            <span>
              <a href={`mailto:${basics.email}`}>{basics.email}</a> | {basics.phone}
            </span>
            {firstProfile && link(profileKey(firstProfile), firstProfile.url)}
          </div>
          <div className="r-row">
            <span>
              {otherProfiles.map((p, i) => (
                <span key={p.url}>
                  {i > 0 && ' | '}
                  {link(profileKey(p), p.url)}
                </span>
              ))}
            </span>
            {basics.url && link('website', basics.url)}
          </div>
        </div>
      </header>

      <p className="r-summary">
        <Rich text={basics.summary} />
      </p>

      <h2 className="r-bar">WORK EXPERIENCE</h2>
      {data.work.map((job) => (
        <section key={`${job.name}-${job.startDate}`}>
          <h3 className="r-role">
            {job.name} as {job.position} ({formatDate(job.startDate)} – {job.endDate ? formatDate(job.endDate) : 'Present'})
            {job.location && ` [${job.location}]`}
          </h3>
          <ul className="r-bullets">
            {job.highlights.map((item) => (
              <li key={item}>
                <Rich text={item} />
              </li>
            ))}
            {job.keywords && (
              <li>
                <strong>Tech:</strong> {job.keywords.join(', ')}.
              </li>
            )}
          </ul>
        </section>
      ))}

      <h2 className="r-bar r-cols">
        <span>EDUCATION</span>
        <span>YEAR</span>
        <span>UNIVERSITY/SCHOOL</span>
      </h2>
      {data.education.map((e) => (
        <div className="r-cols r-edu" key={`${e.studyType}-${e.startDate}`}>
          <span>{e.area ? `${e.studyType}, ${e.area}` : e.studyType}</span>
          <span>
            ({e.startDate}–{e.endDate})
          </span>
          <span>{e.score ? `${e.institution} – ${e.score}` : e.institution}</span>
        </div>
      ))}

      <h2 className="r-bar">PROJECTS</h2>
      <ul className="r-bullets">
        {data.projects.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong> ({link(projectKey(p), p.url)}): {p.description}
          </li>
        ))}
      </ul>

      <h2 className="r-bar">SKILLS</h2>
      <p className="r-para">{data.skills.flatMap((s) => s.keywords).join(', ')}.</p>

      <h2 className="r-bar">HOBBIES</h2>
      <p className="r-para">{data.interests.map((i) => i.name).join('; ')}.</p>
    </article>
  );
}
