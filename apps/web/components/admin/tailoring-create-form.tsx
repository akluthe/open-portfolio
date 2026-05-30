'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tailoringProfileSchema } from '@/lib/shared-types';

export default function TailoringCreateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [baseSlug, setBaseSlug] = useState('main');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const cleanSlug = slug.trim();
      if (!cleanSlug) {
        throw new Error('Slug is required');
      }

      // Empty overlay — only the required fields; the rest defaults.
      const profile = tailoringProfileSchema.parse({
        name: name.trim(),
        baseSlug: baseSlug.trim() || 'main'
      });

      const response = await fetch(`/api/profiles/${encodeURIComponent(cleanSlug)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Create failed' }));
        throw new Error(err.error || `Create failed (${response.status})`);
      }

      router.refresh();
      router.push(`/admin/tailoring/${encodeURIComponent(cleanSlug)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card card-pad">
        <span className="sb-title">New tailoring</span>

        {error && (
          <div className="alert alert-error" role="alert">{error}</div>
        )}

        <div className="field">
          <label className="lbl" htmlFor="new-name">Display name <span className="req">*</span></label>
          <input
            id="new-name"
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Databank — Sr Eng Mgr"
            required
          />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="new-slug">Slug <span className="req">*</span></label>
          <input
            id="new-slug"
            className="input"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="databank-engmgr"
            required
          />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="new-base">Base resume slug <span className="req">*</span></label>
          <input
            id="new-base"
            className="input"
            type="text"
            value={baseSlug}
            onChange={(e) => setBaseSlug(e.target.value)}
            placeholder="main"
            required
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-acc" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create & edit'}
          </button>
        </div>
      </div>
    </form>
  );
}
