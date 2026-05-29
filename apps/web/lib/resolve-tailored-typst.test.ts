import { describe, expect, it } from 'vitest';
import {
  resumeSchema,
  tailoringProfileSchema,
  resolveTailoredResume,
  type ResumeDocument
} from '@/lib/shared-types';
import { buildResumeData } from './resume-typst';

const master: ResumeDocument = resumeSchema.parse({
  basics: { name: 'Jane Example', title: 'Staff Engineer', summary: 'Original summary.' },
  experience: [
    { company: 'Acme Corp', role: 'Lead Engineer', period: '2022 - Present', highlights: ['Ran a platform.'] },
    { company: 'Globex', role: 'Senior Engineer', period: '2019 - 2022', highlights: ['Shipped billing.'] }
  ],
  skills: [{ name: 'Languages', keywords: ['TypeScript'] }],
  projects: [],
  education: []
});

describe('buildResumeData over a tailored resume', () => {
  it('reflects the headline override and excluded company', () => {
    const profile = tailoringProfileSchema.parse({
      name: 'Test',
      baseSlug: 'main',
      headline: 'Engineering Manager',
      experience: [{ index: 1, include: false }]
    });

    const data = buildResumeData(resolveTailoredResume(master, profile));
    const companies = data.experience.map((e) => e.company);

    expect(data.basics.title).toBe('Engineering Manager');
    expect(companies).toContain('Acme Corp');
    expect(companies).not.toContain('Globex');
  });
});
