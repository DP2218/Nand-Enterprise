// lib/validations/advance.ts
import { z } from 'zod';

export const createAdvanceSchema = z.object({
  employee_id: z.string().min(1, 'Please select an employee'),
  amount: z.number().positive('Amount must be positive'),
  advance_date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});

export type CreateAdvanceInput = z.infer<typeof createAdvanceSchema>;
