import { z } from 'zod';
import { resumeSchema, type ResumeDocument } from './resume';

const experienceRuleSchema = z.object({
  index: z.number().int().nonnegative(),
  include: z.boolean().default(true),
  hiddenHighlights: z.array(z.number().int().nonnegative()).default([])
});

export const tailoringProfileSchema = z.object({
  name: z.string().min(1),                 // display name, e.g. "Databank — Sr Eng Mgr"
  baseSlug: z.string().min(1).default('main'),
  headline: z.string().optional(),         // overrides basics.title
  summary: z.string().optional(),          // overrides summary
  experience: z.array(experienceRuleSchema).default([]),
  skills: z
    .object({
      order: z.array(z.number().int().nonnegative()).default([]),
      hidden: z.array(z.number().int().nonnegative()).default([])
    })
    .default({ order: [], hidden: [] }),
  hiddenSections: z.array(z.enum(['projects', 'education', 'skills'])).default([]),
  lastUpdated: z.string().optional()
});

export type TailoringProfile = z.infer<typeof tailoringProfileSchema>;

/**
 * Apply a tailoring overlay to a master resume. Pure, defensive (ignores
 * out-of-range indices), and guaranteed to return a schema-valid ResumeDocument.
 *
 * Addressing is index-based: experience entries are identified by their array
 * index in the master, and highlights by their index within an entry. If the
 * master is structurally reordered, a profile's selections may need re-checking.
 */
export function resolveTailoredResume(
  master: ResumeDocument,
  profile: TailoringProfile
): ResumeDocument {
  const ruleByIndex = new Map(profile.experience.map((r) => [r.index, r]));

  const experience = master.experience
    .map((entry, i) => ({ entry, rule: ruleByIndex.get(i) }))
    .filter(({ rule }) => rule?.include !== false)
    .map(({ entry, rule }) => {
      if (!rule || rule.hiddenHighlights.length === 0) return entry;
      const hidden = new Set(rule.hiddenHighlights);
      return { ...entry, highlights: entry.highlights.filter((_, hi) => !hidden.has(hi)) };
    });

  const hiddenSkills = new Set(profile.skills.hidden);
  const visibleSkills = master.skills
    .map((group, i) => ({ group, i }))
    .filter(({ i }) => !hiddenSkills.has(i));
  const orderRank = new Map(profile.skills.order.map((idx, rank) => [idx, rank]));
  const skills = visibleSkills
    .sort((a, b) => {
      const ra = orderRank.has(a.i) ? orderRank.get(a.i)! : Number.MAX_SAFE_INTEGER;
      const rb = orderRank.has(b.i) ? orderRank.get(b.i)! : Number.MAX_SAFE_INTEGER;
      return ra === rb ? a.i - b.i : ra - rb;
    })
    .map(({ group }) => group);

  const hide = new Set(profile.hiddenSections);
  const summary = profile.summary ?? master.basics.summary ?? master.summary;

  const resolved: ResumeDocument = {
    ...master,
    basics: {
      ...master.basics,
      title: profile.headline ?? master.basics.title,
      summary
    },
    summary,
    experience,
    skills: hide.has('skills') ? [] : skills,
    projects: hide.has('projects') ? [] : master.projects,
    education: hide.has('education') ? [] : master.education
  };

  return resumeSchema.parse(resolved);
}
