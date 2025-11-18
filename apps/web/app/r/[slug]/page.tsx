import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ResumeView from '@/components/resume/resume-view';
import { fetchResumeBySlug } from '@/lib/resume-api';

type ResumePageProps = {
  params: {
    slug: string;
  };
};

export default async function ResumePage({ params }: ResumePageProps) {
  const resume = await fetchResumeBySlug(params.slug);

  if (!resume) {
    notFound();
  }

  return <ResumeView resume={resume} />;
}

export async function generateMetadata({ params }: ResumePageProps): Promise<Metadata> {
  try {
    const resume = await fetchResumeBySlug(params.slug);

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
