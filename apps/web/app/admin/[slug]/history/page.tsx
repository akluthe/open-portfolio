import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { fetchResumeBySlug } from '@/lib/resume-api';
import { isAdmin } from '@/lib/admin-auth';
import VersionHistory from '@/components/admin/version-history';
import LogoutButton from '@/components/admin/logout-button';
import AppBar from '@/components/ui/app-bar';

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
    <div className="app">
      <AppBar active="Resumes" right={<LogoutButton />} />
      <div className="page page-wide">
        <div className="crumbs" style={{ marginBottom: 4 }}>
          <a href={`/admin/${slug}`}>Resumes</a>
          <span className="sep">/</span>
          <a href={`/admin/${slug}`}>{slug}</a>
          <span className="sep">/</span>
          <span style={{ color: 'var(--ink-2)' }}>history</span>
        </div>
        <div className="page-head" style={{ marginBottom: 24 }}>
          <div>
            <div className="eyebrow">Version history</div>
            <h1 className="page-title">Version history</h1>
            <p className="page-sub">Every save is a stamped version. Preview any point in time, then restore it as a new version — nothing is lost.</p>
          </div>
        </div>
        <VersionHistory slug={slug} kind="resume" />
      </div>
    </div>
  );
}
