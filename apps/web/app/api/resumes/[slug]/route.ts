import { NextRequest, NextResponse } from 'next/server';
import { resumeSchema, type ResumeDocument } from '@resume-platform/shared-types';
import { updateResumeBySlug } from '@/lib/resume-api';

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const resume = resumeSchema.parse(body);

    // Update via the API
    const updated = await updateResumeBySlug(params.slug, resume);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      // Validation errors or API errors
      if (error.message.includes('Validation')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

