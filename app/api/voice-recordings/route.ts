// app/api/voice-recordings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';

const BUCKET_NAME = 'voice-recordings';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DURATION_SECONDS = 60; // 60s limit

// Ensure Supabase private storage bucket exists
async function ensureBucketExists(supabase: ReturnType<typeof createServerClient>) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = (buckets ?? []).some((b) => b.name === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: [
          'audio/webm',
          'audio/webm;codecs=opus',
          'audio/ogg',
          'audio/mp4',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/aac',
          'audio/x-m4a',
          'audio/m4a',
          'audio/wav',
        ],
      });
    }
  } catch (err) {
    console.error('[ensureBucketExists] error:', err);
  }
}

// GET /api/voice-recordings — List recordings (Admin: all, Employee: own)
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const employeeIdParam = searchParams.get('employee_id');
    const searchParam = searchParams.get('search');

    const supabase = createServerClient();
    let query = supabase
      .from('voice_recordings')
      .select('*')
      .order('created_at', { ascending: false });

    // Role-based access filtering
    if (session.role === 'employee') {
      if (!session.employeeId) {
        return NextResponse.json({ error: 'Employee ID missing from session' }, { status: 400 });
      }
      query = query.eq('employee_id', session.employeeId);
    } else if (employeeIdParam) {
      query = query.eq('employee_id', employeeIdParam);
    }

    if (dateParam) {
      // Date filter (e.g. YYYY-MM-DD)
      const startDate = `${dateParam}T00:00:00.000Z`;
      const endDate = `${dateParam}T23:59:59.999Z`;
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data: recordings, error } = await query;
    if (error) {
      console.error('[GET /api/voice-recordings] Supabase query error:', error);
      return NextResponse.json({ error: error.message || 'Failed to fetch recordings' }, { status: 500 });
    }

    let result = recordings ?? [];

    // Filter by employee search query (name or number) if provided by admin
    if (searchParam && session.role === 'admin') {
      const s = searchParam.toLowerCase();
      result = result.filter((r) => r.employee_name.toLowerCase().includes(s));
    }

    // Generate signed URLs for audio playback for each recording
    await ensureBucketExists(supabase);

    const recordingsWithSignedUrls = await Promise.all(
      result.map(async (rec) => {
        let signedUrl = rec.file_url;
        try {
          const { data } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(rec.file_name, 3600); // 1 hour expiration
          if (data?.signedUrl) {
            signedUrl = data.signedUrl;
          }
        } catch {
          // Fallback to saved URL if signing fails
        }
        return {
          ...rec,
          signedUrl,
        };
      })
    );

    return NextResponse.json({ data: recordingsWithSignedUrls });
  } catch (err: any) {
    console.error('[GET /api/voice-recordings] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/voice-recordings — Upload voice recording
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    // Determine target employee ID
    let targetEmployeeId = session.employeeId;

    if (session.role === 'admin') {
      // Admin could pass employee_id in form if uploading on behalf of an employee
      const formData = await request.clone().formData();
      const adminSpecifiedEmpId = formData.get('employee_id')?.toString();
      if (adminSpecifiedEmpId) {
        targetEmployeeId = adminSpecifiedEmpId;
      }
    }

    if (!targetEmployeeId) {
      return NextResponse.json({ error: 'Employee record not associated with this account' }, { status: 400 });
    }

    // SERVER-SIDE PERMISSION CHECK: Verify voice_recording_enabled flag on employee
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, employee_number, full_name, voice_recording_enabled, status')
      .eq('id', targetEmployeeId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!employee.voice_recording_enabled) {
      return NextResponse.json(
        { error: 'Voice recording access is not enabled for this employee. Please contact an administrator.' },
        { status: 403 }
      );
    }

    if (employee.status !== 'active') {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const durationSecondsStr = formData.get('duration_seconds')?.toString() || '0';
    const recordingType = formData.get('recording_type')?.toString() || 'daily_update';
    const remarks = formData.get('remarks')?.toString() || null;

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const durationSeconds = Math.round(Number(durationSecondsStr));

    // SERVER-SIDE VALIDATION: Enforce file size (<= 10MB) & duration (<= 60s)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 10MB limit (uploaded: ${(file.size / (1024 * 1024)).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    if (durationSeconds > MAX_DURATION_SECONDS) {
      return NextResponse.json(
        { error: `Recording duration exceeds the maximum limit of 60 seconds (duration: ${durationSeconds}s)` },
        { status: 400 }
      );
    }

    const formMimeType = formData.get('mime_type')?.toString() || file.type || '';
    
    // Derive correct file extension from uploaded file name, mime_type, or file.type
    let extension = 'webm';
    if (file.name && file.name.includes('.')) {
      const extFromFileName = file.name.split('.').pop()?.toLowerCase();
      if (extFromFileName && ['webm', 'm4a', 'mp4', 'ogg', 'wav', 'aac'].includes(extFromFileName)) {
        extension = extFromFileName;
      }
    } else if (formMimeType.includes('mp4') || formMimeType.includes('aac') || formMimeType.includes('m4a')) {
      extension = 'm4a';
    } else if (formMimeType.includes('ogg')) {
      extension = 'ogg';
    } else if (formMimeType.includes('wav')) {
      extension = 'wav';
    } else if (formMimeType.includes('webm')) {
      extension = 'webm';
    }

    // Generate unique filename: employeeId_timestamp.extension (e.g., EMP001_20260819_103000.m4a)
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const fileName = `${employee.employee_number}_${timestampStr}.${extension}`;

    const effectiveMimeType = formMimeType || file.type || (extension === 'm4a' ? 'audio/mp4' : 'audio/webm');

    await ensureBucketExists(supabase);

    // Convert file to Buffer for Supabase upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload audio blob to Supabase Storage private bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: effectiveMimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[POST /api/voice-recordings] Supabase storage upload error:', uploadError);
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const fileStoragePath = uploadData.path;

    // Save recording metadata to PostgreSQL
    const { data: recording, error: dbError } = await supabase
      .from('voice_recordings')
      .insert({
        employee_id: employee.id,
        employee_name: employee.full_name,
        file_name: fileName,
        file_url: fileStoragePath,
        duration_seconds: durationSeconds,
        file_size: file.size,
        recording_type: recordingType,
        mime_type: effectiveMimeType,
        remarks: remarks,
      })
      .select()
      .single();

    if (dbError || !recording) {
      console.error('[POST /api/voice-recordings] DB insert error:', dbError);
      // Attempt cleanup of uploaded storage file
      await supabase.storage.from(BUCKET_NAME).remove([fileName]);
      return NextResponse.json({ error: dbError?.message || 'Failed to save recording metadata' }, { status: 500 });
    }

    // Generate signed URL for immediate playback response
    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 3600);

    return NextResponse.json(
      {
        data: {
          ...recording,
          signedUrl: signedData?.signedUrl || fileStoragePath,
        },
        message: 'Voice recording uploaded successfully',
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[POST /api/voice-recordings] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
