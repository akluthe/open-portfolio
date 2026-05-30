import { NextResponse, type NextRequest } from 'next/server';
import { fetchResolvedResume } from '@/lib/profile-api';
import { normalizeTypstStyle } from '@/lib/resume-typst';
import { buildTypstSource } from '@/lib/typst-pdf';
import { buildResumeFilename } from '@/lib/resume-filename';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const resume = await fetchResolvedResume(slug);

    if (!resume) {
      return NextResponse.json({ message: 'Tailored resume not found' }, { status: 404 });
    }

    const style = normalizeTypstStyle(request.nextUrl.searchParams.get('style'));
    const typstSource = await buildTypstSource(resume, style);
    const filename = buildResumeFilename(resume, 'typ', {
      slug,
      fallbackDate: new Date().toISOString().slice(0, 10)
    });

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
