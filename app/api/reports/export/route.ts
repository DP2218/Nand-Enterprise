// app/api/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import {
  generateAttendanceReport,
  generateSalaryReport,
  generateAdvanceReport,
} from '@/lib/utils/excelGenerator';
import type { ReportType } from '@/lib/types';

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as ReportType;
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  const employee_id = searchParams.get('employee_id');

  if (!type || !['attendance', 'salary', 'advances'].includes(type)) {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  }

  try {
    let buffer: Buffer;
    let filename: string;

    if (type === 'attendance') {
      if (!month || !year) {
        return NextResponse.json({ error: 'month and year are required for attendance reports' }, { status: 400 });
      }

      const paddedMonth = String(month).padStart(2, '0');
      let query = supabaseServer
        .from('attendance')
        .select('*, employee:employees(employee_number, full_name, department)')
        .gte('attendance_date', `${year}-${paddedMonth}-01`)
        .lte('attendance_date', `${year}-${paddedMonth}-31`)
        .order('attendance_date', { ascending: true });

      if (employee_id) query = query.eq('employee_id', employee_id);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });

      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      buffer = await generateAttendanceReport(data ?? [], month, year);
      filename = `attendance_${monthName}_${year}.xlsx`;

    } else if (type === 'salary') {
      if (!month || !year) {
        return NextResponse.json({ error: 'month and year are required for salary reports' }, { status: 400 });
      }

      let query = supabaseServer
        .from('salary_payments')
        .select('*, employee:employees(employee_number, full_name, department)')
        .eq('salary_month', month)
        .eq('salary_year', year);

      if (employee_id) query = query.eq('employee_id', employee_id);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });

      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      buffer = await generateSalaryReport(data ?? [], month, year);
      filename = `salary_${monthName}_${year}.xlsx`;

    } else {
      // advances
      let query = supabaseServer
        .from('salary_advances')
        .select('*, employee:employees(employee_number, full_name, department)')
        .order('advance_date', { ascending: false });

      if (employee_id) query = query.eq('employee_id', employee_id);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 });

      buffer = await generateAdvanceReport(data ?? []);
      filename = `advances_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/reports/export]', err);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

