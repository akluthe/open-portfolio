import type { ResumeDocument } from '@resume-platform/shared-types';

export const sampleResume: ResumeDocument = {
  basics: {
    name: 'Jane Example',
    title: 'Staff Engineer',
    summary: 'Builder of resilient platforms.'
  },
  contact: {
    email: 'jane@example.com',
    location: 'Remote'
  },
  experience: [
    {
      company: 'Acme Corp',
      role: 'Lead Engineer',
      period: '2022 - Present',
      location: 'Remote',
      highlights: ['Ran a globally distributed platform.', 'Mentored five engineers.']
    }
  ],
  skills: [
    {
      name: 'Languages',
      keywords: ['TypeScript', 'Go']
    }
  ],
  projects: [
    {
      name: 'Resume Platform',
      description: 'Public resume viewer powered by Next.js.',
      highlights: ['Server-rendered view', 'Admin editing tooling']
    }
  ],
  education: [
    {
      school: 'Tech University',
      degree: 'B.S. Computer Science',
      period: '2012 - 2016',
      highlights: ['Graduated magna cum laude']
    }
  ]
};
