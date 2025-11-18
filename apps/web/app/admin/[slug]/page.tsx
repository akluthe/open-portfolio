import { notFound } from 'next/navigation';
import { getFeatureFlag } from '@/lib/feature-flags';
import { fetchResumeBySlug } from '@/lib/resume-api';
import ResumeEditForm from '@/components/admin/resume-edit-form';

type AdminPageProps = {
  params: {
    slug: string;
  };
};

export default async function AdminPage({ params }: AdminPageProps) {
  // Check if admin editing is enabled via feature flag
  const isAdminEnabled = await getFeatureFlag('admin-editing', false);

  if (!isAdminEnabled) {
    notFound();
  }

  // Fetch the current resume
  const resume = await fetchResumeBySlug(params.slug);

  if (!resume) {
    notFound();
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Edit Resume: {params.slug}</h1>
        <a href={`/r/${params.slug}`} className="admin-link">
          View Public Resume →
        </a>
      </div>
      <ResumeEditForm slug={params.slug} initialResume={resume} />
    </div>
  );
}

