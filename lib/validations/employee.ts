// lib/validations/employee.ts
import { z } from 'zod';

export const createEmployeeSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Enter a valid phone number').max(15),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  joining_date: z.string().min(1, 'Joining date is required'),
  address: z.string().optional(),
  password: z.string().optional(),
  salary_per_day: z.number().min(0).optional(),
  is_pf_enabled: z.boolean().optional(),
  pf_amount: z.number().min(0).optional(),
});

export const updateEmployeeSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().min(10).max(15).optional(),
  department: z.string().min(1).optional(),
  designation: z.string().min(1).optional(),
  joining_date: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  salary_per_day: z.number().min(0).optional(),
  is_pf_enabled: z.boolean().optional(),
  pf_amount: z.number().min(0).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
