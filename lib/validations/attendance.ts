// lib/validations/attendance.ts
import { z } from 'zod';

export const upsertAttendanceSchema = z.object({
  employee_id: z.string().min(1, 'Please select an employee'),
  attendance_date: z.string().min(1, 'Date is required'),
  status: z.enum(['present', 'absent', 'leave']),
  check_in: z.string().nullable().optional(),
  check_out: z.string().nullable().optional(),
  working_hours: z.number().min(0).max(24).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type UpsertAttendanceInput = z.infer<typeof upsertAttendanceSchema>;
