// app/api/advances/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { createAdvanceSchema } from '@/lib/validations/advance';

// GET /api/advances
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const employee_id = searchParams.get('employee_id');

  const supabase = createServerClient();
  let query = supabase
    .from('salary_advances')
    .select('*, employee:employees(employee_number, full_name, department)')
    .order('advance_date', { ascending: false });

  if (session.role === 'employee') {
    query = query.eq('employee_id', session.employeeId!);
  } else if (employee_id) {
    query = query.eq('employee_id', employee_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/advances]', error);
    return NextResponse.json({ error: 'Failed to fetch advances' }, { status: 500 });
  }

  if (session.role === 'employee' && session.employeeId) {
    const { data: adjustments } = await supabase
      .from('advance_adjustments')
      .select('amount_adjusted, advance_id')
      .in('advance_id', (data ?? []).map((a) => a.id));

    const totalAdvances = (data ?? []).reduce((sum, a) => sum + Number(a.amount), 0);
    const totalAdjusted = (adjustments ?? []).reduce((sum, a) => sum + Number(a.amount_adjusted), 0);
    const outstandingBalance = Math.max(0, totalAdvances - totalAdjusted);

    return NextResponse.json({ data, outstandingBalance });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST /api/advances — admin records a new advance
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = createAdvanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('salary_advances')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/advances]', error);
      return NextResponse.json({ error: 'Failed to record advance' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Advance recorded successfully' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/advances]', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/advances — admin clears / deletes an advance record
export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Advance ID is required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('salary_advances').delete().eq('id', id);

  if (error) {
    console.error('[DELETE /api/advances]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete advance record' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Advance record cleared successfully' });
}
