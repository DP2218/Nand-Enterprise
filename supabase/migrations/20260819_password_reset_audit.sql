-- ============================================================
-- NAND ENTERPRISE — Admin Password Reset Audit Migration
-- PostgreSQL / Supabase
-- ============================================================

-- Add password reset audit columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS password_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_by TEXT;

-- Notify PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
