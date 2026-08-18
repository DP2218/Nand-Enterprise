// components/ui/StatusBadge.tsx
import React from 'react';
import type { AttendanceStatus, LeaveStatus, PaymentStatus } from '@/lib/types';

type BadgeVariant = AttendanceStatus | LeaveStatus | PaymentStatus | string;

const variantStyles: Record<string, string> = {
  // Attendance
  present:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  absent:   'bg-rose-50 text-rose-700 ring-rose-600/20',
  leave:    'bg-amber-50 text-amber-700 ring-amber-600/20',
  // Leave
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  pending:  'bg-amber-50 text-amber-700 ring-amber-600/20',
  // Payment
  paid:     'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  // Employee status
  active:   'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

interface StatusBadgeProps {
  status: BadgeVariant;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const styles = variantStyles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ring-1 ring-inset ${styles} ${className}`}
    >
      {status}
    </span>
  );
}
