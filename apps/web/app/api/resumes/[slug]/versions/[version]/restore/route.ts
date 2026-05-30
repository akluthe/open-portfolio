import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { restoreResumeVersion } from '@/lib/resume-api';

// POST /api/resumes/{slug}/versions/{version}/restore - re-apply a version as the new latest.
export async function POST(
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
    const restored = await restoreResumeVersion(slug, versionNumber, token);
    return NextResponse.json(restored, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restore version' },
      { status: 500 }
    );
  }
}
