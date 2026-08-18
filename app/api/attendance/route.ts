// app/api/attendance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { upsertAttendanceSchema } from '@/lib/validations/attendance';

// Helper to format HH:MM:SS for Postgres TIME column (returns null for empty strings)
function formatTime24(timeStr?: string | null): string | null {
  if (!timeStr || typeof timeStr !== 'string' || timeStr.trim() === '' || timeStr === '--:--') {
    return null;
  }
  const clean = timeStr.trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(clean)) {
    return clean.length === 5 ? `${clean}:00` : clean;
  }

  const d = new Date(`1970-01-01 ${clean}`);
  if (!isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return null;
}

const isUuid = (str?: any): boolean =>
  typeof str === 'string' &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(str.trim());

// GET /api/attendance
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const employee_id = searchParams.get('employee_id');
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  const supabase = createServerClient();
  let query = supabase
    .from('attendance')
    .select('*, employee:employees(employee_number, full_name, department)')
    .order('attendance_date', { ascending: false });

  // Employees can only see their own attendance
  if (session.role === 'employee') {
    let empId = isUuid(session.employeeId) ? session.employeeId : null;
    if (!empId) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', session.username);
      empId = emp && emp.length > 0 ? emp[0].id : null;
    }

    if (!empId) return NextResponse.json({ error: 'Employee profile not found' }, { status: 403 });
    query = query.eq('employee_id', empId);
  } else if (employee_id && isUuid(employee_id)) {
    query = query.eq('employee_id', employee_id);
  }

  if (month && year) {
    const paddedMonth = String(month).padStart(2, '0');
    query = query
      .gte('attendance_date', `${year}-${paddedMonth}-01`)
      .lte('attendance_date', `${year}-${paddedMonth}-31`);
  } else if (start_date && end_date) {
    query = query.gte('attendance_date', start_date).lte('attendance_date', end_date);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/attendance]', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST /api/attendance — upsert (Admin or Employee for self)
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Auto-resolve employee_id if missing or not a valid UUID string
    if (!body.employee_id || !isUuid(body.employee_id)) {
      let empId = isUuid(session.employeeId) ? session.employeeId : null;

      // 1. Lookup employee by session username (e.g. NAND0001)
      if (!empId && session.username) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_number', session.username);
        empId = emp && emp.length > 0 ? emp[0].id : null;
      }

      // 2. Admin fallback: Binds to first active employee in database
      if (!empId) {
        const { data: firstEmp } = await supabase
          .from('employees')
          .select('id')
          .eq('status', 'active');
        empId = firstEmp && firstEmp.length > 0 ? firstEmp[0].id : null;
      }

      if (!empId) {
        return NextResponse.json({ error: 'No active employee found in database.' }, { status: 400 });
      }
      body.employee_id = empId;
    }

    // Format check_in/check_out for Postgres TIME column (convert "" to null)
    body.check_in = formatTime24(body.check_in);
    body.check_out = formatTime24(body.check_out);

    const parsed = upsertAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[POST /api/attendance] validation error:', parsed.error.issues);
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert(parsed.data, { onConflict: 'employee_id,attendance_date' })
      .select('*, employee:employees(employee_number, full_name, department)')
      .single();

    if (error) {
      console.error('[POST /api/attendance] Supabase error:', error);
      return NextResponse.json({ error: error.message || 'Failed to save attendance' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Attendance marked successfully' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/attendance]', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
