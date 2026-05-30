import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ResumeView from '@/components/resume/resume-view';
import DownloadControls from '@/components/resume/download-controls';
import Icon from '@/components/ui/icon';
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
    <div className="app">
      <div className="r-toolbar" aria-label="Resume actions">
        <span className="pill pill-master">Tailored</span>
        {userIsAdmin && (
          <a className="btn btn-ghost btn-sm" href={`/admin/tailoring/${slug}`}>
            <Icon name="edit" size={15} /> Edit tailoring
          </a>
        )}
        <DownloadControls basePath={`/api/profiles/${slug}`} />
      </div>
      <div className="paper-stage">
        <div className="paper-sheet">
          <ResumeView resume={resume} />
        </div>
      </div>
    </div>
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
