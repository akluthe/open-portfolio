import { cache } from 'react';
import { resumeSchema, type ResumeDocument } from '@resume-platform/shared-types';

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
