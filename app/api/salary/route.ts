// app/api/salary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { upsertSalarySettingSchema } from '@/lib/validations/salary';

// GET /api/salary — list salary settings or salary payments
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'payments';
  const employee_id = searchParams.get('employee_id');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  const supabase = createServerClient();

  if (type === 'settings') {
    if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let query = supabase
      .from('salary_settings')
      .select('*, employee:employees(employee_number, full_name, department, designation)')
      .order('created_at', { ascending: false });

    if (employee_id) query = query.eq('employee_id', employee_id);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch salary settings' }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }

  // type = payments
  let query = supabase
    .from('salary_payments')
    .select('*, employee:employees(employee_number, full_name, department, designation)')
    .order('salary_year', { ascending: false })
    .order('salary_month', { ascending: false });

  if (session.role === 'employee') {
    let empId = session.employeeId;
    if (!empId) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', session.username)
        .maybeSingle();
      empId = emp?.id ?? null;
    }
    if (!empId) return NextResponse.json({ error: 'Employee profile not found' }, { status: 403 });
    query = query.eq('employee_id', empId);
  } else if (employee_id) {
    query = query.eq('employee_id', employee_id);
  }

  if (month) query = query.eq('salary_month', parseInt(month));
  if (year) query = query.eq('salary_year', parseInt(year));

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/salary]', error);
    return NextResponse.json({ error: 'Failed to fetch salary data' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// POST /api/salary — upsert salary setting (admin only)
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = upsertSalarySettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('salary_settings')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/salary]', error);
      return NextResponse.json({ error: 'Failed to save salary setting' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Salary setting saved' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/salary]', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/salary — delete single payment record (by id) or clear entire month history (by month & year)
export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  const supabase = createServerClient();

  if (id) {
    // Delete single payment record
    const { error } = await supabase.from('salary_payments').delete().eq('id', id);
    if (error) {
      console.error('[DELETE /api/salary?id]', error);
      return NextResponse.json({ error: error.message || 'Failed to delete salary record' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Salary record deleted successfully' });
  }

  if (month && year) {
    // Clear entire month history
    const { error } = await supabase
      .from('salary_payments')
      .delete()
      .eq('salary_month', parseInt(month))
      .eq('salary_year', parseInt(year));

    if (error) {
      console.error('[DELETE /api/salary?month&year]', error);
      return NextResponse.json({ error: error.message || 'Failed to clear month salary history' }, { status: 500 });
    }
    return NextResponse.json({ message: `Cleared salary history for ${month}/${year}` });
  }

  return NextResponse.json({ error: 'Missing id or month & year parameters' }, { status: 400 });
}
