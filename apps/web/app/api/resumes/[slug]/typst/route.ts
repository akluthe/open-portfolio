import { NextResponse, type NextRequest } from 'next/server';
import { fetchResumeBySlug } from '@/lib/resume-api';
import { buildTypstSource } from '@/lib/resume-typst';

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const resume = await fetchResumeBySlug(params.slug);

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    const typstSource = await buildTypstSource(resume);
    const filename = `${params.slug}.typ`;

    return new NextResponse(typstSource, {
      status: 200,
      headers: {
        'content-type': 'application/vnd.typst',
        'content-disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Failed to render Typst resume', error);
    return NextResponse.json({ message: 'Failed to render Typst resume' }, { status: 500 });
  }
}
