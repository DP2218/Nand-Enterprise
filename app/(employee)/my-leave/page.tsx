'use client';

// app/(employee)/my-leave/page.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileCheck, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { createLeaveSchema } from '@/lib/validations/leave';
import type { LeaveRequest } from '@/lib/types';
import type { CreateLeaveInput } from '@/lib/validations/leave';

export default function MyLeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateLeaveInput>({
    resolver: zodResolver(createLeaveSchema),
  });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/leave');
    const json = await res.json();
    setLeaves(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const onSubmit = async (data: CreateLeaveInput) => {
    setSubmitting(true); setError('');
    const res = await fetch('/api/leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); setSubmitting(false); return; }
    setModalOpen(false); reset(); fetchLeaves(); setSubmitting(false);
  };

  const handleWithdraw = async (id: string) => {
    if (!confirm('Withdraw this leave request?')) return;
    await fetch(`/api/leave/${id}`, { method: 'DELETE' });
    fetchLeaves();
  };

  const pending = leaves.filter((l) => l.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Leave Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <FileCheck size={13} /> {pending} pending
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={15} />} onClick={() => { setModalOpen(true); setError(''); reset(); }}>
          Request Leave
        </Button>
      </div>

      <Card>
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['From', 'To', 'Days', 'Reason', 'Status', 'Admin Remark', 'Actions']
                  .map((h) => <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No leave requests yet</td></tr>
              ) : (
                leaves.map((leave, i) => {
                  const days = Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / 86400000) + 1;
                  return (
                    <tr key={leave.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{leave.start_date}</td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{leave.end_date}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{days}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs"><p className="line-clamp-2">{leave.reason}</p></td>
                      <td className="py-3 px-3"><StatusBadge status={leave.status} /></td>
                      <td className="py-3 px-3 text-slate-500 italic text-xs">{leave.admin_remark ?? '—'}</td>
                      <td className="py-3 px-3">
                        {leave.status === 'pending' && (
                          <button onClick={() => handleWithdraw(leave.id)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Request Leave" size="md"
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit(onSubmit)}>Submit</Button>
        </>}
      >
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" error={errors.start_date?.message} {...register('start_date')} />
            <Input label="End Date" type="date" error={errors.end_date?.message} {...register('end_date')} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Reason</label>
            <textarea rows={3} placeholder="Reason for leave…" className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" {...register('reason')} />
            {errors.reason && <p className="text-xs text-rose-600 mt-1">{errors.reason.message}</p>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
