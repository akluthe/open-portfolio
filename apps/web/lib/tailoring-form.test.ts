import { describe, expect, it } from 'vitest';
import {
  resumeSchema,
  tailoringProfileSchema,
  type ResumeDocument
} from '@/lib/shared-types';
import { profileToFormState, formStateToProfile } from '@/lib/tailoring-form';

const master: ResumeDocument = resumeSchema.parse({
  basics: { name: 'Jane', title: 'Staff Engineer', summary: 'Master summary.' },
  experience: [
    { company: 'Acme', role: 'Lead', highlights: ['a0', 'a1', 'a2'] },
    { company: 'Globex', role: 'Senior', highlights: ['g0', 'g1'] },
    { company: 'Initech', role: 'Eng', highlights: ['i0'] }
  ],
  skills: [
    { name: 'Languages', keywords: ['TS'] },
    { name: 'Cloud', keywords: ['AWS'] },
    { name: 'Data', keywords: ['PG'] }
  ],
  projects: [],
  education: []
});

const meta = { name: 'Test Tailoring', baseSlug: 'main' };

describe('profileToFormState', () => {
  it('positions experience/skill state against the master, defaulting to fully included', () => {
    const profile = tailoringProfileSchema.parse({ name: 'T', baseSlug: 'main' });
    const state = profileToFormState(master, profile);

    expect(state.experience).toHaveLength(3);
    expect(state.experience.every((e) => e.included && e.hiddenHighlights.size === 0)).toBe(true);
    expect(state.skillIncluded).toEqual([true, true, true]);
    expect(state.skillOrder).toEqual(['', '', '']);
    expect(state.headline).toBe('');
    expect(state.summary).toBe('');
    expect(state.hiddenSections.size).toBe(0);
  });

  it('reflects exclusions, hidden highlights, hidden skills, and order ranks', () => {
    const profile = tailoringProfileSchema.parse({
      name: 'T',
      baseSlug: 'main',
      headline: 'Manager',
      summary: 'Leader.',
      experience: [
        { index: 1, include: false },
        { index: 0, hiddenHighlights: [2] }
      ],
      skills: { hidden: [2], order: [1, 0] },
      hiddenSections: ['projects']
    });
    const state = profileToFormState(master, profile);

    expect(state.headline).toBe('Manager');
    expect(state.experience[1].included).toBe(false);
    expect([...state.experience[0].hiddenHighlights]).toEqual([2]);
    expect(state.skillIncluded).toEqual([true, true, false]);
    // order [1,0] => rank 0 for index 1, rank 1 for index 0
    expect(state.skillOrder).toEqual(['1', '0', '']);
    expect(state.hiddenSections.has('projects')).toBe(true);
  });
});

describe('formStateToProfile', () => {
  it('stores only non-default experience rules', () => {
    const state = profileToFormState(master, tailoringProfileSchema.parse({ name: 'T', baseSlug: 'main' }));
    state.experience[1].included = false; // exclude Globex
    state.experience[0].hiddenHighlights.add(1); // hide a1

    const profile = formStateToProfile(meta, state);
    // Initech (index 2) is fully included => no rule stored
    expect(profile.experience.map((r) => r.index).sort()).toEqual([0, 1]);
    const excluded = profile.experience.find((r) => r.index === 1);
    const hidden = profile.experience.find((r) => r.index === 0);
    expect(excluded?.include).toBe(false);
    expect(hidden?.hiddenHighlights).toEqual([1]);
  });

  it('derives skills.order from numeric ranks and skills.hidden from unchecked groups', () => {
    const state = profileToFormState(master, tailoringProfileSchema.parse({ name: 'T', baseSlug: 'main' }));
    state.skillIncluded[1] = false; // hide Cloud
    state.skillOrder = ['2', '', '1']; // Data(rank1) before Languages(rank2)

    const profile = formStateToProfile(meta, state);
    expect(profile.skills.hidden).toEqual([1]);
    // sorted by rank: index 2 (rank 1) then index 0 (rank 2)
    expect(profile.skills.order).toEqual([2, 0]);
  });

  it('treats blank/empty headline and summary as inherit (undefined)', () => {
    const state = profileToFormState(master, tailoringProfileSchema.parse({ name: 'T', baseSlug: 'main' }));
    state.headline = '   ';
    state.summary = '';
    const profile = formStateToProfile(meta, state);
    expect(profile.headline).toBeUndefined();
    expect(profile.summary).toBeUndefined();
  });
});

describe('round-trip (profile -> state -> profile)', () => {
  it('preserves a profile that contains only non-default rules', () => {
    const original = tailoringProfileSchema.parse({
      name: 'Test Tailoring',
      baseSlug: 'main',
      headline: 'Engineering Manager',
      summary: 'Built and led teams.',
      experience: [
        { index: 0, hiddenHighlights: [1, 2] },
        { index: 2, include: false }
      ],
      skills: { hidden: [1], order: [2, 0] },
      hiddenSections: ['projects', 'education']
    });

    const roundTripped = formStateToProfile(meta, profileToFormState(master, original));

    expect(roundTripped).toEqual(original);
  });
});
