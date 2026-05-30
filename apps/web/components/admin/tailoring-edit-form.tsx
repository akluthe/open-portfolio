'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ResumeDocument, TailoringProfile } from '@/lib/shared-types';
import { tailoringProfileSchema } from '@/lib/shared-types';
import {
  profileToFormState,
  formStateToProfile,
  TAILORING_SECTIONS,
  type ExperienceRuleState,
  type TailoringSection
} from '@/lib/tailoring-form';
import Icon from '@/components/ui/icon';
import ResumeView, { type ResumeViewOpts } from '@/components/resume/resume-view';

type TailoringEditFormProps = {
  slug: string;
  master: ResumeDocument;
  initialProfile: TailoringProfile;
};

export default function TailoringEditForm({ slug, master, initialProfile }: TailoringEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Expand the stored overlay into positional editor state (pure; see lib/tailoring-form).
  const [initial] = useState(() => profileToFormState(master, initialProfile));
  const [headline, setHeadline] = useState(initial.headline);
  const [summary, setSummary] = useState(initial.summary);
  const [experience, setExperience] = useState<ExperienceRuleState[]>(initial.experience);
  const [skillIncluded, setSkillIncluded] = useState<boolean[]>(initial.skillIncluded);
  const [skillOrder, setSkillOrder] = useState<string[]>(initial.skillOrder);
  const [hiddenSections, setHiddenSections] = useState<Set<TailoringSection>>(initial.hiddenSections);

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

  const toggleSection = (section: TailoringSection) => {
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

  const buildProfile = (): TailoringProfile =>
    formStateToProfile(
      { name: initialProfile.name, baseSlug: initialProfile.baseSlug },
      { headline, summary, experience, skillIncluded, skillOrder, hiddenSections }
    );

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

  const previewOpts: ResumeViewOpts = {
    headline: headline || undefined,
    summary: summary || undefined,
    cutJobs: new Set(
      experience
        .map((e, i) => ({ e, i }))
        .filter((x) => !x.e.included)
        .map((x) => x.i)
    ),
    cutBullets: experience.reduce<Record<number, Set<number>>>((acc, e, i) => {
      if (e.included && e.hiddenHighlights.size > 0) {
        acc[i] = new Set(e.hiddenHighlights);
      }
      return acc;
    }, {}),
    hiddenSections: new Set<string>([...hiddenSections]),
    skillOrder: skillIncluded
      .map((included, i) => ({ included, i }))
      .filter((x) => x.included)
      .sort((a, b) => {
        const oa = parseFloat(skillOrder[a.i]);
        const ob = parseFloat(skillOrder[b.i]);
        const ra = Number.isNaN(oa) ? Infinity : oa;
        const rb = Number.isNaN(ob) ? Infinity : ob;
        if (ra !== rb) return ra - rb;
        return a.i - b.i;
      })
      .map((x) => x.i),
    showCuts: true
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="split">
        <div className="split-form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-ok">Tailoring saved — redirecting…</div>}

          <div className="section-block">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="sb-title">Overrides</span>
              <span className="hint">blank = inherit master</span>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label className="lbl" htmlFor="headline">
                Headline
              </label>
              <input
                id="headline"
                className="input"
                type="text"
                value={headline}
                onChange={(e) => {
                  setHeadline(e.target.value);
                  dirty();
                }}
                placeholder={master.basics.title}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="lbl" htmlFor="summary">
                Summary
              </label>
              <textarea
                id="summary"
                className="textarea"
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  dirty();
                }}
                rows={4}
                placeholder={master.basics.summary ?? master.summary ?? ''}
              />
            </div>
          </div>

          <div className="section-block">
            <div className="sb-head">
              <span className="sb-title">Experience</span>
              <span className="hint">uncheck to cut · toggle bullets</span>
            </div>
            {master.experience.map((entry, i) => (
              <div key={i} className="entry" style={{ marginBottom: 10 }}>
                <label className={'tog ' + (experience[i].included ? 'on' : 'off')}>
                  <input
                    type="checkbox"
                    checked={experience[i].included}
                    onChange={() => toggleEntry(i)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="box">
                    <Icon name="check" size={12} stroke={2.4} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <strong>{entry.company}</strong> · {entry.role}
                    {entry.period ? ` · ${entry.period}` : ''}
                  </span>
                </label>
                {experience[i].included && entry.highlights.length > 0 && (
                  <div style={{ marginTop: 10, paddingLeft: 30, display: 'grid', gap: 6 }}>
                    {entry.highlights.map((highlight, hi) => {
                      const on = !experience[i].hiddenHighlights.has(hi);
                      return (
                        <label key={hi} className={'tog ' + (on ? 'on' : 'off')}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleHighlight(i, hi)}
                            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                          />
                          <span className="box">
                            <Icon name="check" size={12} stroke={2.4} />
                          </span>
                          <span style={{ flex: 1 }}>{highlight}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="section-block">
            <div className="sb-head">
              <span className="sb-title">Skills</span>
              <span className="hint">order moves a group to the front</span>
            </div>
            {master.skills.map((group, i) => (
              <div key={i} className="row gap12" style={{ marginBottom: 9, alignItems: 'center' }}>
                <label
                  className={'tog ' + (skillIncluded[i] ? 'on' : 'off')}
                  style={{ flex: 1 }}
                >
                  <input
                    type="checkbox"
                    checked={skillIncluded[i]}
                    onChange={() => toggleSkill(i)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="box">
                    <Icon name="check" size={12} stroke={2.4} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <strong>{group.name}</strong>
                    {group.keywords.length > 0 && (
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 6 }}
                      >
                        {group.keywords.join(' · ')}
                      </span>
                    )}
                  </span>
                </label>
                <input
                  className="input"
                  type="number"
                  aria-label={`Order for ${group.name}`}
                  value={skillOrder[i]}
                  onChange={(e) => setOrder(i, e.target.value)}
                  disabled={!skillIncluded[i]}
                  style={{ width: 54, textAlign: 'center', fontFamily: 'var(--mono)' }}
                />
              </div>
            ))}
          </div>

          <div className="section-block" style={{ marginBottom: 0 }}>
            <div className="sb-head">
              <span className="sb-title">Sections</span>
            </div>
            <div className="row gap16" style={{ flexWrap: 'wrap' }}>
              {TAILORING_SECTIONS.map((section) => (
                <label
                  key={section}
                  className={'tog ' + (hiddenSections.has(section) ? 'on' : 'off')}
                >
                  <input
                    type="checkbox"
                    checked={hiddenSections.has(section)}
                    onChange={() => toggleSection(section)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="box">
                    <Icon name="check" size={12} stroke={2.4} />
                  </span>
                  <span style={{ fontSize: 13 }}>Hide {section}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="split-preview">
          <div className="preview-tab">
            <span className="dot2" /> live preview · /t/{slug}
          </div>
          <div className="preview-frame">
            <div className="preview-scale">
              <ResumeView resume={master} opts={previewOpts} pad="44px 52px 60px" />
            </div>
          </div>
        </div>
      </div>

      <div className="savebar">
        <div className="spacer" />
        <button className="btn btn-acc" type="submit" disabled={isSubmitting}>
          <Icon name="save" size={15} /> {isSubmitting ? 'Saving…' : 'Save tailoring'}
        </button>
      </div>
    </form>
  );
}
