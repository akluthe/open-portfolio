import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { fetchResumeBySlug } from '@/lib/resume-api';
import { isAdmin } from '@/lib/admin-auth';
import VersionHistory from '@/components/admin/version-history';
import LogoutButton from '@/components/admin/logout-button';

type HistoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function ResumeHistoryPage({ params }: HistoryPageProps) {
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
  const resume = await fetchResumeBySlug(slug);

  if (!resume) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>History: {slug}</h1>
          <p className="admin-user-info">Every saved version, newest first. Restore is append-only.</p>
        </div>
        <div className="admin-header-actions">
          <a href={`/admin/${slug}`} className="admin-link">
            ← Edit Resume
          </a>
          <a href={`/r/${slug}`} className="admin-link">
            View Public Resume →
          </a>
          <LogoutButton />
        </div>
      </div>
      <VersionHistory slug={slug} kind="resume" />
    </div>
  );
}
