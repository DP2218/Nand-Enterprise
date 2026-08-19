-- ============================================================
-- NAND ENTERPRISE — Add mime_type column to voice_recordings
-- ============================================================

-- Add mime_type column if it doesn't already exist
ALTER TABLE voice_recordings 
ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'audio/webm';

-- Update Supabase storage bucket allowed MIME types to support iOS Safari (mp4/aac/m4a)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings',
  FALSE,
  10485760, -- 10MB limit in bytes
  ARRAY['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/aac', 'audio/x-m4a', 'audio/m4a', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/aac', 'audio/x-m4a', 'audio/m4a', 'audio/wav'];

NOTIFY pgrst, 'reload schema';
