'use client';

// components/voice/VoiceRecorderWidget.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Pause, Play, RotateCcw, Send, AlertCircle, CheckCircle2, Volume2, ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const MAX_DURATION_SECONDS = 60; // 60 seconds limit
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

interface VoiceRecorderWidgetProps {
  onUploadSuccess?: () => void;
  recordingType?: string;
}

export default function VoiceRecorderWidget({
  onUploadSuccess,
  recordingType = 'daily_update',
}: VoiceRecorderWidgetProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio visualizer refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [clearTimer, stopTracks, audioUrl]);

  // Audio visualizer drawing function
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      if (!analyserRef.current || !canvasRef.current) return;
      animFrameRef.current = requestAnimationFrame(renderFrame);

      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

        // Gradient bar effect matching theme
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(0.5, '#6366f1');
        gradient.addColorStop(1, '#ef4444');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 1, barHeight, 2);
        ctx.fill();

        x += barWidth + 1;
      }
    };

    renderFrame();
  }, []);

  // Start Recording
  const startRecording = async () => {
    setError(null);
    setSuccessMsg(null);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support voice recording (MediaRecorder API unavailable).');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio API for waveform
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;
        drawWaveform();
      } catch (e) {
        console.warn('AudioContext visualization initialization warning:', e);
      }

      // Check supported MIME types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = ''; // Let browser choose default
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stopTracks();
        clearTimer();
        setRecordingState('stopped');

        if (blob.size > MAX_FILE_SIZE_BYTES) {
          setError(`File size exceeds 10MB limit (${(blob.size / (1024 * 1024)).toFixed(2)}MB). Please re-record a shorter message.`);
        }
      };

      mediaRecorder.start(200); // collect 200ms chunks
      setRecordingState('recording');

      // Start timer interval & 60s limit watcher
      clearTimer();
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= MAX_DURATION_SECONDS - 1) {
            // Auto stop at 60 seconds
            stopRecording();
            return MAX_DURATION_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setError('Failed to access microphone: ' + (err.message || 'Unknown error'));
      }
      setRecordingState('idle');
    }
  };

  // Pause Recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearTimer();
      setRecordingState('paused');
    }
  };

  // Resume Recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= MAX_DURATION_SECONDS - 1) {
            stopRecording();
            return MAX_DURATION_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Reset / Re-record
  const resetRecording = () => {
    clearTimer();
    stopTracks();
    setRecordingState('idle');
    setDuration(0);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setError(null);
    setSuccessMsg(null);
  };

  // Submit Recording
  const handleSubmit = async () => {
    if (!audioBlob) {
      setError('No audio recording found');
      return;
    }

    if (duration > MAX_DURATION_SECONDS) {
      setError('Recording exceeds 60 seconds limit.');
      return;
    }

    if (audioBlob.size > MAX_FILE_SIZE_BYTES) {
      setError(`Recording size exceeds 10MB limit (${(audioBlob.size / (1024 * 1024)).toFixed(2)}MB).`);
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('duration_seconds', String(duration));
      formData.append('recording_type', recordingType);
      if (remarks.trim()) {
        formData.append('remarks', remarks.trim());
      }

      const res = await fetch('/api/voice-recordings', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to upload voice recording');
        return;
      }

      setSuccessMsg('✓ Voice recording submitted successfully!');
      resetRecording();
      setRemarks('');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error('[VoiceRecorderWidget] Submit error:', err);
      setError('Network connection error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercentage = Math.min(100, (duration / MAX_DURATION_SECONDS) * 100);

  return (
    <Card className="border-blue-100 shadow-md bg-gradient-to-b from-white to-slate-50/70">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Mic size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Daily Voice Update</h3>
              <p className="text-xs text-slate-500">Record up to 60 seconds audio note</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recordingState === 'recording' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                RECORDING
              </span>
            )}
            {recordingState === 'paused' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                PAUSED
              </span>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
            <ShieldAlert size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Recorder Display Container */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden shadow-inner">
          {/* Audio Waveform Canvas */}
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <canvas
              ref={canvasRef}
              width={280}
              height={50}
              className="mb-2 w-full max-w-[280px] h-[50px] opacity-90"
            />
          )}

          {/* Time Counter */}
          <div className="font-mono text-3xl font-bold tracking-wider text-slate-100 my-1">
            {formatTime(duration)}{' '}
            <span className="text-xs font-normal text-slate-400">/ 01:00</span>
          </div>

          {/* Duration Limit Progress Bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3 max-w-xs">
            <div
              className={`h-full transition-all duration-300 ${
                duration >= 50 ? 'bg-rose-500' : duration >= 40 ? 'bg-amber-400' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Status Instructions */}
          <p className="text-[11px] text-slate-400 mt-2">
            {recordingState === 'idle' && 'Click Start Recording to begin'}
            {recordingState === 'recording' && 'Speak clearly into your microphone…'}
            {recordingState === 'paused' && 'Recording paused. Click Resume or Stop.'}
            {recordingState === 'stopped' && 'Recording complete! Listen below or Submit.'}
          </p>
        </div>

        {/* Audio Preview Player (When stopped) */}
        {recordingState === 'stopped' && audioUrl && (
          <div className="space-y-3 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
            <div className="flex items-center justify-between text-xs text-blue-950 font-medium">
              <span className="flex items-center gap-1.5">
                <Volume2 size={15} className="text-blue-600" /> Audio Preview
              </span>
              <span className="text-slate-500">
                Size: {audioBlob ? (audioBlob.size / (1024 * 1024)).toFixed(2) : 0} MB
              </span>
            </div>
            <audio src={audioUrl} controls className="w-full h-10 rounded-lg outline-none" />

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Remarks / Notes (optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any remarks or context for admin..."
                rows={2}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
          {recordingState === 'idle' && (
            <Button
              variant="primary"
              onClick={startRecording}
              leftIcon={<Mic size={16} />}
              className="w-full sm:w-auto py-3 px-6 text-sm font-semibold shadow-md bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Start Recording
            </Button>
          )}

          {recordingState === 'recording' && (
            <>
              <Button
                variant="secondary"
                onClick={pauseRecording}
                leftIcon={<Pause size={16} />}
                className="rounded-xl px-5"
              >
                Pause
              </Button>
              <Button
                variant="danger"
                onClick={stopRecording}
                leftIcon={<Square size={16} />}
                className="rounded-xl px-5 shadow-sm"
              >
                Stop
              </Button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <Button
                variant="primary"
                onClick={resumeRecording}
                leftIcon={<Play size={16} />}
                className="rounded-xl px-5"
              >
                Resume
              </Button>
              <Button
                variant="danger"
                onClick={stopRecording}
                leftIcon={<Square size={16} />}
                className="rounded-xl px-5 shadow-sm"
              >
                Stop
              </Button>
            </>
          )}

          {recordingState === 'stopped' && (
            <>
              <Button
                variant="secondary"
                onClick={resetRecording}
                leftIcon={<RotateCcw size={15} />}
                disabled={uploading}
                className="rounded-xl"
              >
                Re-record
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={uploading}
                leftIcon={<Send size={15} />}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 shadow-md"
              >
                Submit Recording
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
