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
import Icon from '@/components/ui/icon';

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
    <div style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 24, alignItems: 'start' }}>
      <div className="card card-pad" style={{ padding: '12px 12px' }}>
        {loading ? (
          <p className="hint" style={{ padding: 12 }}>Loading…</p>
        ) : versions.length === 0 ? (
          <p className="hint" style={{ padding: 12 }}>No saved versions yet.</p>
        ) : (
          versions.map((v, index) => {
            const isCurrent = index === 0;
            const selected = preview?.version === v.version;
            return (
              <div
                key={v.version}
                className={'vrow' + (selected ? ' sel' : '')}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '62px 1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '13px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: selected ? '1px solid var(--acc-soft)' : '1px solid transparent',
                }}
                onClick={() => handlePreview(v.version)}
              >
                <div className="stamp" style={{ fontSize: 18 }}>
                  <span style={{ color: 'var(--ink-4)' }}>v</span>
                  <span className="v">{v.version}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="row gap8" style={{ marginBottom: 3 }}>
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                      {formatTimestamp(v.createdAt)}
                    </span>
                    {isCurrent && (
                      <span className="pill pill-pub" style={{ fontSize: 10, padding: '2px 8px 2px 7px' }}>
                        Current
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: 'var(--ink-2)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.changeSummary ?? (v.createdBy ? `by ${v.createdBy}` : '—')}
                  </div>
                </div>
                <div className="row gap8" onClick={e => e.stopPropagation()}>
                  {isCurrent ? (
                    <span className="hint" style={{ fontSize: 12 }}>live</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() => handlePreview(v.version)}
                        disabled={busyVersion !== null}
                      >
                        <Icon name="eye" size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRestore(v.version)}
                        disabled={busyVersion !== null}
                      >
                        <Icon name="restore" size={14} /> Restore
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div>
        {error && (
          <p className="admin-error-text" role="alert" style={{ marginBottom: 12 }}>
            {error}
          </p>
        )}
        {preview ? (
          <>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="preview-tab" style={{ marginBottom: 0 }}>
                <span className="dot2" style={{ background: 'var(--amber)' }} /> viewing v{preview.version}
              </div>
              <button
                type="button"
                className="btn btn-acc btn-sm"
                onClick={() => handleRestore(preview.version)}
                disabled={busyVersion !== null}
              >
                <Icon name="restore" size={14} /> Restore v{preview.version}
              </button>
            </div>
            <div className="preview-frame" style={{ height: 540, overflow: 'hidden' }}>
              <div style={{ transform: 'scale(.52)', transformOrigin: 'top left', width: '192.3%' }}>
                <ResumeView resume={preview.resume} pad="44px 52px 60px" />
              </div>
            </div>
          </>
        ) : (
          <div className="card card-pad">
            <p className="hint">Select a version on the left to preview it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
