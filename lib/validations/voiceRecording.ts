// lib/validations/voiceRecording.ts
import { z } from 'zod';

export const createVoiceRecordingSchema = z.object({
  recording_type: z.string().default('daily_update'),
  mime_type: z.string().optional(),
  remarks: z.string().optional(),
  duration_seconds: z.number().min(1).max(60, 'Recording duration must be at most 60 seconds'),
  file_size: z.number().max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
});

export type CreateVoiceRecordingInput = z.infer<typeof createVoiceRecordingSchema>;
