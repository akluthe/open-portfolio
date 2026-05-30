import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/admin-auth';
import { listProfiles } from '@/lib/profile-api';
import { fetchResumeBySlug } from '@/lib/resume-api';
import TailoringCreateForm from '@/components/admin/tailoring-create-form';
import LogoutButton from '@/components/admin/logout-button';
import AppBar from '@/components/ui/app-bar';
import Icon from '@/components/ui/icon';

export default async function AdminTailoringListPage() {
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  const isAuthorized = await isAdmin();

  if (!isAuthorized) {
    return (
      <div className="admin-page">
        <div className="admin-error">
          <h1>Access Denied</h1>
          <p>Your GitHub account ({user.username}) is not authorized to access the admin panel.</p>
          <p>Please contact the administrator to request access.</p>
        </div>
      </div>
    );
  }

  const profiles = await listProfiles();
  const master = await fetchResumeBySlug('main');

  return (
    <div className="app">
      <AppBar active="Resumes" right={<LogoutButton />} />
      <div className="page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Workspace</div>
            <h1 className="page-title">Resumes</h1>
            <p className="page-sub">Your master resume and every job-specific cut of it. Edits here re-render the public page and PDF.</p>
          </div>
          <div className="row gap8">
            <a className="btn btn-acc" href="/admin/main"><Icon name="edit" size={16} /> Edit master</a>
          </div>
        </div>

        {master && (
          <div style={{ marginBottom: 30 }}>
            <div className="master">
              <div>
                <div className="row gap12" style={{ marginBottom: 8 }}>
                  <span className="pill pill-master">Master</span>
                  <span className="tag">/r/main</span>
                </div>
                <div className="master-name">{master.basics.name}</div>
                <div style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 6 }}>{master.basics.title}{master.contact?.location ? ` · ${master.contact.location}` : ''}</div>
                <div className="doc-meta" style={{ marginTop: 12 }}><span>{profiles.length} tailored {profiles.length === 1 ? 'cut' : 'cuts'}</span></div>
              </div>
              <div className="master-acts">
                <a className="btn btn-ghost btn-sm" href="/admin/main/history"><Icon name="history" size={14} /> History</a>
                <a className="btn btn-ghost btn-sm" href="/r/main"><Icon name="eye" size={14} /> View</a>
                <a className="btn btn-ghost btn-sm" href="/api/resumes/main/pdf"><Icon name="download" size={14} /> PDF</a>
                <a className="btn btn-primary btn-sm" href="/admin/main"><Icon name="edit" size={14} /> Edit</a>
              </div>
            </div>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <div className="row gap12" style={{ alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 24, letterSpacing: '-.2px' }}>Tailored variants</span>
            <span className="tag">{profiles.length}</span>
          </div>
          <span className="hint">Each variant overlays the master — hide bullets, reorder skills, swap the headline.</span>
        </div>

        {profiles.length === 0 ? (
          <p className="hint">No tailorings yet. Create one below.</p>
        ) : (
          <div className="variant-grid">
            {profiles.map(p => (
              <div className="doc" key={p.slug}>
                <div className="doc-top">
                  <div>
                    <div className="doc-name">{p.name}</div>
                    <div className="doc-slug">/t/{p.slug}</div>
                  </div>
                  <span className="pill pill-muted">Overlay</span>
                </div>
                <div className="doc-meta"><span><Icon name="layers" size={12} style={{ verticalAlign: '-2px', marginRight: 4, color: 'var(--acc-deep)' }} />from {p.baseSlug}</span></div>
                <div className="doc-acts">
                  <a className="btn btn-ghost btn-sm" href={`/t/${p.slug}`}><Icon name="eye" size={14} /> View</a>
                  <a className="btn btn-quiet btn-sm" href={`/admin/tailoring/${p.slug}`}><Icon name="edit" size={14} /> Tailor</a>
                  <div className="grow" />
                  <a className="btn btn-quiet btn-sm" href={`/admin/tailoring/${p.slug}/history`}><Icon name="history" size={14} /></a>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <TailoringCreateForm />
        </div>
      </div>
    </div>
  );
}
