'use client';

// app/(admin)/voice-recordings/page.tsx — Admin Voice Recordings Panel
import React, { useEffect, useState, useCallback } from 'react';
import { Search, Calendar, Trash2, Mic, Clock, FileAudio, RefreshCw, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import AudioPlayer from '@/components/voice/AudioPlayer';
import type { VoiceRecording } from '@/lib/types';

export default function AdminVoiceRecordingsPage() {
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<VoiceRecording | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (dateFilter) queryParams.set('date', dateFilter);

      const res = await fetch(`/api/voice-recordings?${queryParams.toString()}`);
      if (!res.ok) {
        setRecordings([]);
        return;
      }
      const json = await res.json();
      setRecordings(json.data ?? []);
    } catch (err) {
      console.error('[AdminVoiceRecordingsPage] fetch error:', err);
      setError('Connection error. Failed to load recordings.');
    } finally {
      setLoading(false);
    }
  }, [search, dateFilter]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/voice-recordings/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to delete recording');
        return;
      }
      setDeleteTarget(null);
      fetchRecordings();
    } catch (err) {
      console.error('[handleDeleteConfirm] error:', err);
      setError('Connection error. Could not delete recording.');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDateFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Mic className="text-blue-600" size={22} /> Employee Voice Recordings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
            <UserCheck size={14} className="text-slate-400" />
            Showing {recordings.length} total audio update records
          </p>
        </div>

        <Button
          variant="secondary"
          leftIcon={<RefreshCw size={14} />}
          onClick={fetchRecordings}
        >
          Refresh
        </Button>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by employee name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
          />
        </div>

        {(search || dateFilter) && (
          <Button variant="ghost" onClick={clearFilters} className="text-xs text-slate-500">
            Clear Filters
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Recordings Container */}
      <Card>
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading voice recordings…</div>
        ) : recordings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileAudio size={36} className="mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-medium">No voice recordings found</p>
            <p className="text-xs text-slate-400">
              {search || dateFilter ? 'Try clearing search filters.' : 'Employees have not submitted any voice updates yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recordings.map((rec) => {
              const createdDate = new Date(rec.created_at);
              const formattedDate = createdDate.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const formattedTime = createdDate.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div key={rec.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-base">{rec.employee_name}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono border border-slate-200">
                          {rec.file_name.split('_')[0]}
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full border border-blue-100 capitalize">
                          {rec.recording_type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" /> {formattedDate} at {formattedTime}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock size={13} className="text-slate-400" /> {rec.duration_seconds}s
                        </span>
                      </div>
                    </div>

                    {/* Delete button (Admin Exclusive) */}
                    <button
                      onClick={() => setDeleteTarget(rec)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
                      title="Permanently Delete Recording"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Audio Player with Admin Download trigger */}
                  <AudioPlayer
                    src={rec.signedUrl || rec.file_url}
                    fileName={rec.file_name}
                    durationSeconds={rec.duration_seconds}
                    fileSizeBytes={rec.file_size}
                    showDownload={true}
                  />

                  {rec.remarks && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      Remarks: "{rec.remarks}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Confirmation Modal for Admin Recording Deletion */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Voice Recording"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDeleteConfirm}>
              Permanently Delete
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Are you sure you want to permanently delete this voice recording for employee{' '}
              <strong className="text-slate-800">{deleteTarget.employee_name}</strong>?
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
              File: {deleteTarget.file_name}
            </div>
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              ⚠️ Warning: This will delete both the audio file in Supabase Storage and the database metadata row. This action cannot be undone.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
