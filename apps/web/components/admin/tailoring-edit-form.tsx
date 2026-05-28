'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ResumeDocument, TailoringProfile } from '@/lib/shared-types';
import { tailoringProfileSchema } from '@/lib/shared-types';

type TailoringEditFormProps = {
  slug: string;
  master: ResumeDocument;
  initialProfile: TailoringProfile;
};

type ExperienceState = {
  included: boolean;
  hiddenHighlights: Set<number>;
};

const SECTION_TOGGLES = ['projects', 'education', 'skills'] as const;
type ToggleSection = (typeof SECTION_TOGGLES)[number];

export default function TailoringEditForm({ slug, master, initialProfile }: TailoringEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [headline, setHeadline] = useState(initialProfile.headline ?? '');
  const [summary, setSummary] = useState(initialProfile.summary ?? '');

  // Build per-entry experience state from the existing overlay rules.
  const ruleByIndex = new Map(initialProfile.experience.map((r) => [r.index, r]));
  const [experience, setExperience] = useState<ExperienceState[]>(() =>
    master.experience.map((_, i) => {
      const rule = ruleByIndex.get(i);
      return {
        included: rule?.include !== false,
        hiddenHighlights: new Set(rule?.hiddenHighlights ?? [])
      };
    })
  );

  // Skills: per-group include + optional numeric order rank.
  const hiddenSkillSet = new Set(initialProfile.skills.hidden);
  const orderRankByIndex = new Map(initialProfile.skills.order.map((idx, rank) => [idx, rank]));
  const [skillIncluded, setSkillIncluded] = useState<boolean[]>(() =>
    master.skills.map((_, i) => !hiddenSkillSet.has(i))
  );
  const [skillOrder, setSkillOrder] = useState<string[]>(() =>
    master.skills.map((_, i) => (orderRankByIndex.has(i) ? String(orderRankByIndex.get(i)) : ''))
  );

  const [hiddenSections, setHiddenSections] = useState<Set<ToggleSection>>(
    () => new Set(initialProfile.hiddenSections)
  );

  const dirty = () => {
    setError(null);
    setSuccess(false);
  };

  const toggleEntry = (i: number) => {
    setExperience((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], included: !next[i].included };
      return next;
    });
    dirty();
  };

  const toggleHighlight = (entryIndex: number, hiIndex: number) => {
    setExperience((prev) => {
      const next = [...prev];
      const hidden = new Set(next[entryIndex].hiddenHighlights);
      if (hidden.has(hiIndex)) {
        hidden.delete(hiIndex);
      } else {
        hidden.add(hiIndex);
      }
      next[entryIndex] = { ...next[entryIndex], hiddenHighlights: hidden };
      return next;
    });
    dirty();
  };

  const toggleSkill = (i: number) => {
    setSkillIncluded((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
    dirty();
  };

  const setOrder = (i: number, value: string) => {
    setSkillOrder((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
    dirty();
  };

  const toggleSection = (section: ToggleSection) => {
    setHiddenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
    dirty();
  };

  const buildProfile = (): TailoringProfile => {
    // Only store experience rules that differ from "fully included" to keep
    // overlays small.
    const experienceRules = experience
      .map((state, index) => ({ state, index }))
      .filter(({ state }) => !state.included || state.hiddenHighlights.size > 0)
      .map(({ state, index }) =>
        state.included
          ? { index, hiddenHighlights: [...state.hiddenHighlights].sort((a, b) => a - b) }
          : { index, include: false }
      );

    const hidden = skillIncluded
      .map((included, i) => ({ included, i }))
      .filter(({ included }) => !included)
      .map(({ i }) => i);

    // Order: take groups with a numeric order value, sort by that value, and
    // emit their indices in that sequence. Groups without a value fall to the
    // end in original order (handled by the resolver).
    const order = skillOrder
      .map((value, i) => ({ rank: Number(value), i, set: value.trim() !== '' && !Number.isNaN(Number(value)) }))
      .filter(({ set }) => set)
      .sort((a, b) => a.rank - b.rank)
      .map(({ i }) => i);

    return tailoringProfileSchema.parse({
      name: initialProfile.name,
      baseSlug: initialProfile.baseSlug,
      headline: headline.trim() || undefined,
      summary: summary.trim() || undefined,
      experience: experienceRules,
      skills: { order, hidden },
      hiddenSections: [...hiddenSections]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const profile = buildProfile();

      const response = await fetch(`/api/profiles/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(err.error || `Update failed (${response.status})`);
      }

      tailoringProfileSchema.parse(await response.json());

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        router.push(`/t/${slug}`);
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'issues' in err) {
        const zodError = err as { issues: Array<{ path: (string | number)[]; message: string }> };
        const messages = zodError.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
        setError(`Validation errors:\n${messages.join('\n')}`);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      {error && (
        <div className="admin-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="admin-success" role="alert">
          Tailoring saved! Redirecting...
        </div>
      )}

      <section className="admin-section">
        <h2>Overrides</h2>
        <p className="admin-user-info">Leave blank to inherit from the master resume.</p>
        <div className="admin-field">
          <label htmlFor="headline">Headline (overrides title)</label>
          <input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => {
              setHeadline(e.target.value);
              dirty();
            }}
            placeholder={master.basics.title}
          />
        </div>
        <div className="admin-field">
          <label htmlFor="summary">Summary</label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              dirty();
            }}
            rows={4}
            placeholder={master.basics.summary ?? master.summary ?? ''}
          />
        </div>
      </section>

      <section className="admin-section">
        <h2>Experience</h2>
        <p className="admin-user-info">Uncheck an entry to hide it, or hide individual bullets.</p>
        {master.experience.map((entry, i) => (
          <div key={i} className="admin-entry">
            <div className="admin-entry-header">
              <label>
                <input
                  type="checkbox"
                  checked={experience[i].included}
                  onChange={() => toggleEntry(i)}
                />{' '}
                <strong>{entry.company}</strong> · {entry.role}
                {entry.period ? ` · ${entry.period}` : ''}
              </label>
            </div>
            {experience[i].included && entry.highlights.length > 0 && (
              <div className="admin-field">
                {entry.highlights.map((highlight, hi) => (
                  <label key={hi} className="admin-highlight-row">
                    <input
                      type="checkbox"
                      checked={!experience[i].hiddenHighlights.has(hi)}
                      onChange={() => toggleHighlight(i, hi)}
                    />{' '}
                    <span>{highlight}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="admin-section">
        <h2>Skills</h2>
        <p className="admin-user-info">
          Uncheck to hide a group. Set an order number to move groups to the front (lowest first);
          leave blank to keep original order.
        </p>
        {master.skills.map((group, i) => (
          <div key={i} className="admin-field admin-highlight-row">
            <input type="checkbox" checked={skillIncluded[i]} onChange={() => toggleSkill(i)} />{' '}
            <span style={{ flex: 1 }}>
              <strong>{group.name}</strong>
              {group.keywords.length > 0 ? ` — ${group.keywords.join(', ')}` : ''}
            </span>
            <input
              type="number"
              aria-label={`Order for ${group.name}`}
              value={skillOrder[i]}
              onChange={(e) => setOrder(i, e.target.value)}
              placeholder="order"
              style={{ width: '5rem' }}
              disabled={!skillIncluded[i]}
            />
          </div>
        ))}
      </section>

      <section className="admin-section">
        <h2>Sections</h2>
        <p className="admin-user-info">Hide entire sections from this tailored version.</p>
        {SECTION_TOGGLES.map((section) => (
          <label key={section} className="admin-highlight-row">
            <input
              type="checkbox"
              checked={hiddenSections.has(section)}
              onChange={() => toggleSection(section)}
            />{' '}
            <span>Hide {section}</span>
          </label>
        ))}
      </section>

      <div className="admin-actions">
        <button type="submit" disabled={isSubmitting} className="admin-button-primary">
          {isSubmitting ? 'Saving...' : 'Save Tailoring'}
        </button>
        <a href={`/t/${slug}`} className="admin-button-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}
