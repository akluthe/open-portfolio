import { z } from 'zod';

const contactSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    location: z.string().optional(),
    links: z
      .array(
        z.object({
          label: z.string(),
          url: z.string().url()
        })
      )
      .optional()
  })
  .optional();

const highlightSchema = z.string().min(1);

const subRoleSchema = z.object({
  role: z.string().min(1),
  period: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  highlights: z.array(highlightSchema).default([])
});

const experienceEntrySchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  period: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  highlights: z.array(highlightSchema).default([]),
  // When present and non-empty, the entry represents one company with multiple
  // nested roles: the entry-level `role` is a company-level arc label and
  // entry-level `highlights` should be empty. When absent, behavior is the
  // legacy single-role + flat-highlights form.
  roles: z.array(subRoleSchema).optional()
});

const educationEntrySchema = z.object({
  school: z.string().min(1),
  degree: z.string().optional(),
  field: z.string().optional(),
  period: z.string().optional(),
  highlights: z.array(highlightSchema).default([])
});

const skillGroupSchema = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string().min(1)).default([])
});

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url().optional(),
  highlights: z.array(highlightSchema).default([])
});

export const resumeSchema = z.object({
  basics: z.object({
    name: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().optional()
  }),
  summary: z.string().optional(),
  contact: contactSchema,
  skills: z.array(skillGroupSchema).default([]),
  experience: z.array(experienceEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  projects: z.array(projectSchema).default([]),
  lastUpdated: z.string().optional()
});

export type ResumeDocument = z.infer<typeof resumeSchema>;
export type ResumeExperience = z.infer<typeof experienceEntrySchema>;
export type ResumeSubRole = z.infer<typeof subRoleSchema>;
export type ResumeSkillGroup = z.infer<typeof skillGroupSchema>;
