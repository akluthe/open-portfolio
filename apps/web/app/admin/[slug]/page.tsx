import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { fetchResumeBySlug } from '@/lib/resume-api';
import { isAdmin } from '@/lib/admin-auth';
import ResumeEditForm from '@/components/admin/resume-edit-form';
import LogoutButton from '@/components/admin/logout-button';
import Icon from '@/components/ui/icon';
import AppBar from '@/components/ui/app-bar';

type AdminPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminPage({ params }: AdminPageProps) {
  // Check authentication - middleware will redirect if not authenticated
  const user = await currentUser();

  if (!user) {
    notFound();
  }

  // Check if user is authorized as admin
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
  // Fetch the current resume
  const resume = await fetchResumeBySlug(slug);

  if (!resume) {
    notFound();
  }

  return (
    <div className="app">
      <AppBar active="Resumes" right={<LogoutButton />} />
      <div className="sub-head">
        <div className="grow">
          <div className="crumbs">
            <a href={`/r/${slug}`}>Resumes</a>
            <span className="sep">/</span>
            <span style={{ color: 'var(--ink-2)' }}>{slug}</span>
          </div>
          <div className="row gap12" style={{ alignItems: 'baseline', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 30, letterSpacing: '-.3px' }}>
              Edit — {resume.basics.name}
            </span>
            <span className="pill pill-master">Master</span>
          </div>
        </div>
        <a className="btn btn-ghost btn-sm" href={`/admin/${slug}/history`}>
          <Icon name="history" size={14} /> Version history
        </a>
      </div>
      <ResumeEditForm slug={slug} initialResume={resume} />
    </div>
  );
}

