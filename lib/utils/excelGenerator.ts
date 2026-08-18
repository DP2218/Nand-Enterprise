// lib/utils/excelGenerator.ts
import ExcelJS from 'exceljs';
import type { Attendance, SalaryPayment, SalaryAdvance, Employee } from '@/lib/types';

// ─── Shared style helpers ──────────────────────────────────

function applyHeaderRow(ws: ExcelJS.Worksheet, columns: string[]): void {
  const headerRow = ws.addRow(columns);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  headerRow.height = 22;
}

function styleDataRows(ws: ExcelJS.Worksheet, startRow: number): void {
  for (let r = startRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    row.height = 18;
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      if (r % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
    });
  }
}

function addTitleBlock(
  ws: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  colCount: number
): void {
  ws.mergeCells(1, 1, 1, colCount);
  const t = ws.getCell('A1');
  t.value = 'NAND ENTERPRISE';
  t.font = { bold: true, size: 16, color: { argb: 'FF2563EB' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, colCount);
  const s = ws.getCell('A2');
  s.value = title;
  s.font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
  s.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  ws.mergeCells(3, 1, 3, colCount);
  const sub = ws.getCell('A3');
  sub.value = subtitle;
  sub.font = { size: 10, color: { argb: 'FF64748B' } };
  sub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 18;

  ws.addRow([]); // spacer
}

// ─── Attendance Report ─────────────────────────────────────

export async function generateAttendanceReport(
  records: (Attendance & { employee?: Employee })[],
  month: number,
  year: number
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NAND Enterprise';
  wb.created = new Date();

  const ws = wb.addWorksheet('Attendance Report');
  ws.columns = [
    { key: 'sno', width: 6 },
    { key: 'employee_number', width: 14 },
    { key: 'full_name', width: 24 },
    { key: 'department', width: 16 },
    { key: 'attendance_date', width: 14 },
    { key: 'status', width: 12 },
    { key: 'check_in', width: 12 },
    { key: 'check_out', width: 12 },
    { key: 'working_hours', width: 14 },
    { key: 'notes', width: 24 },
  ];

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
  });
  addTitleBlock(
    ws,
    'Attendance Report',
    `${monthName} ${year}`,
    ws.columns.length
  );

  applyHeaderRow(ws, [
    'S.No',
    'Emp No.',
    'Full Name',
    'Department',
    'Date',
    'Status',
    'Check In',
    'Check Out',
    'Working Hrs',
    'Notes',
  ]);

  records.forEach((r, i) => {
    ws.addRow({
      sno: i + 1,
      employee_number: r.employee?.employee_number ?? '',
      full_name: r.employee?.full_name ?? '',
      department: r.employee?.department ?? '',
      attendance_date: r.attendance_date,
      status: r.status.toUpperCase(),
      check_in: r.check_in ?? '',
      check_out: r.check_out ?? '',
      working_hours: r.working_hours ?? '',
      notes: r.notes ?? '',
    });
  });

  styleDataRows(ws, 5);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─── Salary Report ─────────────────────────────────────────

export async function generateSalaryReport(
  payments: (SalaryPayment & { employee?: Employee })[],
  month: number,
  year: number
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NAND Enterprise';
  wb.created = new Date();

  const ws = wb.addWorksheet('Salary Report');
  ws.columns = [
    { key: 'sno', width: 6 },
    { key: 'employee_number', width: 14 },
    { key: 'full_name', width: 24 },
    { key: 'present_days', width: 14 },
    { key: 'absent_days', width: 14 },
    { key: 'salary_per_day', width: 16 },
    { key: 'earned_salary', width: 16 },
    { key: 'pf_deducted', width: 14 },
    { key: 'prev_advance', width: 16 },
    { key: 'advance_deducted', width: 18 },
    { key: 'final_salary', width: 16 },
    { key: 'remaining_advance', width: 18 },
    { key: 'status', width: 12 },
  ];

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'long',
  });
  addTitleBlock(ws, 'Salary Report', `${monthName} ${year}`, ws.columns.length);

  applyHeaderRow(ws, [
    'S.No',
    'Emp No.',
    'Full Name',
    'Present',
    'Absent',
    'Rate/Day (₹)',
    'Earned (₹)',
    'PF (₹)',
    'Prev Advance (₹)',
    'Advance Ded. (₹)',
    'Final (₹)',
    'Remaining Adv (₹)',
    'Status',
  ]);

  payments.forEach((p, i) => {
    ws.addRow({
      sno: i + 1,
      employee_number: p.employee?.employee_number ?? '',
      full_name: p.employee?.full_name ?? '',
      present_days: p.present_days,
      absent_days: p.absent_days,
      salary_per_day: p.salary_per_day,
      earned_salary: p.earned_salary,
      pf_deducted: p.pf_deducted,
      prev_advance: p.previous_advance,
      advance_deducted: p.advance_deducted,
      final_salary: p.final_salary,
      remaining_advance: p.remaining_advance,
      status: p.payment_status.toUpperCase(),
    });
  });

  styleDataRows(ws, 5);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ─── Advance Report ────────────────────────────────────────

export async function generateAdvanceReport(
  advances: (SalaryAdvance & { employee?: Employee })[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NAND Enterprise';
  wb.created = new Date();

  const ws = wb.addWorksheet('Advance Report');
  ws.columns = [
    { key: 'sno', width: 6 },
    { key: 'employee_number', width: 14 },
    { key: 'full_name', width: 24 },
    { key: 'department', width: 16 },
    { key: 'advance_date', width: 14 },
    { key: 'amount', width: 14 },
    { key: 'note', width: 32 },
  ];

  addTitleBlock(ws, 'Advance Report', `Generated on ${new Date().toLocaleDateString()}`, ws.columns.length);

  applyHeaderRow(ws, [
    'S.No',
    'Emp No.',
    'Full Name',
    'Department',
    'Date',
    'Amount (₹)',
    'Note',
  ]);

  advances.forEach((a, i) => {
    ws.addRow({
      sno: i + 1,
      employee_number: a.employee?.employee_number ?? '',
      full_name: a.employee?.full_name ?? '',
      department: a.employee?.department ?? '',
      advance_date: a.advance_date,
      amount: a.amount,
      note: a.note ?? '',
    });
  });

  styleDataRows(ws, 5);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
