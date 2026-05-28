import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ResumeView from '@/components/resume/resume-view';
import { fetchResolvedResume } from '@/lib/profile-api';
import { isAdmin } from '@/lib/admin-auth';

type TailoredPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TailoredResumePage({ params }: TailoredPageProps) {
  const { slug } = await params;
  const resume = await fetchResolvedResume(slug);

  if (!resume) {
    notFound();
  }

  const userIsAdmin = await isAdmin();

  return (
    <>
      <div className="resume-actions" aria-label="Resume downloads">
        {userIsAdmin && (
          <a className="resume-action" href={`/admin/tailoring/${slug}`}>
            Edit Tailoring
          </a>
        )}
        <a className="resume-action" href={`/api/profiles/${slug}/typst`} download>
          Download Typst
        </a>
        <a className="resume-action" href={`/api/profiles/${slug}/pdf`} download>
          Download PDF
        </a>
      </div>
      <ResumeView resume={resume} />
    </>
  );
}

export async function generateMetadata({ params }: TailoredPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const resume = await fetchResolvedResume(slug);

    if (!resume) {
      return {
        title: 'Resume not found'
      };
    }

    return {
      title: `${resume.basics.name} — Resume`,
      description: resume.basics.summary ?? resume.summary ?? 'Server-rendered resume'
    };
  } catch (error) {
    return {
      title: 'Resume Platform',
      description: 'Server-rendered resume'
    };
  }
}
