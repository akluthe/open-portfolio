import { Buffer } from 'node:buffer';
import { NextResponse, type NextRequest } from 'next/server';
import { fetchResolvedResume } from '@/lib/profile-api';
import { normalizeTypstStyle } from '@/lib/resume-typst';
import { renderTypstPdf } from '@/lib/typst-pdf';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const resume = await fetchResolvedResume(slug);

    if (!resume) {
      return NextResponse.json({ message: 'Tailored resume not found' }, { status: 404 });
    }

    const style = normalizeTypstStyle(request.nextUrl.searchParams.get('style'));
    const pdfBytes = await renderTypstPdf(resume, style);
    const filename = `${slug.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Failed to render tailored PDF resume', error);
    return NextResponse.json({ message: 'Failed to render PDF resume' }, { status: 500 });
  }
}
