import { notFound } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/admin-auth';
import { fetchProfile, listProfileVersions } from '@/lib/profile-api';
import { fetchResumeBySlug } from '@/lib/resume-api';
import VersionHistory from '@/components/admin/version-history';
import LogoutButton from '@/components/admin/logout-button';

type HistoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function TailoringHistoryPage({ params }: HistoryPageProps) {
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
        </div>
      </div>
    );
  }

  const { slug } = await params;
  const profile = await fetchProfile(slug);

  if (!profile) {
    notFound();
  }

  // Master is needed to resolve overlay versions into a previewable resume.
  const master = await fetchResumeBySlug(profile.baseSlug);

  if (!master) {
    return (
      <div className="admin-page">
        <div className="admin-error">
          <h1>Missing master resume</h1>
          <p>
            This tailoring is based on <code>{profile.baseSlug}</code>, which does not exist.
          </p>
        </div>
      </div>
    );
  }

  const { getToken } = await auth();
  const token = await getToken();
  const versions = token ? await listProfileVersions(slug, token) : [];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>History: {profile.name}</h1>
          <p className="admin-user-info">
            <code>{slug}</code> · based on <code>{profile.baseSlug}</code> · restore is append-only
          </p>
        </div>
        <div className="admin-header-actions">
          <a href={`/admin/tailoring/${slug}`} className="admin-link">
            ← Edit Tailoring
          </a>
          <a href={`/t/${slug}`} className="admin-link">
            View Tailored →
          </a>
          <LogoutButton />
        </div>
      </div>
      <VersionHistory slug={slug} versions={versions} kind="tailoring" master={master} />
    </div>
  );
}
