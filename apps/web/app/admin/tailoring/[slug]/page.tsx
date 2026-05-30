import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/admin-auth';
import { fetchProfile } from '@/lib/profile-api';
import { fetchResumeBySlug } from '@/lib/resume-api';
import TailoringEditForm from '@/components/admin/tailoring-edit-form';
import LogoutButton from '@/components/admin/logout-button';
import AppBar from '@/components/ui/app-bar';
import Icon from '@/components/ui/icon';

type AdminTailoringEditPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminTailoringEditPage({ params }: AdminTailoringEditPageProps) {
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

  const { slug } = await params;
  const profile = await fetchProfile(slug);

  if (!profile) {
    notFound();
  }

  const master = await fetchResumeBySlug(profile.baseSlug);

  if (!master) {
    return (
      <div className="admin-page">
        <div className="admin-error">
          <h1>Missing master resume</h1>
          <p>
            This tailoring is based on <code>{profile.baseSlug}</code>, which does not exist. Create
            that resume first, or edit the profile&apos;s baseSlug.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <AppBar active="Tailoring" right={<LogoutButton />} />
      <div className="sub-head">
        <div className="grow">
          <div className="crumbs">
            <a href="/admin/tailoring">Tailoring</a>
            <span className="sep">/</span>
            <span style={{ color: 'var(--ink-2)' }}>{slug}</span>
          </div>
          <div className="row gap12" style={{ alignItems: 'baseline', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 30, letterSpacing: '-.3px' }}>
              {profile.name}
            </span>
            <span className="pill pill-draft">Draft</span>
          </div>
          <div className="doc-meta" style={{ marginTop: 7 }}>
            <span>
              <Icon
                name="layers"
                size={12}
                style={{ verticalAlign: '-2px', marginRight: 4, color: 'var(--acc-deep)' }}
              />
              overlay on /r/{profile.baseSlug}
            </span>
          </div>
        </div>
        <a className="btn btn-ghost btn-sm" href={`/t/${slug}`}>
          <Icon name="eye" size={14} /> Open /t/{slug}
        </a>
      </div>
      <TailoringEditForm slug={slug} master={master} initialProfile={profile} />
    </div>
  );
}
