// lib/validations/leave.ts
import { z } from 'zod';

export const createLeaveSchema = z.object({
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().min(5, 'Please provide a reason (min 5 characters)'),
});

export const updateLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  admin_remark: z.string().optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>;
