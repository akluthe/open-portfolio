import { Buffer } from 'node:buffer';
import { NextResponse, type NextRequest } from 'next/server';
import { fetchResumeBySlug } from '@/lib/resume-api';
import { buildTypstSource } from '@/lib/resume-typst';
import { renderTypstPdf } from '@/lib/typst-pdf';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const resume = await fetchResumeBySlug(slug);

    if (!resume) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    const typstSource = await buildTypstSource(resume);
    const pdfBytes = await renderTypstPdf(typstSource);
    const filename = `${slug}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Failed to render PDF resume', error);
    return NextResponse.json({ message: 'Failed to render PDF resume' }, { status: 500 });
  }
}
