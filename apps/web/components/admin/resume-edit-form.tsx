'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ResumeDocument, ResumeExperience } from '@/lib/shared-types';
import { resumeSchema } from '@/lib/shared-types';

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

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      {error && (
        <div className="admin-error" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="admin-success" role="alert">
          Resume updated successfully! Redirecting...
        </div>
      )}

      <section className="admin-section">
        <h2>Basics</h2>
        <div className="admin-field">
          <label htmlFor="name">
            Name <span className="required">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={basics.name}
            onChange={(e) => handleBasicsChange('name', e.target.value)}
            required
          />
        </div>

        <div className="admin-field">
          <label htmlFor="title">
            Title <span className="required">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={basics.title}
            onChange={(e) => handleBasicsChange('title', e.target.value)}
            required
          />
        </div>

        <div className="admin-field">
          <label htmlFor="summary">Summary</label>
          <textarea
            id="summary"
            value={basics.summary}
            onChange={(e) => handleBasicsChange('summary', e.target.value)}
            rows={4}
          />
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Experience</h2>
          <button type="button" onClick={addExperienceEntry} className="admin-button-secondary">
            + Add Experience
          </button>
        </div>

        {experience.map((exp, expIndex) => (
          <div key={expIndex} className="admin-entry">
            <div className="admin-entry-header">
              <h3>Experience Entry {expIndex + 1}</h3>
              {experience.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExperienceEntry(expIndex)}
                  className="admin-button-danger"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="admin-field">
              <label htmlFor={`exp-company-${expIndex}`}>
                Company <span className="required">*</span>
              </label>
              <input
                id={`exp-company-${expIndex}`}
                type="text"
                value={exp.company}
                onChange={(e) => handleExperienceChange(expIndex, 'company', e.target.value)}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor={`exp-role-${expIndex}`}>
                Role <span className="required">*</span>
              </label>
              <input
                id={`exp-role-${expIndex}`}
                type="text"
                value={exp.role}
                onChange={(e) => handleExperienceChange(expIndex, 'role', e.target.value)}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor={`exp-period-${expIndex}`}>Period</label>
              <input
                id={`exp-period-${expIndex}`}
                type="text"
                value={exp.period || ''}
                onChange={(e) => handleExperienceChange(expIndex, 'period', e.target.value)}
                placeholder="e.g., 2023–Present"
              />
            </div>

            <div className="admin-field">
              <label>Highlights</label>
              {exp.highlights.map((highlight, highlightIndex) => (
                <div key={highlightIndex} className="admin-highlight-row">
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => updateHighlight(expIndex, highlightIndex, e.target.value)}
                    placeholder="Enter highlight"
                  />
                  <button
                    type="button"
                    onClick={() => removeHighlight(expIndex, highlightIndex)}
                    className="admin-button-danger-small"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addHighlight(expIndex)}
                className="admin-button-secondary-small"
              >
                + Add Highlight
              </button>
            </div>
          </div>
        ))}
      </section>

      <div className="admin-actions">
        <button type="submit" disabled={isSubmitting} className="admin-button-primary">
          {isSubmitting ? 'Saving...' : 'Save Resume'}
        </button>
        <a href={`/r/${slug}`} className="admin-button-secondary">
          Cancel
        </a>
      </div>
    </form>
  );
}

