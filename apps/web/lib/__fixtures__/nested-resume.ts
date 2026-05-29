import type { ResumeDocument } from '@/lib/shared-types';

/**
 * A resolved resume that includes a company with nested, dated sub-roles
 * (mirrors the Anheuser-Busch shape the DataBank overlay tailors). Used to
 * exercise the nested-role rendering path across all three Typst layouts.
 */
export const nestedResume: ResumeDocument = {
  basics: {
    name: 'Andrew Example',
    title: 'Senior Engineering Manager',
    summary: 'Frontend-focused engineering leader modernizing legacy systems.'
  },
  contact: {
    email: 'andrew@example.com',
    phone: '(555) 010-2030',
    website: 'andrew.example.com',
    location: 'St. Louis, MO'
  },
  skills: [
    { name: 'Languages', keywords: ['TypeScript', 'JavaScript', 'Go'] },
    { name: 'Frontend', keywords: ['React', 'Next.js', 'Module Federation'] }
  ],
  experience: [
    {
      company: 'Anheuser-Busch InBev',
      role: 'Engineering arc across supply-apps',
      location: 'St. Louis, MO',
      period: '2018 — Present',
      highlights: [],
      roles: [
        {
          role: 'Zone Integrations Lead, SAP Aurora Program',
          period: 'Feb 2026 — Present',
          highlights: [
            'Lead integration delivery for the SAP Canada rollout.',
            'Built AI-assisted planning tooling for requirements-to-backlog.'
          ]
        },
        {
          role: 'Senior Engineering Manager, Supply Apps',
          startDate: '2022',
          endDate: '2026',
          highlights: [
            'Built and grew a globally distributed engineering team.',
            'Led the rebuild of brewery-floor apps onto React.'
          ]
        },
        {
          role: 'Engineering Manager',
          period: '2020 — 2022',
          highlights: ['Established the React microfrontend foundation.']
        },
        {
          role: 'Senior Software Engineer',
          period: '2018 — 2020',
          highlights: ['Shipped the first component-driven brewery app.']
        }
      ]
    },
    {
      company: 'Acme Corp',
      role: 'Lead Engineer',
      period: '2015 — 2018',
      location: 'Remote',
      highlights: ['Ran a platform.', 'Mentored engineers.']
    }
  ],
  projects: [
    {
      name: 'open-portfolio',
      description: 'Resume platform with Typst PDF export.',
      highlights: ['Server-rendered public resume view.']
    }
  ],
  education: [
    {
      school: 'State University',
      degree: 'B.S. Computer Science',
      period: '2007 — 2011',
      highlights: []
    }
  ]
};
