import { describe, expect, it } from 'vitest';
import { buildResumeFilename } from '@/lib/resume-filename';
import type { ResumeDocument } from '@/lib/shared-types';

function doc(overrides: Partial<ResumeDocument> = {}): ResumeDocument {
  return {
    basics: { name: 'Andrew Kluthe', title: 'Senior Engineering Manager', summary: '' },
    contact: { location: '', email: 'a@b.com' },
    skills: [],
    experience: [],
    education: [],
    projects: [],
    ...overrides
  } as ResumeDocument;
}

describe('buildResumeFilename', () => {
  const opts = { slug: 'databank-engmgr', fallbackDate: '2026-05-30' };

  it('composes name + title + fallback date with a safe extension', () => {
    expect(buildResumeFilename(doc(), 'pdf', opts)).toBe(
      'Andrew-Kluthe_Senior-Engineering-Manager_2026-05-30.pdf'
    );
  });

  it('prefers the document lastUpdated over the fallback date', () => {
    expect(buildResumeFilename(doc({ lastUpdated: '2026-01-15' }), 'pdf', opts)).toBe(
      'Andrew-Kluthe_Senior-Engineering-Manager_2026-01-15.pdf'
    );
  });

  it('strips header-unsafe characters from the title', () => {
    const name = buildResumeFilename(
      doc({ basics: { name: 'Andrew Kluthe', title: 'Sr. Eng Mgr — Frontend & Platform', summary: '' } }),
      'pdf',
      opts
    );
    expect(name).toBe('Andrew-Kluthe_Sr-Eng-Mgr-Frontend-Platform_2026-05-30.pdf');
    expect(name).toMatch(/^[A-Za-z0-9._-]+$/); // ASCII, header-safe
  });

  it('folds accents to ASCII without leaving stray dashes', () => {
    expect(
      buildResumeFilename(doc({ basics: { name: 'José Núñez', title: 'Engineer', summary: '' } }), 'pdf', opts)
    ).toBe('Jose-Nunez_Engineer_2026-05-30.pdf');
  });

  it('uses the requested extension (e.g. typst)', () => {
    expect(buildResumeFilename(doc(), 'typ', opts)).toMatch(/\.typ$/);
  });

  it('ignores a non-ISO lastUpdated and uses the fallback date', () => {
    expect(buildResumeFilename(doc({ lastUpdated: 'last week' }), 'pdf', opts)).toContain('2026-05-30');
  });
});
