import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ResumeDocument } from '@resume-platform/shared-types';
import ResumeView from './resume-view';

const baseResume: ResumeDocument = {
  basics: {
    name: 'Ada Lovelace',
    title: 'Software Architect',
    summary: 'Invented a new way to explain analytical engines.'
  },
  summary: 'Fallback resume summary used across the platform.',
  contact: {
    location: 'London, UK',
    email: 'ada@example.com',
    phone: '555-0100',
    website: 'https://ada.dev'
  },
  skills: [
    {
      name: 'Programming',
      keywords: ['Algorithms', 'Mathematics']
    }
  ],
  experience: [
    {
      company: 'Babbage Engines',
      role: 'Chief Engineer',
      period: '1842 – 1843',
      location: 'London',
      highlights: ['Developed algorithms for the Analytical Engine.']
    }
  ],
  education: [
    {
      school: 'University of London',
      degree: 'Mathematics',
      field: 'Computing',
      period: '1830 – 1832',
      highlights: ['Graduated with honors.']
    }
  ],
  projects: [
    {
      name: 'Analytical Engine',
      description: 'An early description of a mechanical general-purpose computer.',
      highlights: ['Drafted the first algorithm intended to be processed by a machine.']
    }
  ],
  lastUpdated: '1843-12-10'
};

function buildResume(overrides: Partial<ResumeDocument> = {}): ResumeDocument {
  return {
    ...baseResume,
    ...overrides,
    basics: {
      ...baseResume.basics,
      ...(overrides.basics ?? {})
    },
    contact: overrides.contact ?? baseResume.contact,
    skills: overrides.skills ?? baseResume.skills,
    experience: overrides.experience ?? baseResume.experience,
    education: overrides.education ?? baseResume.education,
    projects: overrides.projects ?? baseResume.projects
  };
}

describe('ResumeView', () => {
  it('renders the primary resume header and contact line', () => {
    render(<ResumeView resume={buildResume()} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ada Lovelace');
    expect(screen.getByText('Software Architect')).toBeInTheDocument();
    expect(
      screen.getByText('London, UK · ada@example.com · 555-0100 · https://ada.dev')
    ).toBeInTheDocument();
  });

  it('falls back to the root summary when basics summary is missing', () => {
    const resume = buildResume({
      basics: {
        ...baseResume.basics,
        summary: undefined
      },
      summary: 'Rendered from the legacy summary field.'
    });

    render(<ResumeView resume={resume} />);

    expect(screen.getByText('Rendered from the legacy summary field.')).toBeInTheDocument();
  });

  it('derives a readable date range when period is not provided', () => {
    const resume = buildResume({
      experience: [
        {
          ...baseResume.experience[0],
          period: undefined,
          startDate: 'Jan 2020',
          endDate: 'Dec 2021'
        }
      ]
    });

    render(<ResumeView resume={resume} />);

    expect(screen.getByText('Jan 2020 – Dec 2021')).toBeInTheDocument();
  });

  it('omits optional resume sections when there is no data', () => {
    const resume = buildResume({
      skills: [],
      projects: [],
      education: [],
      experience: []
    });

    render(<ResumeView resume={resume} />);

    expect(screen.queryByText('SKILLS')).not.toBeInTheDocument();
    expect(screen.queryByText('PROJECTS')).not.toBeInTheDocument();
    expect(screen.queryByText('EDUCATION')).not.toBeInTheDocument();
    expect(screen.queryByText('EXPERIENCE')).not.toBeInTheDocument();
  });
});
