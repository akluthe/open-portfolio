import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => fn
  };
});

import {
  fetchResumeBySlug,
  listResumeVersions,
  fetchResumeVersion,
  restoreResumeVersion
} from './resume-api';

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

describe('resume version history', () => {
  it('lists versions with a Bearer token, validated against the schema', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    const versions = [
      { version: 2, createdAt: '2026-05-30T00:00:00Z', createdBy: 'user_1', changeSummary: null },
      { version: 1, createdAt: '2026-05-01T00:00:00Z', createdBy: null, changeSummary: 'Imported initial version' }
    ];
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(versions)
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await listResumeVersions('main', 'tok123');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/resumes/main/versions',
      expect.objectContaining({
        headers: { Accept: 'application/json', Authorization: 'Bearer tok123' },
        cache: 'no-store'
      })
    );
    expect(result).toEqual(versions);
  });

  it('fetches a single version document', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(validResumeResponse)
    }));

    await expect(fetchResumeVersion('main', 1, 'tok')).resolves.toEqual(validResumeResponse);
  });

  it('returns null when a version is missing', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: vi.fn() }));

    await expect(fetchResumeVersion('main', 99, 'tok')).resolves.toBeNull();
  });

  it('restores a version via POST and returns the restored document', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(validResumeResponse)
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await restoreResumeVersion('main', 1, 'tok');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com/resumes/main/versions/1/restore',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toEqual(validResumeResponse);
  });

  it('throws when restore fails', async () => {
    process.env.RESUME_API = 'https://api.example.com';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: vi.fn() }));

    await expect(restoreResumeVersion('main', 1, 'tok')).rejects.toThrow(
      'Resume version restore failed (500)'
    );
  });
});
