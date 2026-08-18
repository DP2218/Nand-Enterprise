// lib/types.ts
// Shared TypeScript types for the entire NAND Enterprise Portal

export type UserRole = 'admin' | 'employee';
export type EmployeeStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'leave';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'paid';

// ─── Auth ──────────────────────────────────────────────────
export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  employeeId: string | null;
  mustChangePw: boolean;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  username: string;
  role: UserRole;
  employeeId: string | null;
  mustChangePw: boolean;
}

// ─── Employee ──────────────────────────────────────────────
export interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  phone: string;
  department: string;
  designation: string;
  joining_date: string;
  address: string | null;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  full_name: string;
  phone: string;
  department: string;
  designation: string;
  joining_date: string;
  address?: string;
  password?: string;
}

export interface UpdateEmployeeInput {
  full_name?: string;
  phone?: string;
  department?: string;
  designation?: string;
  joining_date?: string;
  address?: string;
  status?: EmployeeStatus;
}

// ─── Attendance ────────────────────────────────────────────
export interface Attendance {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  working_hours: number | null;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface UpsertAttendanceInput {
  employee_id: string;
  attendance_date: string;
  check_in?: string;
  check_out?: string;
  working_hours?: number;
  status: AttendanceStatus;
  notes?: string;
}

// ─── Leave ─────────────────────────────────────────────────
export interface LeaveRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  admin_remark: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface CreateLeaveInput {
  start_date: string;
  end_date: string;
  reason: string;
}

export interface UpdateLeaveInput {
  status: LeaveStatus;
  admin_remark?: string;
}

// ─── Salary Settings ───────────────────────────────────────
export interface SalarySetting {
  id: string;
  employee_id: string;
  salary_per_day: number;
  is_pf_enabled: boolean;
  pf_amount: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface UpsertSalarySettingInput {
  employee_id: string;
  salary_per_day: number;
  is_pf_enabled: boolean;
  pf_amount: number;
  effective_from: string;
}

// ─── Salary Advance ────────────────────────────────────────
export interface SalaryAdvance {
  id: string;
  employee_id: string;
  amount: number;
  advance_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface CreateAdvanceInput {
  employee_id: string;
  amount: number;
  advance_date: string;
  note?: string;
}

// ─── Salary Payment ────────────────────────────────────────
export interface SalaryPayment {
  id: string;
  employee_id: string;
  salary_month: number;
  salary_year: number;
  salary_per_day: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  earned_salary: number;
  pf_deducted: number;
  previous_advance: number;
  advance_deducted: number;
  final_salary: number;
  remaining_advance: number;
  payment_status: PaymentStatus;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface GenerateSalaryInput {
  employee_id: string;
  salary_month: number;
  salary_year: number;
}

// ─── Advance Adjustment ────────────────────────────────────
export interface AdvanceAdjustment {
  id: string;
  advance_id: string;
  salary_payment_id: string;
  amount_adjusted: number;
  created_at: string;
}

// ─── Dashboard ─────────────────────────────────────────────
export interface AdminDashboardStats {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  totalOutstandingAdvances: number;
}

export interface EmployeeDashboardStats {
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  pendingLeaves: number;
  outstandingAdvance: number;
  latestSalary: SalaryPayment | null;
}

// ─── API Response ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── Report ────────────────────────────────────────────────
export type ReportType = 'attendance' | 'salary' | 'advances';

export interface ReportParams {
  type: ReportType;
  month?: number;
  year?: number;
  employee_id?: string;
  start_date?: string;
  end_date?: string;
}
