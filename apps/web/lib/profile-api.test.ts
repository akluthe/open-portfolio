import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => fn
  };
});

import { listProfiles, fetchProfile, fetchResolvedResume } from './profile-api';

const originalEnv = process.env.RESUME_API;

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.RESUME_API;
  } else {
    process.env.RESUME_API = originalEnv;
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const okJson = (body: unknown) => ({ status: 200, ok: true, json: vi.fn().mockResolvedValue(body) });

describe('listProfiles', () => {
  it('returns the profile summary array', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    const summaries = [{ slug: 'a', name: 'A', baseSlug: 'main' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson(summaries)));

    await expect(listProfiles()).resolves.toEqual(summaries);
  });

  it('tolerates a non-array body by returning []', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({})));

    await expect(listProfiles()).resolves.toEqual([]);
  });
});

describe('fetchProfile', () => {
  it('parses the overlay (filling schema defaults)', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ name: 'A', baseSlug: 'main' })));

    const profile = await fetchProfile('a');
    expect(profile?.name).toBe('A');
    expect(profile?.experience).toEqual([]); // default applied
    expect(profile?.skills).toEqual({ order: [], hidden: [] });
  });

  it('returns null on 404', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false, json: vi.fn() }));
    await expect(fetchProfile('missing')).resolves.toBeNull();
  });

  it('throws on unexpected status', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500, ok: false, json: vi.fn() }));
    await expect(fetchProfile('boom')).rejects.toThrow('Profile API request failed (500)');
  });
});

describe('fetchResolvedResume', () => {
  const master = {
    basics: { name: 'Jane', title: 'Staff Engineer', summary: 'Master summary.' },
    summary: 'Master summary.',
    skills: [],
    experience: [{ company: 'Acme', role: 'Lead', highlights: ['x', 'y'] }],
    education: [],
    projects: []
  };

  it('composes profile + master into a resolved document with overrides applied', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    const profile = { name: 'T', baseSlug: 'main', headline: 'Manager', experience: [{ index: 0, hiddenHighlights: [0] }] };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/profiles/')) return Promise.resolve(okJson(profile));
        if (url.includes('/resumes/')) return Promise.resolve(okJson(master));
        throw new Error(`unexpected url ${url}`);
      })
    );

    const resolved = await fetchResolvedResume('t');
    expect(resolved?.basics.title).toBe('Manager'); // headline override
    expect(resolved?.experience[0].highlights).toEqual(['y']); // hid highlight 0
  });

  it('returns null when the profile is missing', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false, json: vi.fn() }));
    await expect(fetchResolvedResume('nope')).resolves.toBeNull();
  });

  it('returns null when the base master is missing', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    const profile = { name: 'T', baseSlug: 'ghost' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        url.includes('/profiles/')
          ? Promise.resolve(okJson(profile))
          : Promise.resolve({ status: 404, ok: false, json: vi.fn() })
      )
    );
    await expect(fetchResolvedResume('t')).resolves.toBeNull();
  });
});
