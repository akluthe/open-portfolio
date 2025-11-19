import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { resumeSchema, type ResumeDocument } from '@/lib/shared-types';
import { updateResumeBySlug } from '@/lib/resume-api';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Check authentication with Clerk
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Clerk session token to pass to .NET API
    const token = await getToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to get authentication token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate the request body
    const resume = resumeSchema.parse(body);

    const { slug } = await params;
    // Update via the API (pass JWT token)
    const updated = await updateResumeBySlug(slug, resume, token);

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

