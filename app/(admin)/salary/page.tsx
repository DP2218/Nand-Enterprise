'use client';

// app/(admin)/salary/page.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, Play, CheckCircle2, Trash2, RotateCcw } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import SalaryChart from '@/components/charts/SalaryChart';
import { generateSalarySchema } from '@/lib/validations/salary';
import type { SalaryPayment, Employee } from '@/lib/types';
import type { GenerateSalaryInput } from '@/lib/validations/salary';

export default function SalaryPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const generateForm = useForm<GenerateSalaryInput>({
    resolver: zodResolver(generateSalarySchema),
    defaultValues: {
      employee_id: '',
      salary_month: now.getMonth() + 1,
      salary_year: now.getFullYear(),
    },
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }));

  const selectedMonthLabel = months.find((m) => m.value === selectedMonth)?.label;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, empRes] = await Promise.all([
        fetch(`/api/salary?type=payments&month=${selectedMonth}&year=${selectedYear}`),
        fetch('/api/employees?status=active'),
      ]);
      const payData = payRes.ok ? await payRes.json() : { data: [] };
      const empData = empRes.ok ? await empRes.json() : { data: [] };
      setPayments(payData.data ?? []);
      const activeEmps = empData.data ?? [];
      setEmployees(activeEmps);

      if (activeEmps.length > 0 && !generateForm.getValues('employee_id')) {
        generateForm.setValue('employee_id', activeEmps[0].id);
      }
    } catch (err) {
      console.error('[SalaryPage] fetch error:', err);
      setPayments([]); setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, generateForm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGenerateSalary = async (data: GenerateSalaryInput) => {
    setSubmitting(true); setError(''); setSuccessMsg('');
    try {
      const res = await fetch('/api/salary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: data.employee_id,
          salary_month: Number(data.salary_month),
          salary_year: Number(data.salary_year),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to generate salary'); setSubmitting(false); return; }
      setSuccessMsg('Salary generated successfully!');
      fetchData(); setSubmitting(false);
    } catch (err) {
      console.error('[handleGenerateSalary] error:', err);
      setError('Connection error. Please try again.');
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (paymentId: string) => {
    await fetch('/api/salary/generate', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId }),
    });
    fetchData();
  };

  const handleDeleteRecord = async (payment: SalaryPayment) => {
    const emp = payment.employee as { full_name: string } | undefined;
    const nameStr = emp?.full_name ? ` for "${emp.full_name}"` : '';
    if (!confirm(`Are you sure you want to DELETE salary record${nameStr}?`)) return;

    try {
      const res = await fetch(`/api/salary?id=${payment.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Failed to delete salary record'); return; }
      fetchData();
    } catch (err) {
      console.error('[handleDeleteRecord] error:', err);
      alert('Connection error. Could not delete record.');
    }
  };

  const handleClearMonthHistory = async () => {
    if (!confirm(`Are you sure you want to CLEAR ALL salary payment history for ${selectedMonthLabel} ${selectedYear}?\n\nThis will remove all generated salary slips for this month.`)) return;

    try {
      const res = await fetch(`/api/salary?month=${selectedMonth}&year=${selectedYear}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Failed to clear salary history'); return; }
      fetchData();
    } catch (err) {
      console.error('[handleClearMonthHistory] error:', err);
      alert('Connection error. Could not clear history.');
    }
  };

  const openGenerateModal = () => {
    setGenerateOpen(true);
    setError('');
    setSuccessMsg('');
    generateForm.reset({
      employee_id: employees.length > 0 ? employees[0].id : '',
      salary_month: selectedMonth,
      salary_year: selectedYear,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Salary</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <DollarSign size={13} /> Monthly salary generation & records
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {payments.length > 0 && (
            <button
              onClick={handleClearMonthHistory}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
              title={`Clear all salary records for ${selectedMonthLabel} ${selectedYear}`}
            >
              <RotateCcw size={14} /> Clear History ({selectedMonthLabel})
            </button>
          )}
          <Button
            variant="primary"
            leftIcon={<Play size={14} />}
            onClick={openGenerateModal}
          >
            Generate Salary
          </Button>
        </div>
      </div>

      {/* Month filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
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
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Distribution chart */}
      {payments.length > 0 && (
        <Card title={`Salary Distribution — ${selectedMonthLabel} ${selectedYear}`}>
          <div className="h-64">
            <SalaryChart payments={payments} />
          </div>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Emp No.', 'Employee', 'Department', 'Daily Rate', 'Days (P/A/L)', 'Earned', 'PF Deducted', 'Advance Deducted', 'Net Salary', 'Status', 'Action']
                  .map((h) => <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center text-slate-400">No salary records generated for this month yet</td></tr>
              ) : (
                payments.map((p, i) => {
                  const emp = p.employee as { employee_number: string; full_name: string; department: string } | undefined;
                  const finalVal = Number(p.final_salary);
                  const isNegative = finalVal < 0;

                  return (
                    <tr key={p.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-blue-600">{emp?.employee_number}</td>
                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">{emp?.full_name}</td>
                      <td className="py-3 px-3 text-slate-500">{emp?.department}</td>
                      <td className="py-3 px-3 font-medium">₹{Number(p.salary_per_day).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{p.present_days} / {p.absent_days} / {p.leave_days}</td>
                      <td className="py-3 px-3 font-medium">₹{Number(p.earned_salary).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-rose-600 font-medium">₹{Number(p.pf_deducted).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-amber-600 font-medium">₹{Number(p.advance_deducted).toLocaleString('en-IN')}</td>
                      <td className={`py-3 px-3 font-bold whitespace-nowrap ${isNegative ? 'text-rose-600' : 'text-slate-800'}`}>
                        {isNegative ? `-₹${Math.abs(finalVal).toLocaleString('en-IN')}` : `₹${finalVal.toLocaleString('en-IN')}`}
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={p.payment_status} /></td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {p.payment_status === 'pending' && (
                            <button onClick={() => handleMarkPaid(p.id)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                              <CheckCircle2 size={12} /> Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRecord(p)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Salary Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Generate Salary Modal */}
      <Modal isOpen={generateOpen} onClose={() => setGenerateOpen(false)} title="Generate Monthly Salary" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setGenerateOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={generateForm.handleSubmit(handleGenerateSalary)}>Generate</Button>
        </>}
      >
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        {successMsg && <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4">{successMsg}</p>}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Employee</label>
            <select className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...generateForm.register('employee_id')}>
              <option value="">Select employee…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_number} — {e.full_name}</option>)}
            </select>
            {generateForm.formState.errors.employee_id && (
              <p className="text-xs text-rose-600 mt-1">{generateForm.formState.errors.employee_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Month</label>
              <select className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...generateForm.register('salary_month', { valueAsNumber: true })}>
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Year</label>
              <input type="number" className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...generateForm.register('salary_year', { valueAsNumber: true })} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
