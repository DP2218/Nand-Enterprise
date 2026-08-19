-- ============================================================
-- NAND ENTERPRISE — Full Database Schema + RLS + Seed Data
-- PostgreSQL / Supabase
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE employee_status AS ENUM ('active', 'inactive');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'paid');

-- ============================================================
-- TABLES
-- ============================================================

-- Employees table
CREATE TABLE employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number   TEXT UNIQUE NOT NULL,
  full_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  department        TEXT NOT NULL DEFAULT 'General',
  designation       TEXT NOT NULL DEFAULT 'Staff',
  joining_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  address           TEXT,
  status            employee_status NOT NULL DEFAULT 'active',
  voice_recording_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  password_reset_at TIMESTAMPTZ,
  password_reset_by TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (admins + employees)
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'employee',
  must_change_pw  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  check_in        TIME,
  check_out       TIME,
  working_hours   NUMERIC(4, 2),
  status          attendance_status NOT NULL DEFAULT 'absent',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, attendance_date)
);

-- Leave requests table
CREATE TABLE leave_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  reason        TEXT NOT NULL,
  status        leave_status NOT NULL DEFAULT 'pending',
  admin_remark  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Salary settings (per-employee)
CREATE TABLE salary_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_per_day  NUMERIC(10, 2) NOT NULL,
  is_pf_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  pf_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Salary advances
CREATE TABLE salary_advances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount        NUMERIC(10, 2) NOT NULL,
  advance_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Salary payments (monthly)
CREATE TABLE salary_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_month        INTEGER NOT NULL CHECK (salary_month BETWEEN 1 AND 12),
  salary_year         INTEGER NOT NULL,
  salary_per_day      NUMERIC(10, 2) NOT NULL,
  present_days        INTEGER NOT NULL DEFAULT 0,
  absent_days         INTEGER NOT NULL DEFAULT 0,
  leave_days          INTEGER NOT NULL DEFAULT 0,
  earned_salary       NUMERIC(10, 2) NOT NULL,
  pf_deducted         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  previous_advance    NUMERIC(10, 2) NOT NULL DEFAULT 0,
  advance_deducted    NUMERIC(10, 2) NOT NULL DEFAULT 0,
  final_salary        NUMERIC(10, 2) NOT NULL,
  remaining_advance   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_status      payment_status NOT NULL DEFAULT 'pending',
  payment_date        DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, salary_month, salary_year)
);

