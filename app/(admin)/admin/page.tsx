'use client';

// app/(admin)/admin/page.tsx — Admin Dashboard
import React, { useEffect, useState } from 'react';
import { Users, CheckSquare, FileText, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { StatCard, Card } from '@/components/ui/Card';
import SalaryChart from '@/components/charts/SalaryChart';
import StatusBadge from '@/components/ui/StatusBadge';
import type { SalaryPayment, LeaveRequest, Attendance } from '@/lib/types';

interface DashboardData {
  totalEmployees: number;
  presentToday: number;
  pendingLeaves: number;
  totalOutstandingAdvances: number;
  recentSalaryPayments: (SalaryPayment & { employee?: { full_name: string; employee_number: string } })[];
  recentLeaves: (LeaveRequest & { employee?: { full_name: string; employee_number: string } })[];
  todayAttendance: (Attendance & { employee?: { full_name: string; employee_number: string } })[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [empRes, todayAttRes, leavesRes, salaryRes, advancesRes] = await Promise.all([
        fetch('/api/employees?status=active'),
        fetch(`/api/attendance?start_date=${now.toISOString().slice(0, 10)}&end_date=${now.toISOString().slice(0, 10)}`),
        fetch('/api/leave?status=pending'),
        fetch(`/api/salary?month=${currentMonth}&year=${currentYear}`),
        fetch('/api/advances'),
      ]);

      const [empData, todayData, leavesData, salaryData, advancesData] = await Promise.all([
        empRes.json(), todayAttRes.json(), leavesRes.json(), salaryRes.json(), advancesRes.json(),
      ]);

      const todayAttendance: Attendance[] = todayData.data ?? [];
      const presentToday = todayAttendance.filter((a) => a.status === 'present').length;

      // Compute total outstanding advances (simplified)
      const advances = advancesData.data ?? [];
      const totalOutstandingAdvances = advances.reduce((sum: number, a: { amount: number }) => sum + Number(a.amount), 0);

      setData({
        totalEmployees: (empData.data ?? []).length,
        presentToday,
        pendingLeaves: (leavesData.data ?? []).length,
        totalOutstandingAdvances,
        recentSalaryPayments: (salaryData.data ?? []).slice(0, 5),
        recentLeaves: (leavesData.data ?? []).slice(0, 5),
        todayAttendance: todayData.data ?? [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const monthName = now.toLocaleString('default', { month: 'long' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <Calendar size={13} />
            {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={data?.totalEmployees ?? 0}
          icon={<Users size={20} className="text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Present Today"
          value={data?.presentToday ?? 0}
          icon={<CheckSquare size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="Pending Leaves"
          value={data?.pendingLeaves ?? 0}
          icon={<FileText size={20} className="text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          title="Total Advances"
          value={`₹${(data?.totalOutstandingAdvances ?? 0).toLocaleString('en-IN')}`}
          icon={<TrendingUp size={20} className="text-rose-600" />}
          iconBg="bg-rose-100"
        />
      </div>

      {/* Chart + recent leaves */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Salary chart */}
        <Card
          title={`Salary Distribution — ${monthName} ${currentYear}`}
          subtitle="Final salary per employee"
          className="xl:col-span-2"
        >
          <SalaryChart payments={data?.recentSalaryPayments ?? []} />
        </Card>

        {/* Pending leaves */}
        <Card title="Pending Leave Requests" subtitle={`${data?.pendingLeaves} pending`}>
          {(data?.recentLeaves ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {data?.recentLeaves.map((leave) => (
                <div key={leave.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {leave.employee?.full_name ?? leave.employee?.employee_number}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {leave.start_date} → {leave.end_date}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{leave.reason}</p>
                  </div>
                  <StatusBadge status={leave.status} className="ml-2 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Today attendance */}
      <Card title="Today's Attendance" subtitle={`${now.toLocaleDateString('en-IN')}`}>
        {(data?.todayAttendance ?? []).length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No attendance records for today yet.</p>
        ) : (
          <div className="table-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Check In</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Check Out</th>
                </tr>
              </thead>
              <tbody>
                {data?.todayAttendance.map((a, i) => (
                  <tr key={a.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {a.employee?.full_name ?? a.employee?.employee_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{a.check_in ?? '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{a.check_out ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
