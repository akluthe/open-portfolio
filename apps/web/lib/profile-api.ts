import { cache } from 'react';
import {
  resolveTailoredResume,
  tailoringProfileSchema,
  resumeVersionListSchema,
  type ResumeDocument,
  type ResumeVersionMeta,
  type TailoringProfile
} from '@/lib/shared-types';
import { fetchResumeBySlug } from '@/lib/resume-api';

export type ProfileSummary = {
  slug: string;
  name: string;
  baseSlug: string;
};

function getApiBaseUrl() {
  const value = process.env.RESUME_API;

  if (!value) {
    throw new Error('Missing RESUME_API environment variable.');
  }

  return value.replace(/\/$/, '');
}

export async function listProfiles(): Promise<ProfileSummary[]> {
  const response = await fetch(`${getApiBaseUrl()}/profiles`, {
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Profile API list failed (${response.status})`);
  }

  const json = await response.json();
  return Array.isArray(json) ? (json as ProfileSummary[]) : [];
}

async function requestProfile(slug: string): Promise<TailoringProfile | null> {
  const response = await fetch(`${getApiBaseUrl()}/profiles/${encodeURIComponent(slug)}`, {
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Profile API request failed (${response.status})`);
  }

  const json = await response.json();
  return tailoringProfileSchema.parse(json);
}

export const fetchProfile = cache((slug: string) => requestProfile(slug));

export async function upsertProfile(
  slug: string,
  profile: TailoringProfile,
  token: string
): Promise<TailoringProfile> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(`${getApiBaseUrl()}/profiles/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profile),
    cache: 'no-store'
  });

  if (response.status === 400) {
    const error = await response.json().catch(() => ({ error: 'Validation failed' }));
    throw new Error(error.error || 'Validation failed');
  }

  if (!response.ok) {
    throw new Error(`Profile API update failed (${response.status})`);
  }

  const json = await response.json();
  return tailoringProfileSchema.parse(json);
}

// --- Version history (all authenticated). Profile versions store the overlay doc;
// the UI resolves it against the current master for preview. ---

function authHeaders(token: string): HeadersInit {
  return { Accept: 'application/json', Authorization: `Bearer ${token}` };
}

export async function listProfileVersions(
  slug: string,
  token: string
): Promise<ResumeVersionMeta[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/profiles/${encodeURIComponent(slug)}/versions`,
    { headers: authHeaders(token), cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Profile versions list failed (${response.status})`);
  }

  return resumeVersionListSchema.parse(await response.json());
}

export async function fetchProfileVersion(
  slug: string,
  version: number,
  token: string
): Promise<TailoringProfile | null> {
  const response = await fetch(
    `${getApiBaseUrl()}/profiles/${encodeURIComponent(slug)}/versions/${version}`,
    { headers: authHeaders(token), cache: 'no-store' }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Profile version fetch failed (${response.status})`);
  }

  return tailoringProfileSchema.parse(await response.json());
}

export async function restoreProfileVersion(
  slug: string,
  version: number,
  token: string
): Promise<TailoringProfile> {
  const response = await fetch(
    `${getApiBaseUrl()}/profiles/${encodeURIComponent(slug)}/versions/${version}/restore`,
    { method: 'POST', headers: authHeaders(token), cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Profile version restore failed (${response.status})`);
  }

  return tailoringProfileSchema.parse(await response.json());
}

export async function deleteProfile(slug: string, token: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/profiles/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Profile API delete failed (${response.status})`);
  }
}

/**
 * Convenience: fetch a tailoring profile, fetch its base master resume, and
 * return the resolved ResumeDocument. Returns null if either is missing.
 */
export const fetchResolvedResume = cache(
  async (slug: string): Promise<ResumeDocument | null> => {
    const profile = await fetchProfile(slug);

    if (!profile) {
      return null;
    }

    const master = await fetchResumeBySlug(profile.baseSlug);

    if (!master) {
      return null;
    }

    return resolveTailoredResume(master, profile);
  }
);
