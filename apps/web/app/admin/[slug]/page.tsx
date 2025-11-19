import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { fetchResumeBySlug } from '@/lib/resume-api';
import { isAdmin } from '@/lib/admin-auth';
import ResumeEditForm from '@/components/admin/resume-edit-form';
import LogoutButton from '@/components/admin/logout-button';

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
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Edit Resume: {slug}</h1>
          <p className="admin-user-info">Logged in as: {user.username || user.firstName || user.emailAddresses[0]?.emailAddress}</p>
        </div>
        <div className="admin-header-actions">
          <a href={`/r/${slug}`} className="admin-link">
            View Public Resume →
          </a>
          <LogoutButton />
        </div>
      </div>
      <ResumeEditForm slug={slug} initialResume={resume} />
    </div>
  );
}

