// lib/utils/employeeNumber.ts
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Generates the next sequential employee number in the format NAND####.
 * Queries the DB for the highest existing number and increments.
 */
export async function generateEmployeeNumber(): Promise<string> {
  const { data, error } = await supabaseServer
    .from('employees')
    .select('employee_number')
    .order('employee_number', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return 'NAND0001';
  }

  // Extract numeric part: "NAND0042" → 42
  const match = data.employee_number.match(/NAND(\d+)/);
  if (!match) return 'NAND0001';

  const next = parseInt(match[1], 10) + 1;
  return `NAND${String(next).padStart(4, '0')}`;
}
