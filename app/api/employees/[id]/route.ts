// app/api/employees/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { updateEmployeeSchema } from '@/lib/validations/employee';
import { hashPassword } from '@/lib/auth/password';

interface Params { params: Promise<{ id: string }> }

// GET /api/employees/[id]
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Employees can only view their own record
  if (session.role === 'employee' && session.employeeId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServerClient();
  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  const { data: salarySetting } = await supabase
    .from('salary_settings')
    .select('*')
    .eq('employee_id', id)
    .maybeSingle();

  return NextResponse.json({ data: { ...employee, salary_setting: salarySetting ?? null } });
}

// PUT /api/employees/[id] — update employee details + salary settings + optional password reset
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { salary_per_day, is_pf_enabled, pf_amount, new_password, confirm_password, ...empData } = parsed.data;
  const supabase = createServerClient();

  // If a new password was provided by admin, update the user account password_hash
  if (new_password && new_password.trim().length > 0) {
    if (new_password.trim().length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    const password_hash = await hashPassword(new_password.trim());
    const { error: userError } = await supabase
      .from('users')
      .update({
        password_hash,
        must_change_pw: false,
        updated_at: new Date().toISOString(),
      })
      .eq('employee_id', id);

    if (userError) {
      console.error('[PUT /api/employees/[id]] user password update error:', userError);
      return NextResponse.json({ error: 'Failed to reset employee password' }, { status: 500 });
    }

    // Set audit fields on employee payload
    (empData as any).password_reset_at = new Date().toISOString();
    (empData as any).password_reset_by = session.username;
  }

  // Update employee record if employee fields were provided
  if (Object.keys(empData).length > 0) {
    let { error: empError } = await supabase
      .from('employees')
      .update(empData)
      .eq('id', id);

    // Fallback: If audit columns password_reset_at / password_reset_by are missing in DB schema cache (PGRST204),
    // strip them and retry so the update completes cleanly.
    if (
      empError &&
      empError.code === 'PGRST204' &&
      (empError.message.includes('password_reset_at') || empError.message.includes('password_reset_by'))
    ) {
      console.warn('[PUT /api/employees/[id]] Audit columns missing in schema cache, retrying update without audit columns.');
      delete (empData as any).password_reset_at;
      delete (empData as any).password_reset_by;

      if (Object.keys(empData).length > 0) {
        const retryResult = await supabase
          .from('employees')
          .update(empData)
          .eq('id', id);
        empError = retryResult.error;
      } else {
        empError = null;
      }
    }

    if (empError) {
      console.error('[PUT /api/employees/[id]] employee update error:', empError);
      return NextResponse.json({ error: empError.message || 'Failed to update employee' }, { status: 500 });
    }
  }

  // Update or insert salary_settings
  if (salary_per_day !== undefined || is_pf_enabled !== undefined || pf_amount !== undefined) {
    const { data: existing } = await supabase
      .from('salary_settings')
      .select('id')
      .eq('employee_id', id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('salary_settings')
        .update({
          ...(salary_per_day !== undefined && { salary_per_day }),
          ...(is_pf_enabled !== undefined && { is_pf_enabled }),
          ...(pf_amount !== undefined && { pf_amount }),
        })
        .eq('employee_id', id);
    } else {
      await supabase.from('salary_settings').insert({
        employee_id: id,
        salary_per_day: salary_per_day ?? 0,
        is_pf_enabled: Boolean(is_pf_enabled),
        pf_amount: pf_amount ?? 0,
      });
    }
  }

  return NextResponse.json({ message: 'Employee updated successfully' });
}

// DELETE /api/employees/[id] — deactivate or permanently delete employee
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get('permanent') === 'true';

  const supabase = createServerClient();

  if (permanent) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      console.error('[DELETE /api/employees/[id] permanent]', error);
      return NextResponse.json({ error: error.message || 'Failed to delete employee' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Employee permanently deleted' });
  }

  const { error } = await supabase
    .from('employees')
    .update({ status: 'inactive' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to deactivate employee' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Employee deactivated successfully' });
}
