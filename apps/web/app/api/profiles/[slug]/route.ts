import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { tailoringProfileSchema } from '@/lib/shared-types';
import { upsertProfile, deleteProfile } from '@/lib/profile-api';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getToken();

    if (!token) {
      return NextResponse.json({ error: 'Failed to get authentication token' }, { status: 401 });
    }

    const body = await request.json();

    // Validate the request body against the authoritative schema
    const profile = tailoringProfileSchema.parse(body);

    const { slug } = await params;
    const updated = await upsertProfile(slug, profile, token);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message.includes('Validation')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getToken();

    if (!token) {
      return NextResponse.json({ error: 'Failed to get authentication token' }, { status: 401 });
    }

    const { slug } = await params;
    await deleteProfile(slug, token);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
