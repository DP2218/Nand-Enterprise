-- ============================================================
-- NAND ENTERPRISE — Voice Recording Module Migration
-- PostgreSQL / Supabase
-- ============================================================

-- 1. Add per-employee permission toggle to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS voice_recording_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create voice_recordings table
CREATE TABLE IF NOT EXISTS voice_recordings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name     TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_url          TEXT NOT NULL,
  duration_seconds  INTEGER NOT NULL,
  file_size         BIGINT NOT NULL,
  recording_type    TEXT NOT NULL DEFAULT 'daily_update',
  remarks           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries & date filtering
CREATE INDEX IF NOT EXISTS idx_voice_recordings_employee ON voice_recordings(employee_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_created_at ON voice_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_type ON voice_recordings(recording_type);

-- 3. Enable Row Level Security
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voice_recordings' AND policyname = 'service_role_all_voice_recordings'
  ) THEN
    CREATE POLICY "service_role_all_voice_recordings" ON voice_recordings
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Policy: Employees can view their own recordings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voice_recordings' AND policyname = 'employees_select_own_voice_recordings'
  ) THEN
    CREATE POLICY "employees_select_own_voice_recordings" ON voice_recordings
      FOR SELECT USING (
        employee_id IN (
          SELECT employee_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: Employees can insert their own recordings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voice_recordings' AND policyname = 'employees_insert_own_voice_recordings'
  ) THEN
    CREATE POLICY "employees_insert_own_voice_recordings" ON voice_recordings
      FOR INSERT WITH CHECK (
        employee_id IN (
          SELECT employee_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: Admin role full SELECT access to all recordings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voice_recordings' AND policyname = 'admins_select_all_voice_recordings'
  ) THEN
    CREATE POLICY "admins_select_all_voice_recordings" ON voice_recordings
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Policy: Admin role full DELETE access (employees get NO delete policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voice_recordings' AND policyname = 'admins_delete_all_voice_recordings'
  ) THEN
    CREATE POLICY "admins_delete_all_voice_recordings" ON voice_recordings
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 4. Supabase Private Storage Bucket Setup Instructions & Policies
-- Storage bucket 'voice-recordings' must be created as PRIVATE.
-- Server-side API endpoints use service_role client to upload and generate signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings',
  FALSE,
  10485760, -- 10MB limit in bytes
  ARRAY['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/wav'];

-- 5. Force Supabase PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';

