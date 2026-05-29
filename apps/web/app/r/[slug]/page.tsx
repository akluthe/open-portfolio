import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ResumeView from '@/components/resume/resume-view';
import DownloadControls from '@/components/resume/download-controls';
import { fetchResumeBySlug } from '@/lib/resume-api';
import { isAdmin } from '@/lib/admin-auth';

type ResumePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ResumePage({ params }: ResumePageProps) {
  const { slug } = await params;
  const resume = await fetchResumeBySlug(slug);

  if (!resume) {
    notFound();
  }

  const userIsAdmin = await isAdmin();

  return (
    <>
      <div className="resume-actions" aria-label="Resume downloads">
        {userIsAdmin && (
          <a className="resume-action" href={`/admin/${slug}`}>
            Edit Resume
          </a>
        )}
        <DownloadControls basePath={`/api/resumes/${slug}`} />
      </div>
      <ResumeView resume={resume} />
    </>
  );
}

export async function generateMetadata({ params }: ResumePageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const resume = await fetchResumeBySlug(slug);

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
