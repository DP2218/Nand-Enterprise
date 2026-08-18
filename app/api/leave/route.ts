// app/api/leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { createLeaveSchema } from '@/lib/validations/leave';

// GET /api/leave
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabaseServer
    .from('leave_requests')
    .select('*, employee:employees(employee_number, full_name, department)')
    .order('created_at', { ascending: false });

  if (session.role === 'employee') {
    query = query.eq('employee_id', session.employeeId!);
  }

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/leave]', error);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/leave — employees submit leave request
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'employee') {
    return NextResponse.json({ error: 'Only employees can submit leave requests' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createLeaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('leave_requests')
      .insert({
        employee_id: session.employeeId!,
        ...parsed.data,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/leave]', error);
      return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Leave request submitted' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/leave]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

