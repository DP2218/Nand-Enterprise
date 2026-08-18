// lib/validations/salary.ts
import { z } from 'zod';

export const upsertSalarySettingSchema = z.object({
  employee_id: z.string().min(1, 'Please select an employee'),
  salary_per_day: z.number().positive('Salary per day must be positive'),
  is_pf_enabled: z.boolean(),
  pf_amount: z.number().min(0),
  effective_from: z.string().min(1),
});

export const generateSalarySchema = z.object({
  employee_id: z.string().min(1, 'Please select an employee'),
  salary_month: z.number().int().min(1).max(12),
  salary_year: z.number().int().min(2020).max(2100),
});

export type UpsertSalarySettingInput = z.infer<typeof upsertSalarySettingSchema>;
export type GenerateSalaryInput = z.infer<typeof generateSalarySchema>;
