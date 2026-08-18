'use client';

// app/(admin)/advances/page.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createAdvanceSchema } from '@/lib/validations/advance';
import type { SalaryAdvance, Employee } from '@/lib/types';
import type { CreateAdvanceInput } from '@/lib/validations/advance';

export default function AdvancesPage() {
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAdvanceInput>({
    resolver: zodResolver(createAdvanceSchema),
    defaultValues: { advance_date: new Date().toISOString().slice(0, 10) },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [advRes, empRes] = await Promise.all([
        fetch(filterEmployee ? `/api/advances?employee_id=${filterEmployee}` : '/api/advances'),
        fetch('/api/employees?status=active'),
      ]);
      const advData = advRes.ok ? await advRes.json() : { data: [] };
      const empData = empRes.ok ? await empRes.json() : { data: [] };
      setAdvances(advData.data ?? []);
      setEmployees(empData.data ?? []);
    } catch (err) {
      console.error('[AdvancesPage] fetch error:', err);
      setAdvances([]); setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [filterEmployee]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openRecordModal = () => {
    setModalOpen(true);
    setError('');
    reset({
      employee_id: employees.length > 0 ? employees[0].id : '',
      advance_date: new Date().toISOString().slice(0, 10),
      note: '',
    });
  };

  const onSubmit = async (data: CreateAdvanceInput) => {
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/advances', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, amount: Number(data.amount) }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to record advance'); setSubmitting(false); return; }
      setModalOpen(false); reset(); fetchData(); setSubmitting(false);
    } catch (err) {
      console.error('[onSubmit] error:', err);
      setError('Connection error. Please try again.');
      setSubmitting(false);
    }
  };

  const handleDeleteAdvance = async (adv: SalaryAdvance) => {
    const emp = adv.employee as { full_name: string } | undefined;
    const nameStr = emp?.full_name ? ` for "${emp.full_name}"` : '';
    if (!confirm(`Are you sure you want to CLEAR / DELETE the advance of ₹${Number(adv.amount).toLocaleString('en-IN')}${nameStr}?`)) return;

    try {
      const res = await fetch(`/api/advances?id=${adv.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { alert(json.error || 'Failed to clear advance record'); return; }
      fetchData();
    } catch (err) {
      console.error('[handleDeleteAdvance] error:', err);
      alert('Connection error. Could not clear advance.');
    }
  };

  const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Advances</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <TrendingUp size={13} /> Total given: ₹{totalAdvances.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_number} — {e.full_name}</option>)}
          </select>
          <Button variant="primary" leftIcon={<Plus size={15} />} onClick={openRecordModal}>
            Record Advance
          </Button>
        </div>
      </div>

      <Card>
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Employee', 'Department', 'Amount', 'Note', 'Action']
                  .map((h) => <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : advances.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No advance records</td></tr>
              ) : (
                advances.map((adv, i) => {
                  const emp = adv.employee as { full_name: string; employee_number: string; department: string } | undefined;
                  return (
                    <tr key={adv.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{adv.advance_date}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{emp?.full_name}</div>
                        <div className="text-xs text-blue-600 font-mono">{emp?.employee_number}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{emp?.department}</td>
                      <td className="py-3 px-3 font-bold text-rose-600">₹{Number(adv.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-slate-500">{adv.note ?? '—'}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleDeleteAdvance(adv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Clear / Delete Advance Record"
                        >
                          <Trash2 size={14} />
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Advance" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit(onSubmit)}>Save</Button>
        </>}
      >
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Employee</label>
            <select className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...register('employee_id')}>
              <option value="">Select employee…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.employee_number} — {e.full_name}</option>)}
            </select>
            {errors.employee_id && <p className="text-xs text-rose-600 mt-1">{errors.employee_id.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Amount (₹)</label>
            <input type="number" step="0.01" placeholder="e.g. 5000" className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <p className="text-xs text-rose-600 mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" {...register('advance_date')} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Note (optional)</label>
            <textarea rows={2} placeholder="Reason for advance…" className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white" {...register('note')} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
