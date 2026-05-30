import { cache } from 'react';
import {
  resumeSchema,
  resumeVersionListSchema,
  type ResumeDocument,
  type ResumeVersionMeta
} from '@/lib/shared-types';

function getApiBaseUrl() {
  const value = process.env.RESUME_API;

  if (!value) {
    throw new Error('Missing RESUME_API environment variable.');
  }

  return value.replace(/\/$/, '');
}

async function requestResume(slug: string): Promise<ResumeDocument | null> {
  const response = await fetch(`${getApiBaseUrl()}/resumes/${encodeURIComponent(slug)}`, {
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Resume API request failed (${response.status})`);
  }

  const json = await response.json();
  return resumeSchema.parse(json);
}

export const fetchResumeBySlug = cache((slug: string) => requestResume(slug));

export async function updateResumeBySlug(
  slug: string,
  resume: ResumeDocument,
  token: string
): Promise<ResumeDocument> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(`${getApiBaseUrl()}/resumes/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(resume),
    cache: 'no-store'
  });

  if (response.status === 400) {
    const error = await response.json().catch(() => ({ error: 'Validation failed' }));
    throw new Error(error.error || 'Validation failed');
  }

  if (!response.ok) {
    throw new Error(`Resume API update failed (${response.status})`);
  }

  const json = await response.json();
  return resumeSchema.parse(json);
}

// --- Version history (all authenticated; the .NET endpoints require a Bearer token). ---

function authHeaders(token: string): HeadersInit {
  return { Accept: 'application/json', Authorization: `Bearer ${token}` };
}

export async function listResumeVersions(
  slug: string,
  token: string
): Promise<ResumeVersionMeta[]> {
  const response = await fetch(
    `${getApiBaseUrl()}/resumes/${encodeURIComponent(slug)}/versions`,
    { headers: authHeaders(token), cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Resume versions list failed (${response.status})`);
  }

  return resumeVersionListSchema.parse(await response.json());
}

export async function fetchResumeVersion(
  slug: string,
  version: number,
  token: string
): Promise<ResumeDocument | null> {
  const response = await fetch(
    `${getApiBaseUrl()}/resumes/${encodeURIComponent(slug)}/versions/${version}`,
    { headers: authHeaders(token), cache: 'no-store' }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Resume version fetch failed (${response.status})`);
  }

  return resumeSchema.parse(await response.json());
}

export async function restoreResumeVersion(
  slug: string,
  version: number,
  token: string
): Promise<ResumeDocument> {
  const response = await fetch(
    `${getApiBaseUrl()}/resumes/${encodeURIComponent(slug)}/versions/${version}/restore`,
    { method: 'POST', headers: authHeaders(token), cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error(`Resume version restore failed (${response.status})`);
  }

  return resumeSchema.parse(await response.json());
}
