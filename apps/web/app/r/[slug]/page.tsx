import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ResumeView from '@/components/resume/resume-view';
import DownloadControls from '@/components/resume/download-controls';
import Icon from '@/components/ui/icon';
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
    <div className="app">
      <div className="r-toolbar" aria-label="Resume actions">
        {userIsAdmin && (
          <a className="btn btn-ghost btn-sm" href={`/admin/${slug}`}>
            <Icon name="edit" size={15} /> Edit
          </a>
        )}
        <DownloadControls basePath={`/api/resumes/${slug}`} />
      </div>
      <div className="paper-stage">
        <div className="paper-sheet">
          <ResumeView resume={resume} />
        </div>
      </div>
    </div>
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
