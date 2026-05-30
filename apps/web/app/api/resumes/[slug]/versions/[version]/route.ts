import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchResumeVersion } from '@/lib/resume-api';

// GET /api/resumes/{slug}/versions/{version} - full document for one version.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Failed to get authentication token' }, { status: 401 });
  }

  const { slug, version } = await params;
  const versionNumber = Number(version);
  if (!Number.isInteger(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ error: 'Invalid version' }, { status: 400 });
  }

  try {
    const doc = await fetchResumeVersion(slug, versionNumber, token);
    if (!doc) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    return NextResponse.json(doc, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch version' },
      { status: 500 }
    );
  }
}
