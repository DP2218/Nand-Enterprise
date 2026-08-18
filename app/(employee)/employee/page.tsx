'use client';

// app/(employee)/employee/page.tsx — Employee Dashboard
import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, FileText, Wallet, TrendingDown, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { StatCard, Card } from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import type { SalaryPayment, LeaveRequest, Attendance } from '@/lib/types';

interface AttendanceSummary {
  present: number;
  absent: number;
  leave: number;
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [attSummary, setAttSummary] = useState<AttendanceSummary>({ present: 0, absent: 0, leave: 0 });
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [outstandingAdvance, setOutstandingAdvance] = useState(0);
  const [latestSalary, setLatestSalary] = useState<SalaryPayment | null>(null);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRequest[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const monthName = now.toLocaleString('default', { month: 'long' });
  const year = now.getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const month = now.getMonth() + 1;
      const [attRes, leaveRes, salaryRes, advRes] = await Promise.all([
        fetch(`/api/attendance?month=${month}&year=${year}`),
        fetch('/api/leave'),
        fetch('/api/salary'),
        fetch('/api/advances'),
      ]);

      const attData = attRes.ok ? await attRes.json() : { data: [] };
      const leaveData = leaveRes.ok ? await leaveRes.json() : { data: [] };
      const salaryData = salaryRes.ok ? await salaryRes.json() : { data: [] };
      const advData = advRes.ok ? await advRes.json() : {};

      const atts: Attendance[] = attData.data ?? [];
      setAttSummary({
        present: atts.filter((a) => a.status === 'present').length,
        absent: atts.filter((a) => a.status === 'absent').length,
        leave: atts.filter((a) => a.status === 'leave').length,
      });

      // Find today's record
      const todayRec = atts.find((a) => a.attendance_date === todayStr) || null;
      setTodayAttendance(todayRec);

      const leaves = leaveData.data ?? [];
      setPendingLeaves(leaves.filter((l: { status: string }) => l.status === 'pending').length);
      setRecentLeaves(leaves.slice(0, 4));

      const payments = salaryData.data ?? [];
      if (payments.length > 0) setLatestSalary(payments[0]);

      setOutstandingAdvance(advData.outstandingBalance ?? 0);
    } catch (err) {
      console.error('[EmployeeDashboard] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [todayStr, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAttendance = async (status: 'present' | 'absent') => {
    setMarking(true);
    setMessage('');
    try {
      const time24 = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const timeDisplay = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_date: todayStr,
          status,
          check_in: status === 'present' ? time24 : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setMessage(`✓ Attendance marked as ${status.toUpperCase()} ${status === 'present' ? `at ${timeDisplay}` : ''}`);
        await fetchData();
      } else {
        setMessage(`❌ Error: ${json.error || 'Failed to mark attendance'}`);
      }
    } catch (err) {
      console.error('Failed to mark attendance', err);
      setMessage('❌ Connection error. Please try again.');
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Welcome back, {user?.username} · {monthName} {year}</p>
      </div>

      {/* Today's Attendance Quick Action Card */}
      <Card className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border-blue-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Today's Attendance</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Date: <span className="font-semibold text-slate-700">{todayStr}</span>
              {todayAttendance?.check_in && (
                <span className="ml-2 pl-2 border-l border-slate-300 text-blue-600 font-medium">
                  Check-in Time: {todayAttendance.check_in}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {todayAttendance ? (
              <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Status:</span>
                  <StatusBadge status={todayAttendance.status} />
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  <button
                    disabled={marking}
                    onClick={() => handleMarkAttendance('present')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      todayAttendance.status === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Present
                  </button>
                  <button
                    disabled={marking}
                    onClick={() => handleMarkAttendance('absent')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      todayAttendance.status === 'absent'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    Absent
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="success"
                  loading={marking}
                  leftIcon={<CheckCircle2 size={16} />}
                  onClick={() => handleMarkAttendance('present')}
                  className="flex-1 sm:flex-none shadow-sm"
                >
                  Mark Present
                </Button>
                <Button
                  variant="danger"
                  loading={marking}
                  leftIcon={<XCircle size={16} />}
                  onClick={() => handleMarkAttendance('absent')}
                  className="flex-1 sm:flex-none shadow-sm"
                >
                  Mark Absent
                </Button>
              </div>
            )}
          </div>
        </div>

        {message && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs font-medium text-slate-700">
            {message}
          </div>
        )}
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Present Days"
          value={attSummary.present}
          icon={<CalendarCheck size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="Absent Days"
          value={attSummary.absent}
          icon={<TrendingDown size={20} className="text-rose-600" />}
          iconBg="bg-rose-100"
        />
        <StatCard
          title="Pending Leaves"
          value={pendingLeaves}
          icon={<FileText size={20} className="text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          title="Outstanding Advance"
          value={`₹${outstandingAdvance.toLocaleString('en-IN')}`}
          icon={<Wallet size={20} className="text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Latest salary slip */}
        <Card title="Latest Salary Slip" subtitle={latestSalary ? `${latestSalary.salary_month}/${latestSalary.salary_year}` : 'No records yet'}>
          {!latestSalary ? (
            <p className="text-sm text-slate-400 py-6 text-center">No salary records found</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Present Days', value: String(latestSalary.present_days), highlight: false },
                { label: 'Salary/Day', value: `₹${Number(latestSalary.salary_per_day).toLocaleString('en-IN')}`, highlight: false },
                { label: 'Earned Salary', value: `₹${Number(latestSalary.earned_salary).toLocaleString('en-IN')}`, highlight: false },
                { label: 'PF Deducted', value: `₹${Number(latestSalary.pf_deducted).toLocaleString('en-IN')}`, highlight: false },
                { label: 'Advance Deducted', value: `₹${Number(latestSalary.advance_deducted).toLocaleString('en-IN')}`, highlight: false },
                { label: 'Final Salary', value: `₹${Number(latestSalary.final_salary).toLocaleString('en-IN')}`, highlight: true },
              ].map((row) => (
                <div key={row.label} className={`flex items-center justify-between py-2 px-3 rounded-lg ${row.highlight ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'}`}>
                  <span className={`text-sm ${row.highlight ? 'font-bold text-blue-700' : 'text-slate-600'}`}>{row.label}</span>
                  <span className={`text-sm ${row.highlight ? 'font-bold text-blue-700' : 'font-medium text-slate-800'}`}>{row.value}</span>
                </div>
              ))}
              <div className="flex justify-end mt-2">
                <StatusBadge status={latestSalary.payment_status} />
              </div>
            </div>
          )}
        </Card>

        {/* Recent leave history */}
        <Card title="Recent Leave Requests">
          {recentLeaves.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No leave requests yet</p>
          ) : (
            <div className="space-y-3">
              {recentLeaves.map((leave) => (
                <div key={leave.id} className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">{leave.start_date} → {leave.end_date}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{leave.reason}</p>
                    {leave.admin_remark && (
                      <p className="text-xs text-slate-400 mt-0.5 italic">"{leave.admin_remark}"</p>
                    )}
                  </div>
                  <StatusBadge status={leave.status} className="shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Attendance summary bar */}
      <Card title={`${monthName} ${year} Attendance Summary`}>
        <div className="flex gap-6 flex-wrap">
          {[
            { label: 'Present', value: attSummary.present, color: 'text-emerald-600', bar: 'bg-emerald-500' },
            { label: 'Absent', value: attSummary.absent, color: 'text-rose-600', bar: 'bg-rose-400' },
            { label: 'Leave', value: attSummary.leave, color: 'text-amber-600', bar: 'bg-amber-400' },
          ].map((item) => (
            <div key={item.label} className="flex-1 min-w-[100px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.bar} transition-all duration-500`}
                  style={{ width: `${Math.min(100, (item.value / Math.max(1, attSummary.present + attSummary.absent + attSummary.leave)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
