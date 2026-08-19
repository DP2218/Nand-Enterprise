'use client';

// app/(employee)/my-voice-recordings/page.tsx — Employee Voice Recordings
import React, { useEffect, useState, useCallback } from 'react';
import { Mic, Lock, Calendar, Clock, FileAudio, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import VoiceRecorderWidget from '@/components/voice/VoiceRecorderWidget';
import AudioPlayer from '@/components/voice/AudioPlayer';
import { useAuth } from '@/context/AuthContext';
import type { VoiceRecording, Employee } from '@/lib/types';

export default function MyVoiceRecordingsPage() {
  const { user } = useAuth();
  const [employeeInfo, setEmployeeInfo] = useState<Employee | null>(null);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecordingsAndStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!user?.employeeId) {
        setError('Employee record not linked to account');
        setLoading(false);
        return;
      }

      // 1. Fetch employee record to check permission flag
      const empRes = await fetch(`/api/employees/${user.employeeId}`);
      if (empRes.ok) {
        const empJson = await empRes.json();
        setEmployeeInfo(empJson.data);
      }

      // 2. Fetch employee recordings
      const recRes = await fetch('/api/voice-recordings');
      if (recRes.ok) {
        const recJson = await recRes.json();
        setRecordings(recJson.data ?? []);
      }
    } catch (err) {
      console.error('[MyVoiceRecordingsPage] fetch error:', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecordingsAndStatus();
  }, [fetchRecordingsAndStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isEnabled = employeeInfo?.voice_recording_enabled ?? false;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Mic className="text-blue-600" size={22} /> Daily Voice Updates
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Record and manage your daily attendance voice reports
          </p>
        </div>
        <button
          onClick={fetchRecordingsAndStatus}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh recordings"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Check Voice Access Flag */}
      {!isEnabled ? (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-slate-50 p-6 text-center">
          <div className="max-w-md mx-auto space-y-3 py-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <Lock size={22} />
            </div>
            <h2 className="text-base font-bold text-slate-800">Voice Recording Access Disabled</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Daily voice recording is currently turned off for your employee account by administration.
              Please contact your supervisor or HR admin to enable voice recording access.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 font-medium bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200">
                Contact Admin to Enable Access
              </span>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Recorder Widget */}
          <VoiceRecorderWidget onUploadSuccess={fetchRecordingsAndStatus} />

          {/* Past Voice Recordings List */}
          <Card title="My Voice Recordings" subtitle={`Total recordings: ${recordings.length}`}>
            {recordings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FileAudio size={32} className="mx-auto text-slate-300 stroke-1" />
                <p className="text-sm font-medium">No voice updates recorded yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Use the recorder above to capture your first daily voice update.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
                    <div
                      key={rec.id}
                      className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Calendar size={14} className="text-blue-600" /> {formattedDate} at {formattedTime}
                          </span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 capitalize">
                            {rec.recording_type.replace('_', ' ')}
                          </span>
                        </div>

                        <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                          <Clock size={13} className="text-slate-400" /> {rec.duration_seconds} seconds
                        </span>
                      </div>

                      {/* Inline Audio Player */}
                      <AudioPlayer
                        src={rec.signedUrl || rec.file_url}
                        fileName={rec.file_name}
                        durationSeconds={rec.duration_seconds}
                        fileSizeBytes={rec.file_size}
                      />

                      {rec.remarks && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                          "{rec.remarks}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
