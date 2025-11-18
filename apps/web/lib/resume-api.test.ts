import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => fn
  };
});

import { fetchResumeBySlug } from './resume-api';

const validResumeResponse = {
  basics: {
    name: 'Ada Lovelace',
    title: 'Software Architect',
    summary: 'Invented ways to express algorithms.'
  },
  summary: 'Backup summary',
  contact: {
    email: 'ada@example.com'
  },
  skills: [],
  experience: [],
  education: [],
  projects: []
};

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

describe('fetchResumeBySlug', () => {
  it('returns a parsed resume document when the API responds successfully', async () => {
    process.env.RESUME_API = 'https://api.example.com';

    const fetchSpy = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockResolvedValue(validResumeResponse)
    });

    vi.stubGlobal('fetch', fetchSpy);

    const result = await fetchResumeBySlug('primary candidate');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/resumes/primary%20candidate',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );
    expect(result).toEqual(validResumeResponse);
  });

  it('returns null when the resume is not found', async () => {
    process.env.RESUME_API = 'https://api.example.com';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      json: vi.fn()
    }));

    await expect(fetchResumeBySlug('missing-slug')).resolves.toBeNull();
  });

  it('throws an error when the API returns an unexpected status', async () => {
    process.env.RESUME_API = 'https://api.example.com';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      json: vi.fn()
    }));

    await expect(fetchResumeBySlug('server-error')).rejects.toThrow(
      'Resume API request failed (500)'
    );
  });

  it('throws when RESUME_API is not configured', async () => {
    delete process.env.RESUME_API;

    await expect(fetchResumeBySlug('unconfigured')).rejects.toThrow(
      'Missing RESUME_API environment variable.'
    );
  });
});
