import { NextResponse, type NextRequest } from 'next/server';
import { fetchResolvedResume } from '@/lib/profile-api';
import { buildTypstSource } from '@/lib/resume-typst';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const resume = await fetchResolvedResume(slug);

    if (!resume) {
      return NextResponse.json({ message: 'Tailored resume not found' }, { status: 404 });
    }

    const typstSource = await buildTypstSource(resume);
    const filename = `${slug}.typ`;

    return new NextResponse(typstSource, {
      status: 200,
      headers: {
        'content-type': 'application/vnd.typst',
        'content-disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Failed to render tailored Typst resume', error);
    return NextResponse.json({ message: 'Failed to render Typst resume' }, { status: 500 });
  }
}
