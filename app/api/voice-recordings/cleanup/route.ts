// app/api/voice-recordings/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';

const BUCKET_NAME = 'voice-recordings';

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}

async function handleCleanup(request: NextRequest) {
  try {
    // Auth check: allow either Vercel Cron (via Authorization header or secret) OR authenticated Admin
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    let isAuthorized = false;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    } else {
      const session = await getSessionFromRequest(request);
      if (session && session.role === 'admin') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized cron/cleanup request' }, { status: 401 });
    }

    const supabase = createServerClient();

    // 12 months ago timestamp
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const cutoffIso = twelveMonthsAgo.toISOString();

    // 1. Query recordings older than 12 months
    const { data: expiredRecordings, error: queryError } = await supabase
      .from('voice_recordings')
      .select('id, file_name')
      .lt('created_at', cutoffIso);

    if (queryError) {
      console.error('[voice-recordings/cleanup] Query error:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!expiredRecordings || expiredRecordings.length === 0) {
      return NextResponse.json({
        message: 'Cleanup completed — no recordings older than 12 months found',
        deletedCount: 0,
      });
    }

    const fileNamesToDelete = expiredRecordings.map((r) => r.file_name);
    const idsToDelete = expiredRecordings.map((r) => r.id);

    // 2. Remove files from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(fileNamesToDelete);

    if (storageError) {
      console.warn('[voice-recordings/cleanup] Storage removal warning:', storageError);
    }

    // 3. Delete rows from PostgreSQL
    const { error: dbDeleteError } = await supabase
      .from('voice_recordings')
      .delete()
      .in('id', idsToDelete);

    if (dbDeleteError) {
      console.error('[voice-recordings/cleanup] DB delete error:', dbDeleteError);
      return NextResponse.json({ error: dbDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Automated 12-month storage retention cleanup completed',
      deletedCount: expiredRecordings.length,
      deletedFiles: fileNamesToDelete,
    });
  } catch (err: any) {
    console.error('[voice-recordings/cleanup] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
