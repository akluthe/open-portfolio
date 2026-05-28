import {
  tailoringProfileSchema,
  type ResumeDocument,
  type TailoringProfile
} from '@/lib/shared-types';

export type TailoringSection = 'projects' | 'education' | 'skills';

export const TAILORING_SECTIONS: readonly TailoringSection[] = ['projects', 'education', 'skills'];

export type ExperienceRuleState = {
  included: boolean;
  hiddenHighlights: Set<number>;
};

/**
 * UI-facing form state for the tailoring editor. Mirrors the master resume's
 * shape positionally (one entry per master experience / skill group) so the
 * editor can render checkboxes against the master while collecting overlay
 * selections.
 */
export type TailoringFormState = {
  headline: string;
  summary: string;
  experience: ExperienceRuleState[];
  skillIncluded: boolean[];
  skillOrder: string[]; // numeric strings; '' means "no explicit order"
  hiddenSections: Set<TailoringSection>;
};

/**
 * Expand a stored overlay into editor state, positioned against the master.
 * Inverse of {@link formStateToProfile} for non-default rules.
 */
export function profileToFormState(
  master: ResumeDocument,
  profile: TailoringProfile
): TailoringFormState {
  const ruleByIndex = new Map(profile.experience.map((r) => [r.index, r]));
  const hiddenSkills = new Set(profile.skills.hidden);
  const orderRank = new Map(profile.skills.order.map((idx, rank) => [idx, rank]));

  return {
    headline: profile.headline ?? '',
    summary: profile.summary ?? '',
    experience: master.experience.map((_, i) => {
      const rule = ruleByIndex.get(i);
      return {
        included: rule?.include !== false,
        hiddenHighlights: new Set(rule?.hiddenHighlights ?? [])
      };
    }),
    skillIncluded: master.skills.map((_, i) => !hiddenSkills.has(i)),
    skillOrder: master.skills.map((_, i) => (orderRank.has(i) ? String(orderRank.get(i)) : '')),
    hiddenSections: new Set(profile.hiddenSections)
  };
}

/**
 * Collapse editor state back into a minimal, schema-valid overlay. Only stores
 * experience rules that differ from "fully included", and only skill groups
 * with an explicit numeric order participate in `skills.order` (sorted by that
 * number; everything else keeps master order via the resolver).
 */
export function formStateToProfile(
  meta: { name: string; baseSlug: string },
  state: TailoringFormState
): TailoringProfile {
  const experience = state.experience
    .map((s, index) => ({ s, index }))
    .filter(({ s }) => !s.included || s.hiddenHighlights.size > 0)
    .map(({ s, index }) =>
      s.included
        ? { index, hiddenHighlights: [...s.hiddenHighlights].sort((a, b) => a - b) }
        : { index, include: false }
    );

  const hidden = state.skillIncluded
    .map((included, i) => ({ included, i }))
    .filter(({ included }) => !included)
    .map(({ i }) => i);

  const order = state.skillOrder
    .map((value, i) => ({ value, i }))
    .filter(({ value }) => value.trim() !== '' && !Number.isNaN(Number(value)))
    .sort((a, b) => Number(a.value) - Number(b.value))
    .map(({ i }) => i);

  return tailoringProfileSchema.parse({
    name: meta.name,
    baseSlug: meta.baseSlug,
    headline: state.headline.trim() || undefined,
    summary: state.summary.trim() || undefined,
    experience,
    skills: { order, hidden },
    hiddenSections: [...state.hiddenSections]
  });
}
