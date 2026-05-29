import { NextResponse, type NextRequest } from 'next/server';
import { fetchResumeBySlug } from '@/lib/resume-api';
import { normalizeTypstStyle } from '@/lib/resume-typst';
import { buildTypstSource } from '@/lib/typst-pdf';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const resume = await fetchResumeBySlug(slug);

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    const style = normalizeTypstStyle(request.nextUrl.searchParams.get('style'));
    const typstSource = await buildTypstSource(resume, style);
    const filename = `${slug}.typ`;

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
