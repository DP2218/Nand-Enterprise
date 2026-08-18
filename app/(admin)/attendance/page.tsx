'use client';

// app/(admin)/attendance/page.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck, Plus, Edit2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { upsertAttendanceSchema } from '@/lib/validations/attendance';
import type { Attendance, Employee } from '@/lib/types';
import type { UpsertAttendanceInput } from '@/lib/validations/attendance';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Attendance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UpsertAttendanceInput>({
    resolver: zodResolver(upsertAttendanceSchema),
    defaultValues: { status: 'present', attendance_date: now.toISOString().slice(0, 10) },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, empRes] = await Promise.all([
        fetch(`/api/attendance?month=${selectedMonth}&year=${selectedYear}`),
        fetch('/api/employees?status=active'),
      ]);
      const attData = attRes.ok ? await attRes.json() : { data: [] };
      const empData = empRes.ok ? await empRes.json() : { data: [] };
      setAttendance(attData.data ?? []);
      setEmployees(empData.data ?? []);
    } catch (err) {
      console.error('[AttendancePage] fetch error:', err);
      setAttendance([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => {
    setEditRecord(null);
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    reset({
      employee_id: employees.length > 0 ? employees[0].id : '',
      status: 'present',
      attendance_date: now.toISOString().slice(0, 10),
      check_in: timeNow,
      check_out: '',
      notes: '',
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (rec: Attendance) => {
    setEditRecord(rec);
    reset({
      employee_id: rec.employee_id,
      attendance_date: rec.attendance_date,
      status: rec.status,
      check_in: rec.check_in ?? '',
      check_out: rec.check_out ?? '',
      working_hours: rec.working_hours ?? undefined,
      notes: rec.notes ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const onSubmit = async (data: UpsertAttendanceInput) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to save attendance'); return; }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('[onSubmit] error:', err);
      setError('Connection error. Please try again.');
    } finally { setSubmitting(false); }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }));

  const currentYear = selectedYear;
  const years = [currentYear - 1, currentYear, currentYear + 1].filter(
    (y) => y >= 2023 && y <= 2030
  );

  // Summary
  const present = attendance.filter((a) => a.status === 'present').length;
  const absent = attendance.filter((a) => a.status === 'absent').length;
  const leave = attendance.filter((a) => a.status === 'leave').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <CalendarCheck size={13} />
            {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="primary" leftIcon={<Plus size={15} />} onClick={openAdd}>
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Present', count: present, color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Absent', count: absent, color: 'bg-rose-100 text-rose-700' },
          { label: 'Leave', count: leave, color: 'bg-amber-100 text-amber-700' },
        ].map((s) => (
          <div key={s.label} className={`px-4 py-2 rounded-xl text-sm font-semibold ${s.color}`}>
            {s.label}: {s.count}
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Employee', 'Department', 'Status', 'Check In', 'Check Out', 'Hours', 'Actions']
                  .map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : attendance.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">No records for this period</td></tr>
              ) : (
                attendance.map((rec, i) => {
                  const emp = rec.employee as { employee_number: string; full_name: string; department: string } | undefined;
                  return (
                    <tr key={rec.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{rec.attendance_date}</td>
                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                        <span className="text-xs text-blue-600 font-mono mr-1">{emp?.employee_number}</span>
                        {emp?.full_name}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{emp?.department}</td>
                      <td className="py-3 px-3"><StatusBadge status={rec.status} /></td>
                      <td className="py-3 px-3 text-slate-500">{rec.check_in ?? '—'}</td>
                      <td className="py-3 px-3 text-slate-500">{rec.check_out ?? '—'}</td>
                      <td className="py-3 px-3 text-slate-500">{rec.working_hours ?? '—'}</td>
                      <td className="py-3 px-3">
                        <button onClick={() => openEdit(rec)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editRecord ? 'Edit Attendance' : 'Mark Attendance'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmit(onSubmit)}>
              {editRecord ? 'Update' : 'Save'}
            </Button>
          </>
        }
      >
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-4">
          {!editRecord && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Employee</label>
              <select className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...register('employee_id')}>
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.employee_number} — {e.full_name}</option>
                ))}
              </select>
              {errors.employee_id && <p className="text-xs text-rose-600 mt-1">{errors.employee_id.message}</p>}
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...register('attendance_date')} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Status</label>
            <div className="flex gap-3">
              {(['present', 'absent', 'leave'] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value={s} {...register('status')} className="text-blue-600" />
                  <StatusBadge status={s} />
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Check In</label>
              <input type="time" className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...register('check_in')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Check Out</label>
              <input type="time" className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...register('check_out')} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
