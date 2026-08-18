'use client';

// app/(employee)/my-attendance/page.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { CalendarCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { Attendance } from '@/lib/types';

export default function MyAttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState('');
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) { setAttendance([]); return; }
      const json = await res.json();
      setAttendance(json.data ?? []);
    } catch (err) {
      console.error('[MyAttendancePage] fetch error:', err);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

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
        await fetchAttendance();
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

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1, label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }));

  const todayRecord = attendance.find((a) => a.attendance_date === todayStr);
  const present = attendance.filter((a) => a.status === 'present').length;
  const absent = attendance.filter((a) => a.status === 'absent').length;
  const leave = attendance.filter((a) => a.status === 'leave').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <CalendarCheck size={13} />
            {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {[2023, 2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Today's Quick Mark Card */}
      <Card className="bg-gradient-to-r from-emerald-50/80 via-blue-50/50 to-slate-50 border-emerald-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-emerald-600" />
              <h2 className="text-base font-bold text-slate-800">Mark Today's Attendance ({todayStr})</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Self-service attendance logging
              {todayRecord?.check_in && (
                <span className="ml-2 pl-2 border-l border-slate-300 text-emerald-700 font-medium">
                  Check-in Time: {todayRecord.check_in}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {todayRecord ? (
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto justify-between">
                <span className="text-xs text-slate-500">Today:</span>
                <StatusBadge status={todayRecord.status} />
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    disabled={marking}
                    onClick={() => handleMarkAttendance('present')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      todayRecord.status === 'present' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Present
                  </button>
                  <button
                    disabled={marking}
                    onClick={() => handleMarkAttendance('absent')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      todayRecord.status === 'absent' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
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
                  className="flex-1 sm:flex-none"
                >
                  Mark Present
                </Button>
                <Button
                  variant="danger"
                  loading={marking}
                  leftIcon={<XCircle size={16} />}
                  onClick={() => handleMarkAttendance('absent')}
                  className="flex-1 sm:flex-none"
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

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <div className="px-4 py-2.5 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-semibold">Present: {present}</div>
        <div className="px-4 py-2.5 rounded-xl bg-rose-100 text-rose-700 text-sm font-semibold">Absent: {absent}</div>
        <div className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-700 text-sm font-semibold">Leave: {leave}</div>
        <div className="px-4 py-2.5 rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold">Total: {attendance.length}</div>
      </div>

      <Card>
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Status', 'Check In', 'Check Out', 'Working Hours', 'Notes']
                  .map((h) => <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : attendance.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No attendance records for this period</td></tr>
              ) : (
                attendance.map((a, i) => (
                  <tr key={a.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                    <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">{a.attendance_date}</td>
                    <td className="py-3 px-3"><StatusBadge status={a.status} /></td>
                    <td className="py-3 px-3 text-slate-500">{a.check_in ?? '—'}</td>
                    <td className="py-3 px-3 text-slate-500">{a.check_out ?? '—'}</td>
                    <td className="py-3 px-3 text-slate-500">{a.working_hours ? `${a.working_hours}h` : '—'}</td>
                    <td className="py-3 px-3 text-slate-500">{a.notes ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
