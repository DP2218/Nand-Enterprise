// app/api/leave/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { updateLeaveSchema } from '@/lib/validations/leave';

interface Params { params: Promise<{ id: string }> }

// PUT /api/leave/[id] — admin approves or rejects
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateLeaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('leave_requests')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[PUT /api/leave/[id]]', error);
    return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
  }

  return NextResponse.json({ data, message: `Leave request ${parsed.data.status}` });
}

// DELETE /api/leave/[id] — employee withdraws pending request
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Get the leave request first
  const { data: leave, error: fetchError } = await supabaseServer
    .from('leave_requests')
    .select('employee_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !leave) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
  }

  // Only the employee who submitted it can delete, and only if pending
  if (session.role === 'employee') {
    if (leave.employee_id !== session.employeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (leave.status !== 'pending') {
      return NextResponse.json({ error: 'Cannot withdraw a processed leave request' }, { status: 400 });
    }
  }

  const { error } = await supabaseServer.from('leave_requests').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Leave request withdrawn' });
}
