'use client';

// app/(admin)/leave/page.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, CheckCircle2, XCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { updateLeaveSchema } from '@/lib/validations/leave';
import type { LeaveRequest } from '@/lib/types';
import type { UpdateLeaveInput } from '@/lib/validations/leave';

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<UpdateLeaveInput>({
    resolver: zodResolver(updateLeaveSchema),
  });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStatus ? `/api/leave?status=${filterStatus}` : '/api/leave';
      const res = await fetch(url);
      if (!res.ok) { setLeaves([]); return; }
      const json = await res.json();
      setLeaves(json.data ?? []);
    } catch (err) {
      console.error('[LeavePage] fetch error:', err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const openReview = (leave: LeaveRequest, decision: 'approved' | 'rejected') => {
    setSelectedLeave(leave);
    setError('');
    reset({ status: decision, admin_remark: '' });
  };

  const onSubmit = async (data: UpdateLeaveInput) => {
    if (!selectedLeave) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/leave/${selectedLeave.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error); return; }
      setSelectedLeave(null);
      fetchLeaves();
    } finally { setSubmitting(false); }
  };

  const pending = leaves.filter((l) => l.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Leave Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <FileText size={13} /> {pending} pending
          </p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <Card>
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Employee', 'From', 'To', 'Days', 'Reason', 'Status', 'Actions']
                  .map((h) => <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No leave requests found</td></tr>
              ) : (
                leaves.map((leave, i) => {
                  const emp = leave.employee as { full_name: string; employee_number: string } | undefined;
                  const start = new Date(leave.start_date);
                  const end = new Date(leave.end_date);
                  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
                  return (
                    <tr key={leave.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{emp?.full_name}</div>
                        <div className="text-xs text-blue-600 font-mono">{emp?.employee_number}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{leave.start_date}</td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{leave.end_date}</td>
                      <td className="py-3 px-3 text-slate-600 font-semibold">{days}</td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs">
                        <p className="line-clamp-2">{leave.reason}</p>
                        {leave.admin_remark && (
                          <p className="text-xs text-slate-400 mt-0.5 italic">"{leave.admin_remark}"</p>
                        )}
                      </td>
                      <td className="py-3 px-3"><StatusBadge status={leave.status} /></td>
                      <td className="py-3 px-3">
                        {leave.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openReview(leave, 'approved')}
                              className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => openReview(leave, 'rejected')}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
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

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        title={`${selectedLeave?.status === 'approved' ? '✓ Approve' : '✗ Reject'} Leave Request`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedLeave(null)}>Cancel</Button>
            <Button
              variant={selectedLeave?.status === 'rejected' ? 'danger' : 'primary'}
              loading={submitting}
              onClick={handleSubmit(onSubmit)}
            >
              Confirm
            </Button>
          </>
        }
      >
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        {selectedLeave && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-slate-800">{(selectedLeave.employee as { full_name: string } | undefined)?.full_name}</p>
              <p className="text-slate-600 mt-0.5">{selectedLeave.start_date} → {selectedLeave.end_date}</p>
              <p className="text-slate-600 mt-1">{selectedLeave.reason}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Remark (optional)</label>
              <textarea
                rows={3}
                placeholder="Add an admin remark…"
                className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                {...register('admin_remark')}
              />
              {errors.admin_remark && <p className="text-xs text-rose-600 mt-1">{errors.admin_remark.message}</p>}
            </div>
            <input type="hidden" {...register('status')} />
          </div>
        )}
      </Modal>
    </div>
  );
}
