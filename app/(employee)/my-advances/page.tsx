'use client';

// app/(employee)/my-advances/page.tsx
import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Card, StatCard } from '@/components/ui/Card';
import type { SalaryAdvance } from '@/lib/types';

export default function MyAdvancesPage() {
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      const res = await fetch('/api/advances');
      const json = await res.json();
      setAdvances(json.data ?? []);
      setOutstandingBalance(json.outstandingBalance ?? 0);
      setLoading(false);
    };
    fetch_();
  }, []);

  const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Advances</h1>
        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
          <Wallet size={13} /> Advance history
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Advances Given"
          value={`₹${totalAdvances.toLocaleString('en-IN')}`}
          icon={<Wallet size={20} className="text-purple-600" />}
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Outstanding Balance"
          value={`₹${outstandingBalance.toLocaleString('en-IN')}`}
          icon={<Wallet size={20} className="text-rose-600" />}
          iconBg="bg-rose-100"
        />
      </div>

      <Card>
        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Amount', 'Note']
                  .map((h) => <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="py-12 text-center text-slate-400">Loading…</td></tr>
              ) : advances.length === 0 ? (
                <tr><td colSpan={3} className="py-12 text-center text-slate-400">No advance records</td></tr>
              ) : (
                advances.map((adv, i) => (
                  <tr key={adv.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{adv.advance_date}</td>
                    <td className="py-3 px-3 font-bold text-rose-600">₹{Number(adv.amount).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-slate-500">{adv.note ?? '—'}</td>
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
