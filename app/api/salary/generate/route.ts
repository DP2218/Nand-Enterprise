// app/api/salary/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getSessionFromRequest } from '@/lib/auth/session';
import { generateSalarySchema } from '@/lib/validations/salary';
import { calculateSalary } from '@/lib/utils/salaryCalculator';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// POST /api/salary/generate — generate monthly salary for one employee
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = generateSalarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { employee_id, salary_month, salary_year } = parsed.data;
    const supabase = createServerClient();

    // 1. Get latest salary setting or fallback to default (0 rate)
    const { data: settings } = await supabase
      .from('salary_settings')
      .select('*')
      .eq('employee_id', employee_id)
      .order('created_at', { ascending: false })
      .limit(1);

    let setting = settings && settings.length > 0 ? settings[0] : null;

    if (!setting) {
      const { data: newSetting } = await supabase
        .from('salary_settings')
        .insert({ employee_id, salary_per_day: 0, is_pf_enabled: false, pf_amount: 0 })
        .select()
        .single();
      setting = newSetting ?? { salary_per_day: 0, is_pf_enabled: false, pf_amount: 0 };
    }

    // 2. Count attendance for the specified month
    const lastDay = new Date(salary_year, salary_month, 0).getDate();
    const paddedMonth = String(salary_month).padStart(2, '0');
    const paddedLastDay = String(lastDay).padStart(2, '0');

    const startDate = `${salary_year}-${paddedMonth}-01`;
    const endDate = `${salary_year}-${paddedMonth}-${paddedLastDay}`;

    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance')
      .select('status')
      .eq('employee_id', employee_id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (attError) {
      console.error('[POST /api/salary/generate] attError:', attError);
      return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 });
    }

    const presentDays = attendanceRecords?.filter((r) => r.status === 'present').length ?? 0;
    const absentDays = attendanceRecords?.filter((r) => r.status === 'absent').length ?? 0;
    const leaveDays = attendanceRecords?.filter((r) => r.status === 'leave').length ?? 0;

    // 3. Directly fetch outstanding advances for this employee from salary_advances table
    const { data: existingPayment } = await supabase
      .from('salary_payments')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('salary_month', salary_month)
      .eq('salary_year', salary_year)
      .maybeSingle();

    const currentPaymentId = existingPayment?.id;

    const { data: advances } = await supabase
      .from('salary_advances')
      .select('id, amount')
      .eq('employee_id', employee_id);

    const totalAdvances = advances?.reduce((sum, a) => sum + Number(a.amount), 0) ?? 0;

    let outstandingAdvance = totalAdvances;
    let otherAdjustments: any[] = [];

    if (advances && advances.length > 0) {
      const advanceIds = advances.map((a) => a.id);
      const { data: adjData } = await supabase
        .from('advance_adjustments')
        .select('amount_adjusted, advance_id, salary_payment_id')
        .in('advance_id', advanceIds);

      otherAdjustments = (adjData ?? []).filter(
        (a) => !currentPaymentId || a.salary_payment_id !== currentPaymentId
      );

      const totalAdjustedOther = otherAdjustments.reduce((sum, a) => sum + Number(a.amount_adjusted), 0);
      outstandingAdvance = Math.max(0, totalAdvances - totalAdjustedOther);
    }

    // 4. Calculate salary (allows advance to exceed net salary and produce negative net salary)
    const calc = calculateSalary({
      presentDays,
      salaryPerDay: Number(setting.salary_per_day ?? 0),
      isPfEnabled: Boolean(setting.is_pf_enabled),
      pfAmount: Number(setting.pf_amount ?? 0),
      outstandingAdvance,
    });

    // 5. Upsert salary payment
    const paymentPayload = {
      employee_id,
      salary_month,
      salary_year,
      salary_per_day: Number(setting.salary_per_day ?? 0),
      present_days: presentDays,
      absent_days: absentDays,
      leave_days: leaveDays,
      earned_salary: calc.earnedSalary,
      pf_deducted: calc.pfDeducted,
      previous_advance: outstandingAdvance,
      advance_deducted: calc.advanceDeducted,
      final_salary: calc.finalSalary,
      remaining_advance: calc.remainingAdvance,
      payment_status: 'pending',
    };

    const { data: payment, error: paymentError } = await supabase
      .from('salary_payments')
      .upsert(paymentPayload, { onConflict: 'employee_id,salary_month,salary_year' })
      .select()
      .single();

    if (paymentError) {
      console.error('[POST /api/salary/generate] paymentError:', paymentError);
      return NextResponse.json({ error: paymentError.message || 'Failed to save salary payment' }, { status: 500 });
    }

    // 6. Refresh advance adjustments for this payment
    if (payment?.id) {
      await supabase
        .from('advance_adjustments')
        .delete()
        .eq('salary_payment_id', payment.id);

      if (calc.advanceDeducted > 0 && advances && advances.length > 0) {
        let remaining = calc.advanceDeducted;
        for (const advance of advances) {
          if (remaining <= 0) break;
          const alreadyAdjustedByOthers = otherAdjustments
            .filter((a) => a.advance_id === advance.id)
            .reduce((s, a) => s + Number(a.amount_adjusted), 0);

          const advanceBalance = Number(advance.amount) - alreadyAdjustedByOthers;
          if (advanceBalance <= 0) continue;

          const deduct = Math.min(remaining, advanceBalance);
          await supabase.from('advance_adjustments').insert({
            advance_id: advance.id,
            salary_payment_id: payment.id,
            amount_adjusted: round2(deduct),
          });
          remaining -= deduct;
        }
      }
    }

    return NextResponse.json({
      data: { payment, calculation: calc },
      message: 'Salary generated successfully',
    }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/salary/generate] exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/salary/generate — mark salary as paid
export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { payment_id } = body;

    if (!payment_id) {
      return NextResponse.json({ error: 'payment_id is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('salary_payments')
      .update({
        payment_status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', payment_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to mark salary as paid' }, { status: 500 });
    }

    return NextResponse.json({ data, message: 'Salary marked as paid' });
  } catch (err: any) {
    console.error('[PATCH /api/salary/generate]', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
