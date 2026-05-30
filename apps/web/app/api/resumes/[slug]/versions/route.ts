import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listResumeVersions } from '@/lib/resume-api';

// GET /api/resumes/{slug}/versions - admin-only version metadata list.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Failed to get authentication token' }, { status: 401 });
  }

  const { slug } = await params;
  try {
    const versions = await listResumeVersions(slug, token);
    return NextResponse.json(versions, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list versions' },
      { status: 500 }
    );
  }
}
