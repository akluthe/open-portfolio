import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ResumeDocument } from '@/lib/shared-types';
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
  it('renders the primary resume header and stacked contact block', () => {
    render(<ResumeView resume={buildResume()} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ada Lovelace');
    expect(screen.getByText('Software Architect')).toBeInTheDocument();
    // Letterpress renders contact lines stacked; the website drops its protocol.
    expect(screen.getByText('London, UK')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getByText('ada.dev')).toBeInTheDocument();
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

  it('renders a nested entry with the company once and a row per sub-role', () => {
    const resume = buildResume({
      experience: [
        {
          company: 'Anheuser-Busch InBev',
          role: 'Engineering Manager & Technical Lead',
          period: 'Jul 2022 – Present',
          location: 'St. Louis, MO',
          highlights: [],
          roles: [
            { role: 'Zone Integrations Lead', period: 'Feb 2026 – Present', highlights: ['Led integration delivery.'] },
            { role: 'Tech Lead', period: 'Mar 2023 – Mar 2024', highlights: ['Owned API architecture.'] }
          ]
        }
      ]
    });

    render(<ResumeView resume={resume} />);

    // Company name is shown once (as the .r-co line).
    expect(screen.getAllByText('Anheuser-Busch InBev')).toHaveLength(1);

    // Each sub-role renders its own role line.
    expect(screen.getByText('Zone Integrations Lead')).toBeInTheDocument();
    expect(screen.getByText('Tech Lead')).toBeInTheDocument();

    // Sub-role periods and highlights render.
    expect(screen.getByText('Feb 2026 – Present')).toBeInTheDocument();
    expect(screen.getByText('Led integration delivery.')).toBeInTheDocument();
    expect(screen.getByText('Owned API architecture.')).toBeInTheDocument();
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
