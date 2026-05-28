import { describe, expect, it } from 'vitest';
import {
  resumeSchema,
  tailoringProfileSchema,
  resolveTailoredResume,
  type ResumeDocument
} from '@/lib/shared-types';
import { buildTypstSource } from './resume-typst';

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

describe('buildTypstSource over a tailored resume', () => {
  it('reflects the headline override and excluded company', async () => {
    const profile = tailoringProfileSchema.parse({
      name: 'Test',
      baseSlug: 'main',
      headline: 'Engineering Manager',
      experience: [{ index: 1, include: false }]
    });

    const typst = await buildTypstSource(resolveTailoredResume(master, profile));

    expect(typst).toContain('Engineering Manager');
    expect(typst).toContain('Acme Corp');
    expect(typst).not.toContain('Globex');
  });
});
