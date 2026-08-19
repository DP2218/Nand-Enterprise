// app/api/voice-recordings/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';

const BUCKET_NAME = 'voice-recordings';

interface Params { params: Promise<{ id: string }> }

// GET /api/voice-recordings/[id] — Fetch recording metadata and signed URL for playback
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = createServerClient();

    const { data: recording, error } = await supabase
      .from('voice_recordings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !recording) {
      return NextResponse.json({ error: 'Voice recording not found' }, { status: 404 });
    }

    // Ownership check: Employee can only view their own recording
    if (session.role === 'employee' && session.employeeId !== recording.employee_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate signed URL
    let signedUrl = recording.file_url;
    try {
      const { data: signedData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(recording.file_name, 3600);
      if (signedData?.signedUrl) {
        signedUrl = signedData.signedUrl;
      }
    } catch (err) {
      console.error('[GET /api/voice-recordings/[id]] Signed URL error:', err);
    }

    return NextResponse.json({
      data: {
        ...recording,
        signedUrl,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/voice-recordings/[id]] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/voice-recordings/[id] — Admin-only deletion of recording file & database row
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Strictly enforce Admin role
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Deleting recordings is exclusive to administrators.' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    // 1. Fetch recording metadata to obtain filename
    const { data: recording, error: fetchError } = await supabase
      .from('voice_recordings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !recording) {
      return NextResponse.json({ error: 'Voice recording not found' }, { status: 404 });
    }

    // 2. Remove file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([recording.file_name]);

    if (storageError) {
      console.warn('[DELETE /api/voice-recordings/[id]] Storage delete warning:', storageError);
      // Proceed to delete DB record even if file was missing or already removed
    }

    // 3. Delete record from PostgreSQL
    const { error: dbDeleteError } = await supabase
      .from('voice_recordings')
      .delete()
      .eq('id', id);

    if (dbDeleteError) {
      console.error('[DELETE /api/voice-recordings/[id]] DB delete error:', dbDeleteError);
      return NextResponse.json({ error: dbDeleteError.message || 'Failed to delete recording record' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Voice recording deleted successfully' });
  } catch (err: any) {
    console.error('[DELETE /api/voice-recordings/[id]] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
