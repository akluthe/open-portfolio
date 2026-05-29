import { describe, expect, it } from 'vitest';
import {
  resumeSchema,
  tailoringProfileSchema,
  resolveTailoredResume,
  type ResumeDocument
} from '@/lib/shared-types';

// A richer master than the shared fixture: multiple experience entries (with
// multiple highlights) and multiple skill groups, so we can exercise hiding,
// highlight removal, and reordering.
const master: ResumeDocument = resumeSchema.parse({
  basics: {
    name: 'Jane Example',
    title: 'Staff Engineer',
    summary: 'Builder of resilient platforms.'
  },
  summary: 'Builder of resilient platforms.',
  contact: { email: 'jane@example.com', location: 'Remote' },
  experience: [
    {
      company: 'Acme Corp',
      role: 'Lead Engineer',
      period: '2022 - Present',
      highlights: ['Ran a globally distributed platform.', 'Mentored five engineers.', 'Cut costs 30%.']
    },
    {
      company: 'Globex',
      role: 'Senior Engineer',
      period: '2019 - 2022',
      highlights: ['Shipped the billing system.', 'On-call rotation lead.']
    },
    {
      company: 'Initech',
      role: 'Engineer',
      period: '2016 - 2019',
      highlights: ['Maintained legacy services.']
    }
  ],
  skills: [
    { name: 'Languages', keywords: ['TypeScript', 'Go'] },
    { name: 'Cloud', keywords: ['AWS', 'GCP'] },
    { name: 'Data', keywords: ['Postgres', 'Kafka'] }
  ],
  projects: [{ name: 'Resume Platform', description: 'Public resume viewer.', highlights: ['SSR view'] }],
  education: [{ school: 'Tech University', degree: 'B.S. CS', period: '2012 - 2016', highlights: ['Magna cum laude'] }]
});

const profile = (overrides: Record<string, unknown>) =>
  tailoringProfileSchema.parse({ name: 'Test', baseSlug: 'main', ...overrides });

