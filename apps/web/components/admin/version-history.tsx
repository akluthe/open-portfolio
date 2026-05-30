'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  resolveTailoredResume,
  resumeVersionListSchema,
  type ResumeDocument,
  type ResumeVersionMeta,
  type TailoringProfile
} from '@/lib/shared-types';
import ResumeView from '@/components/resume/resume-view';

type VersionHistoryProps = {
  slug: string;
  // 'resume' versions hold a ResumeDocument; 'tailoring' versions hold an overlay
  // (TailoringProfile) that is resolved against the current master for preview.
  kind: 'resume' | 'tailoring';
  // Required when kind === 'tailoring': the current master to resolve overlays against.
  master?: ResumeDocument;
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

// The list is fetched client-side through the Next.js proxy route (a route handler,
// the same context that authenticates saves). Fetching it during the server-component
// render instead would put a short-lived Clerk token on the SSR path and turn any auth
// hiccup into a full-page crash.
export default function VersionHistory({ slug, kind, master }: VersionHistoryProps) {
  const apiBase =
    kind === 'resume'
      ? `/api/resumes/${encodeURIComponent(slug)}/versions`
      : `/api/profiles/${encodeURIComponent(slug)}/versions`;

  const [versions, setVersions] = useState<ResumeVersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ version: number; resume: ResumeDocument } | null>(null);
  const [busyVersion, setBusyVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiBase, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Could not load version history (${response.status})`);
      }
      setVersions(resumeVersionListSchema.parse(await response.json()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  async function handlePreview(version: number) {
    setError(null);
    setBusyVersion(version);
    try {
      const response = await fetch(`${apiBase}/${version}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Could not load version ${version} (${response.status})`);
      }
      const doc = await response.json();
      // Resume versions are already a full document; tailoring versions are overlays.
      const resume: ResumeDocument =
        kind === 'resume'
          ? (doc as ResumeDocument)
          : resolveTailoredResume(master!, doc as TailoringProfile);
      setPreview({ version, resume });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setBusyVersion(null);
    }
  }

  async function handleRestore(version: number) {
    if (!window.confirm(`Restore version ${version}? This is saved as a new latest version — nothing is overwritten.`)) {
      return;
    }
    setError(null);
    setBusyVersion(version);
    try {
      const response = await fetch(`${apiBase}/${version}/restore`, {
        method: 'POST',
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error(`Restore failed (${response.status})`);
      }
      setPreview(null);
      await loadVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore');
    } finally {
      setBusyVersion(null);
    }
  }

  return (
    <div className="version-history">
      {error && <p className="admin-error-text" role="alert">{error}</p>}

      {loading ? (
        <p>Loading version history…</p>
      ) : versions.length === 0 ? (
        <p>No saved versions yet. They start accumulating from the next save.</p>
      ) : (
        <table className="version-history-table">
          <thead>
            <tr>
              <th scope="col">Version</th>
              <th scope="col">Saved</th>
              <th scope="col">By</th>
              <th scope="col">Note</th>
              <th scope="col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {versions.map((v, index) => (
              <tr key={v.version}>
                <td>
                  v{v.version}
                  {index === 0 && <span className="version-badge"> current</span>}
                </td>
                <td>{formatTimestamp(v.createdAt)}</td>
                <td>{v.createdBy ?? '—'}</td>
                <td>{v.changeSummary ?? '—'}</td>
                <td className="version-actions">
                  <button
                    type="button"
                    onClick={() => handlePreview(v.version)}
                    disabled={busyVersion !== null}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestore(v.version)}
                    disabled={busyVersion !== null || index === 0}
                    title={index === 0 ? 'Already the current version' : undefined}
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {preview && (
        <div className="version-preview" role="dialog" aria-label={`Preview of version ${preview.version}`}>
          <div className="version-preview-header">
            <h2>Preview — version {preview.version}</h2>
            <button type="button" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
          <ResumeView resume={preview.resume} />
        </div>
      )}
    </div>
  );
}
