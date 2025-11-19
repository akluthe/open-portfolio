import { cache } from 'react';
import { resumeSchema, type ResumeDocument } from '@/lib/shared-types';

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