describe('resolveTailoredResume', () => {
  it('applies headline and summary overrides', () => {
    const result = resolveTailoredResume(master, profile({ headline: 'Engineering Manager', summary: 'Leader.' }));
    expect(result.basics.title).toBe('Engineering Manager');
    expect(result.basics.summary).toBe('Leader.');
    expect(result.summary).toBe('Leader.');
  });

  it('inherits master headline and summary when overrides are absent', () => {
    const result = resolveTailoredResume(master, profile({}));
    expect(result.basics.title).toBe('Staff Engineer');
    expect(result.basics.summary).toBe('Builder of resilient platforms.');
  });

  it('excludes an experience entry when include is false', () => {
    const result = resolveTailoredResume(master, profile({ experience: [{ index: 1, include: false }] }));
    const companies = result.experience.map((e) => e.company);
    expect(companies).toEqual(['Acme Corp', 'Initech']);
  });

  it('hides individual highlights but keeps the entry', () => {
    const result = resolveTailoredResume(
      master,
      profile({ experience: [{ index: 0, hiddenHighlights: [1] }] })
    );
    expect(result.experience[0].highlights).toEqual([
      'Ran a globally distributed platform.',
      'Cut costs 30%.'
    ]);
  });

  it('leaves entries without a rule fully intact', () => {
    const result = resolveTailoredResume(master, profile({ experience: [{ index: 0, hiddenHighlights: [0] }] }));
    expect(result.experience[1].highlights).toEqual(master.experience[1].highlights);
  });

  it('removes hidden skill groups', () => {
    const result = resolveTailoredResume(master, profile({ skills: { hidden: [1] } }));
    expect(result.skills.map((s) => s.name)).toEqual(['Languages', 'Data']);
  });

  it('reorders skills per order, with unlisted groups following in original order', () => {
    const result = resolveTailoredResume(master, profile({ skills: { order: [2, 0] } }));
    expect(result.skills.map((s) => s.name)).toEqual(['Data', 'Languages', 'Cloud']);
  });

  it('ignores stale / out-of-range indices without throwing', () => {
    const result = resolveTailoredResume(
      master,
      profile({
        experience: [{ index: 99, include: false }, { index: 0, hiddenHighlights: [42] }],
        skills: { hidden: [99], order: [99, 1] }
      })
    );
    // out-of-range experience exclude is a no-op; bad highlight index removes nothing
    expect(result.experience).toHaveLength(3);
    expect(result.experience[0].highlights).toHaveLength(3);
    // skills: hidden 99 ignored; order puts group 1 first, rest follow
    expect(result.skills.map((s) => s.name)).toEqual(['Cloud', 'Languages', 'Data']);
  });

  it('empties the right sections via hiddenSections', () => {
    const result = resolveTailoredResume(
      master,
      profile({ hiddenSections: ['projects', 'education', 'skills'] })
    );
    expect(result.projects).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.skills).toEqual([]);
    // experience is untouched
    expect(result.experience).toHaveLength(3);
  });

  it('filters nested sub-roles and their highlights by sub-role rules', () => {
    const nestedMaster: ResumeDocument = resumeSchema.parse({
      basics: { name: 'Jane Example', title: 'Staff Engineer' },
      experience: [
        {
          company: 'Anheuser-Busch InBev',
          role: 'Engineering Manager & Technical Lead',
          period: 'Jul 2022 – Present',
          highlights: [],
          roles: [
            { role: 'Zone Lead', period: '2026', highlights: ['Z-0', 'Z-1', 'Z-2'] },
            { role: 'Sub-Guild Lead', period: '2024', highlights: ['S-0', 'S-1'] },
            { role: 'Tech Lead', period: '2023', highlights: ['T-0', 'T-1'] }
          ]
        },
        {
          company: 'Globex',
          role: 'Senior Engineer',
          period: '2019 - 2022',
          highlights: ['Shipped billing.']
        }
      ]
    });

    const result = resolveTailoredResume(
      nestedMaster,
      profile({
        experience: [
          {
            index: 0,
            include: true,
            roles: [
              { index: 0, hiddenHighlights: [1] },
              { index: 1, include: false },
              { index: 2, hiddenHighlights: [0] }
            ]
          }
        ]
      })
    );

    const ab = result.experience[0];
    expect(ab.company).toBe('Anheuser-Busch InBev');
    // entry-level highlights stay empty for nested entries
    expect(ab.highlights).toEqual([]);
    // sub-role 1 (Sub-Guild) dropped via include:false
    expect(ab.roles?.map((r) => r.role)).toEqual(['Zone Lead', 'Tech Lead']);
    // sub-role 0 hides highlight index 1
    expect(ab.roles?.[0].highlights).toEqual(['Z-0', 'Z-2']);
    // sub-role 2 hides highlight index 0
    expect(ab.roles?.[1].highlights).toEqual(['T-1']);
    // flat entry unaffected
    expect(result.experience[1].highlights).toEqual(['Shipped billing.']);
  });

  it('keeps all sub-roles and highlights when a nested entry has no sub-role rules', () => {
    const nestedMaster: ResumeDocument = resumeSchema.parse({
      basics: { name: 'Jane Example', title: 'Staff Engineer' },
      experience: [
        {
          company: 'Anheuser-Busch InBev',
          role: 'Engineering Manager',
          highlights: [],
          roles: [
            { role: 'Zone Lead', highlights: ['Z-0', 'Z-1'] },
            { role: 'Tech Lead', highlights: ['T-0'] }
          ]
        }
      ]
    });

    const result = resolveTailoredResume(nestedMaster, profile({}));
    expect(result.experience[0].roles?.map((r) => r.role)).toEqual(['Zone Lead', 'Tech Lead']);
    expect(result.experience[0].roles?.[0].highlights).toEqual(['Z-0', 'Z-1']);
    expect(result.experience[0].roles?.[1].highlights).toEqual(['T-0']);
  });

  it('always returns a schema-valid ResumeDocument', () => {
    const result = resolveTailoredResume(
      master,
      profile({ headline: 'X', experience: [{ index: 0, include: false }], hiddenSections: ['projects'] })
    );
    expect(() => resumeSchema.parse(result)).not.toThrow();
  });
});