-- Advance adjustments (tracks which advances were deducted in which salary)
CREATE TABLE advance_adjustments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id          UUID NOT NULL REFERENCES salary_advances(id) ON DELETE CASCADE,
  salary_payment_id   UUID NOT NULL REFERENCES salary_payments(id) ON DELETE CASCADE,
  amount_adjusted     NUMERIC(10, 2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Voice recordings table
CREATE TABLE voice_recordings (
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

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_salary_payments_employee ON salary_payments(employee_id);
CREATE INDEX idx_salary_payments_month_year ON salary_payments(salary_month, salary_year);
CREATE INDEX idx_salary_advances_employee ON salary_advances(employee_id);
CREATE INDEX idx_users_employee ON users(employee_id);
CREATE INDEX idx_voice_recordings_employee ON voice_recordings(employee_id);
CREATE INDEX idx_voice_recordings_created_at ON voice_recordings(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_salary_settings_updated_at BEFORE UPDATE ON salary_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_salary_advances_updated_at BEFORE UPDATE ON salary_advances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_salary_payments_updated_at BEFORE UPDATE ON salary_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- NOTE: All access from Next.js API routes uses the SERVICE ROLE
-- key which bypasses RLS. The RLS policies below are a defence-
-- in-depth measure. Do not expose the service role key to the
-- browser.
-- ============================================================

ALTER TABLE employees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_advances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_recordings  ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — grant full access
CREATE POLICY "service_role_all_employees" ON employees
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_users" ON users
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_attendance" ON attendance
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_leave" ON leave_requests
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_salary_settings" ON salary_settings
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_advances" ON salary_advances
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_payments" ON salary_payments
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_adjustments" ON advance_adjustments
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_voice_recordings" ON voice_recordings
  USING (auth.role() = 'service_role');

CREATE POLICY "employees_select_own_voice_recordings" ON voice_recordings
  FOR SELECT USING (
    employee_id IN (
      SELECT employee_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "employees_insert_own_voice_recordings" ON voice_recordings
  FOR INSERT WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "admins_select_all_voice_recordings" ON voice_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admins_delete_all_voice_recordings" ON voice_recordings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- SEED DATA
-- Passwords hashed with bcrypt rounds=10
-- admin123 hash and phone-number hashes are pre-computed below.
-- You can regenerate with: node -e "const b=require('bcryptjs'); console.log(b.hashSync('admin123',10))"
-- ============================================================

-- Insert employees first
INSERT INTO employees (id, employee_number, full_name, phone, department, designation, joining_date, status)
VALUES
  ('11111111-0001-0001-0001-000000000001', 'NAND0001', 'Rahul Sharma',   '9876543210', 'Operations', 'Operator',   '2023-01-15', 'active'),
  ('11111111-0002-0002-0002-000000000002', 'NAND0002', 'Priya Singh',    '9876543211', 'HR',         'HR Officer', '2023-02-01', 'active'),
  ('11111111-0003-0003-0003-000000000003', 'NAND0003', 'Amit Verma',     '9876543212', 'Finance',    'Accountant', '2023-03-10', 'active'),
  ('11111111-0004-0004-0004-000000000004', 'NAND0004', 'Sunita Patel',   '9876543213', 'Operations', 'Supervisor', '2023-04-05', 'active'),
  ('11111111-0005-0005-0005-000000000005', 'NAND0005', 'Vijay Kumar',    '9876543214', 'IT',         'Technician', '2023-05-20', 'active');

-- Insert salary settings
INSERT INTO salary_settings (employee_id, salary_per_day, is_pf_enabled, pf_amount, effective_from)
VALUES
  ('11111111-0001-0001-0001-000000000001', 800.00,  FALSE, 0,   '2023-01-15'),
  ('11111111-0002-0002-0002-000000000002', 700.00,  FALSE, 0,   '2023-02-01'),
  ('11111111-0003-0003-0003-000000000003', 900.00,  TRUE,  500, '2023-03-10'),
  ('11111111-0004-0004-0004-000000000004', 600.00,  FALSE, 0,   '2023-04-05'),
  ('11111111-0005-0005-0005-000000000005', 1000.00, TRUE,  600, '2023-05-20');

-- Insert users
-- Admin password: admin123
-- Employee passwords: their phone numbers (e.g. 9876543210)
-- Hashes below are bcrypt(password, 10). Replace with fresh hashes if needed.
INSERT INTO users (employee_id, username, password_hash, role, must_change_pw)
VALUES
  -- Admin (no employee_id)
  (NULL,
   'ADMIN001',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123 (bcrypt placeholder - will be replaced via seed script)
   'admin',
   FALSE),
  -- Employees (password = phone number)
  ('11111111-0001-0001-0001-000000000001',
   'NAND0001',
   '$2a$10$placeholder1111111111111111111111111111111111111111111111', -- 9876543210
   'employee',
   FALSE),
  ('11111111-0002-0002-0002-000000000002',
   'NAND0002',
   '$2a$10$placeholder2222222222222222222222222222222222222222222222', -- 9876543211
   'employee',
   FALSE),
  ('11111111-0003-0003-0003-000000000003',
   'NAND0003',
   '$2a$10$placeholder3333333333333333333333333333333333333333333333', -- 9876543212
   'employee',
   FALSE),
  ('11111111-0004-0004-0004-000000000004',
   'NAND0004',
   '$2a$10$placeholder4444444444444444444444444444444444444444444444', -- 9876543213
   'employee',
   FALSE),
  ('11111111-0005-0005-0005-000000000005',
   'NAND0005',
   '$2a$10$placeholder5555555555555555555555555555555555555555555555', -- 9876543214
   'employee',
   FALSE);

-- NOTE: The placeholder hashes above won't work! Run the seed script below
-- to generate real bcrypt hashes and update the users table:
--
--   node supabase/seed.js
--
-- OR manually run these UPDATE statements after computing hashes:
-- UPDATE users SET password_hash = '<hash>' WHERE username = 'NAND0001';
-- etc.
