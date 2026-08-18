'use client';

// app/(admin)/reports/page.tsx
import React, { useState } from 'react';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ReportType } from '@/lib/types';

export default function ReportsPage() {
  const now = new Date();
  const [reportType, setReportType] = useState<ReportType>('attendance');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [downloading, setDownloading] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }));

  const handleExport = async () => {
    setDownloading(true);
    try {
      let url = `/api/reports/export?type=${reportType}`;
      if (reportType !== 'advances') {
        url += `&month=${month}&year=${year}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? 'Export failed');
        return;
      }

      const blob = await res.blob();
      const anchor = document.createElement('a');
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const fnMatch = disposition.match(/filename="(.+)"/);
      anchor.href = URL.createObjectURL(blob);
      anchor.download = fnMatch ? fnMatch[1] : `${reportType}_report.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(anchor.href);
    } finally {
      setDownloading(false);
    }
  };

  const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
    { value: 'attendance', label: 'Attendance Report', description: 'Daily attendance records for the selected month' },
    { value: 'salary', label: 'Salary Report', description: 'Monthly salary calculation with deductions' },
    { value: 'advances', label: 'Advance Report', description: 'All salary advances given to employees' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
          <BarChart3 size={13} /> Export reports to Excel
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config card */}
        <div className="lg:col-span-1">
          <Card title="Report Configuration">
            <div className="space-y-5">
              {/* Report type */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Report Type</label>
                <div className="space-y-2">
                  {REPORT_TYPES.map((rt) => (
                    <label
                      key={rt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${reportType === rt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <input
                        type="radio"
                        name="reportType"
                        value={rt.value}
                        checked={reportType === rt.value}
                        onChange={() => setReportType(rt.value)}
                        className="mt-0.5 text-blue-600"
                      />
                      <div>
                        <p className={`text-sm font-medium ${reportType === rt.value ? 'text-blue-700' : 'text-slate-700'}`}>{rt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{rt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date range */}
              {reportType !== 'advances' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Month</label>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1.5">Year</label>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={downloading}
                leftIcon={<Download size={15} />}
                onClick={handleExport}
              >
                {downloading ? 'Generating…' : 'Export to Excel'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Preview card */}
        <div className="lg:col-span-2">
          <Card title="Export Preview" subtitle={REPORT_TYPES.find(r => r.value === reportType)?.label}>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                <FileSpreadsheet size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-2">
                {REPORT_TYPES.find(r => r.value === reportType)?.label}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs">
                {reportType !== 'advances'
                  ? `${months.find(m => m.value === month)?.label} ${year} — Click "Export to Excel" to download.`
                  : 'All advance records — Click "Export to Excel" to download.'
                }
              </p>
              <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 px-5 py-3 text-xs text-slate-500">
                📊 Report will be formatted with NAND Enterprise branding, headers, and data rows.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
