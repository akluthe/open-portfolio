import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/admin-auth';
import { fetchProfile } from '@/lib/profile-api';
import { fetchResumeBySlug } from '@/lib/resume-api';
import TailoringEditForm from '@/components/admin/tailoring-edit-form';
import LogoutButton from '@/components/admin/logout-button';

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
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Edit Tailoring: {profile.name}</h1>
          <p className="admin-user-info">
            <code>{slug}</code> · based on <code>{profile.baseSlug}</code>
          </p>
        </div>
        <div className="admin-header-actions">
          <a href="/admin/tailoring" className="admin-link">
            ← All Tailorings
          </a>
          <a href={`/t/${slug}`} className="admin-link">
            View Tailored →
          </a>
          <LogoutButton />
        </div>
      </div>
      <TailoringEditForm slug={slug} master={master} initialProfile={profile} />
    </div>
  );
}
