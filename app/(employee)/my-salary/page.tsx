'use client';

// app/(employee)/my-salary/page.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { CreditCard } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import type { SalaryPayment } from '@/lib/types';

export default function MySalaryPage() {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/salary?year=${selectedYear}`);
    const json = await res.json();
    setPayments(json.data ?? []);
    setLoading(false);
  }, [selectedYear]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Salary</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
            <CreditCard size={13} /> Salary slips & history
          </p>
        </div>
        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {[2023, 2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : payments.length === 0 ? (
        <Card><p className="text-center text-slate-400 py-12 text-sm">No salary records for {selectedYear}</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {payments.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {monthNames[p.salary_month - 1]} {p.salary_year}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{p.present_days} days present</p>
                </div>
                <StatusBadge status={p.payment_status} />
              </div>

              {/* Rows */}
              <div className="space-y-1.5">
                {[
                  { label: 'Salary/Day', value: `₹${Number(p.salary_per_day).toLocaleString('en-IN')}` },
                  { label: 'Earned', value: `₹${Number(p.earned_salary).toLocaleString('en-IN')}` },
                  { label: 'PF', value: `- ₹${Number(p.pf_deducted).toLocaleString('en-IN')}`, hide: Number(p.pf_deducted) === 0 },
                  { label: 'Advance', value: `- ₹${Number(p.advance_deducted).toLocaleString('en-IN')}`, hide: Number(p.advance_deducted) === 0 },
                ].filter((r) => !r.hide).map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-medium text-slate-700">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Final */}
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="font-bold text-slate-800">Final Salary</span>
                <span className="text-lg font-bold text-blue-700">₹{Number(p.final_salary).toLocaleString('en-IN')}</span>
              </div>

              {p.remaining_advance > 0 && (
                <p className="text-xs text-rose-500">Remaining advance: ₹{Number(p.remaining_advance).toLocaleString('en-IN')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
