import { z } from 'zod';

// A subset of the JSON Resume schema (jsonresume.org), plus work[].keywords for the "Tech:" line.
// basics.summary and work[].highlights accept **bold**.
const date = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'Use YYYY or YYYY-MM');

export const ResumeSchema = z.object({
  basics: z.object({
    name: z.string(),
    label: z.string(),
    email: z.email(),
    phone: z.string(),
    url: z.url().optional(),
    summary: z.string(),
    profiles: z.array(z.object({ network: z.string(), url: z.url() })),
  }),
  work: z.array(
    z.object({
      name: z.string(),
      position: z.string(),
      location: z.string().optional(),
      startDate: date,
      endDate: date.optional(),
      highlights: z.array(z.string()),
      keywords: z.array(z.string()).optional(),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      studyType: z.string(),
      area: z.string().optional(),
      startDate: date,
      endDate: date,
      score: z.string().optional(),
    }),
  ),
  projects: z.array(z.object({ name: z.string(), url: z.url(), description: z.string() })),
  skills: z.array(z.object({ name: z.string(), keywords: z.array(z.string()) })),
  interests: z.array(z.object({ name: z.string() })),
});

export type ResumeData = z.infer<typeof ResumeSchema>;
