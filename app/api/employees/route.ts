// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateEmployeeNumber } from '@/lib/utils/employeeNumber';
import { hashPassword } from '@/lib/auth/password';
import { getSessionFromRequest } from '@/lib/auth/session';
import { createEmployeeSchema } from '@/lib/validations/employee';

// GET /api/employees — list all employees with salary settings (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const supabase = createServerClient();
    let query = supabase
      .from('employees')
      .select('*')
      .order('employee_number', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: employees, error: empError } = await query;
    if (empError) {
      console.error('[GET /api/employees] Supabase error:', empError);
      return NextResponse.json({ error: empError.message || 'Failed to fetch employees' }, { status: 500 });
    }

    // Fetch salary settings for all employees
    const { data: salarySettings } = await supabase.from('salary_settings').select('*');

    const data = (employees ?? []).map((emp) => ({
      ...emp,
      salary_setting: (salarySettings ?? []).find((s) => s.employee_id === emp.id) ?? null,
    }));

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[GET /api/employees] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/employees — create employee + user account + salary settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      full_name, phone, department, designation, joining_date, address, password,
      salary_per_day, is_pf_enabled, pf_amount, voice_recording_enabled
    } = parsed.data;

    // Generate employee number
    const employee_number = await generateEmployeeNumber();
    const supabase = createServerClient();

    // Insert employee
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .insert({
        employee_number,
        full_name,
        phone,
        department,
        designation,
        joining_date,
        address,
        voice_recording_enabled: Boolean(voice_recording_enabled),
      })
      .select()
      .single();

    if (empError || !employee) {
      console.error('[POST /api/employees] employee insert:', empError);
      return NextResponse.json({ error: empError?.message || 'Failed to create employee' }, { status: 500 });
    }

    // Create user account (password defaults to phone number)
    const rawPassword = password || phone;
    const password_hash = await hashPassword(rawPassword);

    const { error: userError } = await supabase.from('users').insert({
      employee_id: employee.id,
      username: employee_number,
      password_hash,
      role: 'employee',
      must_change_pw: false,
    });

    if (userError) {
      console.error('[POST /api/employees] user insert:', userError);
      // Rollback employee
      await supabase.from('employees').delete().eq('id', employee.id);
      return NextResponse.json({ error: userError.message || 'Failed to create user account' }, { status: 500 });
    }

    // Create salary settings for employee
    await supabase.from('salary_settings').insert({
      employee_id: employee.id,
      salary_per_day: salary_per_day ?? 0,
      is_pf_enabled: Boolean(is_pf_enabled),
      pf_amount: pf_amount ?? 0,
    });

    return NextResponse.json({ data: employee, message: 'Employee created successfully' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/employees] Unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
