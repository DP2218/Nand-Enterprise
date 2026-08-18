// lib/utils/salaryCalculator.ts
// Pure salary calculation functions — no DB access.

export interface SalaryCalcInput {
  presentDays: number;
  salaryPerDay: number;
  isPfEnabled: boolean;
  pfAmount: number;
  outstandingAdvance: number;
}

export interface SalaryCalcResult {
  earnedSalary: number;
  pfDeducted: number;
  advanceDeducted: number;
  finalSalary: number;
  remainingAdvance: number;
}

export function calculateSalary(input: SalaryCalcInput): SalaryCalcResult {
  // 1. Earned Salary = Present Days * Daily Rate
  const earnedSalary = round2(input.presentDays * input.salaryPerDay);

  // 2. PF Deduction (cannot exceed earned salary)
  const rawPf = input.isPfEnabled ? round2(input.pfAmount) : 0;
  const pfDeducted = round2(Math.min(earnedSalary, Math.max(0, rawPf)));

  // 3. Full Advance Deduction (deducts full outstanding advance)
  const advanceDeducted = round2(input.outstandingAdvance);

  // 4. Net Final Salary = Earned - PF - Advance (can be negative if advance > net)
  const finalSalary = round2(earnedSalary - pfDeducted - advanceDeducted);

  // 5. Remaining Advance Balance
  const remainingAdvance = round2(Math.max(0, input.outstandingAdvance - advanceDeducted));

  return {
    earnedSalary,
    pfDeducted,
    advanceDeducted,
    finalSalary,
    remainingAdvance,
  };
}

/**
 * Computes the total outstanding advance for an employee.
 * = SUM(advances) - SUM(adjustments already applied)
 */
export function computeOutstandingAdvance(
  totalAdvances: number,
  totalAdjusted: number
): number {
  return round2(Math.max(0, totalAdvances - totalAdjusted));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Returns the number of calendar days in a given month/year.
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}
