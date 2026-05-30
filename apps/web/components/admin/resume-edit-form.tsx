'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ResumeDocument, ResumeExperience } from '@/lib/shared-types';
import { resumeSchema } from '@/lib/shared-types';
import Icon from '@/components/ui/icon';
import ResumeView from '@/components/resume/resume-view';

type ResumeEditFormProps = {
  slug: string;
  initialResume: ResumeDocument;
};

export default function ResumeEditForm({ slug, initialResume }: ResumeEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [basics, setBasics] = useState({
    name: initialResume.basics.name,
    title: initialResume.basics.title,
    summary: initialResume.basics.summary ?? ''
  });

  const [experience, setExperience] = useState<ResumeExperience[]>(
    initialResume.experience.length > 0
      ? initialResume.experience
      : [{ company: '', role: '', period: '', highlights: [] }]
  );

  const handleBasicsChange = (field: 'name' | 'title' | 'summary', value: string) => {
    setBasics((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleExperienceChange = (
    index: number,
    field: keyof ResumeExperience,
    value: string | string[]
  ) => {
    setExperience((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setError(null);
    setSuccess(false);
  };

  const addExperienceEntry = () => {
    setExperience((prev) => [...prev, { company: '', role: '', period: '', highlights: [] }]);
  };

  const removeExperienceEntry = (index: number) => {
    setExperience((prev) => prev.filter((_, i) => i !== index));
  };

  const addHighlight = (expIndex: number) => {
    setExperience((prev) => {
      const updated = [...prev];
      updated[expIndex] = {
        ...updated[expIndex],
        highlights: [...updated[expIndex].highlights, '']
      };
      return updated;
    });
  };

  const updateHighlight = (expIndex: number, highlightIndex: number, value: string) => {
    setExperience((prev) => {
      const updated = [...prev];
      const highlights = [...updated[expIndex].highlights];
      highlights[highlightIndex] = value;
      updated[expIndex] = { ...updated[expIndex], highlights };
      return updated;
    });
  };

  const removeHighlight = (expIndex: number, highlightIndex: number) => {
    setExperience((prev) => {
      const updated = [...prev];
      updated[expIndex] = {
        ...updated[expIndex],
        highlights: updated[expIndex].highlights.filter((_, i) => i !== highlightIndex)
      };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      // Build the resume document
      const resumeData: ResumeDocument = {
        ...initialResume,
        basics: {
          name: basics.name,
          title: basics.title,
          summary: basics.summary || undefined
        },
        experience: experience
          .filter((exp) => exp.company.trim() && exp.role.trim())
          .map((exp) => ({
            ...exp,
            highlights: exp.highlights.filter((h) => h.trim())
          }))
      };

      // Validate with Zod
      const validated = resumeSchema.parse(resumeData);

      // Submit to Next.js API route (which calls the .NET API)
      const response = await fetch(`/api/resumes/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(validated)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(error.error || `Update failed (${response.status})`);
      }

      const updated = await response.json();
      resumeSchema.parse(updated); // Validate response

      // Success - show message and refresh
      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        router.push(`/r/${slug}`);
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'issues' in err) {
        // Zod validation errors
        const zodError = err as { issues: Array<{ path: string[]; message: string }> };
        const messages = zodError.issues.map((issue) => {
          const path = issue.path.join('.');
          return `${path}: ${issue.message}`;
        });
        setError(`Validation errors:\n${messages.join('\n')}`);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live preview document derived from current form state so the right-hand
  // pane updates as the user types. Mirrors the shape handleSubmit produces
  // (without filtering empties — we want raw, in-progress edits visible).
  const previewDoc: ResumeDocument = {
    ...initialResume,
    basics: {
      name: basics.name,
      title: basics.title,
      summary: basics.summary || undefined
    },
    experience
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="split">
        <div className="split-form">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-ok">Resume updated — redirecting…</div>}

          <div className="section-block">
            <span className="sb-title">Basics</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="lbl" htmlFor="name">
                  Name <span className="req">*</span>
                </label>
                <input
                  id="name"
                  className="input"
                  type="text"
                  value={basics.name}
                  onChange={(e) => handleBasicsChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="lbl" htmlFor="title">
                  Title <span className="req">*</span>
                </label>
                <input
                  id="title"
                  className="input"
                  type="text"
                  value={basics.title}
                  onChange={(e) => handleBasicsChange('title', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
              <label className="lbl" htmlFor="summary">
                Summary
              </label>
              <textarea
                id="summary"
                className="textarea"
                value={basics.summary}
                onChange={(e) => handleBasicsChange('summary', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="section-block" style={{ marginBottom: 0 }}>
            <div className="sb-head">
              <span className="sb-title">Experience</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addExperienceEntry}>
                <Icon name="plus" size={14} /> Add experience
              </button>
            </div>

            {experience.map((exp, expIndex) => (
              <div key={expIndex} className="entry">
                <div className="entry-head">
                  <h4>Entry {String(expIndex + 1).padStart(2, '0')}</h4>
                  {experience.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => removeExperienceEntry(expIndex)}
                    >
                      <Icon name="trash" size={14} /> Remove
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr',
                    gap: 12,
                    marginBottom: 12
                  }}
                >
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="lbl" htmlFor={`exp-company-${expIndex}`}>
                      Company <span className="req">*</span>
                    </label>
                    <input
                      id={`exp-company-${expIndex}`}
                      className="input"
                      type="text"
                      value={exp.company}
                      onChange={(e) => handleExperienceChange(expIndex, 'company', e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="lbl" htmlFor={`exp-period-${expIndex}`}>
                      Period
                    </label>
                    <input
                      id={`exp-period-${expIndex}`}
                      className="input"
                      type="text"
                      value={exp.period || ''}
                      onChange={(e) => handleExperienceChange(expIndex, 'period', e.target.value)}
                      placeholder="e.g., 2023–Present"
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="lbl" htmlFor={`exp-role-${expIndex}`}>
                    Role <span className="req">*</span>
                  </label>
                  <input
                    id={`exp-role-${expIndex}`}
                    className="input"
                    type="text"
                    value={exp.role}
                    onChange={(e) => handleExperienceChange(expIndex, 'role', e.target.value)}
                    required
                  />
                </div>

                <label className="lbl">Highlights</label>
                {exp.highlights.map((highlight, highlightIndex) => (
                  <div key={highlightIndex} className="hl-row">
                    <Icon name="grip" size={15} style={{ color: 'var(--ink-4)' }} />
                    <input
                      className="input"
                      type="text"
                      value={highlight}
                      onChange={(e) => updateHighlight(expIndex, highlightIndex, e.target.value)}
                      placeholder="Enter highlight"
                      style={{ padding: '8px 11px', fontSize: 13 }}
                    />
                    <button
                      type="button"
                      className="btn btn-quiet btn-icon btn-sm"
                      onClick={() => removeHighlight(expIndex, highlightIndex)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  style={{ marginTop: 4, color: 'var(--acc-deep)' }}
                  onClick={() => addHighlight(expIndex)}
                >
                  <Icon name="plus" size={14} /> Add highlight
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="split-preview">
          <div className="preview-tab">
            <span className="dot2" /> live preview · /r/{slug}
          </div>
          <div className="preview-frame">
            <div className="preview-scale">
              <ResumeView resume={previewDoc} pad="44px 52px 60px" />
            </div>
          </div>
        </div>
      </div>

      <div className="savebar">
        <span className="saved-note">
          <Icon name="check" size={15} stroke={2.2} /> Edits preview live
        </span>
        <div className="spacer" />
        <a className="btn btn-ghost" href={`/r/${slug}`}>
          Discard
        </a>
        <button className="btn btn-acc" type="submit" disabled={isSubmitting}>
          <Icon name="save" size={15} /> {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

