'use client';

// components/voice/AudioPlayer.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, Music } from 'lucide-react';
import Button from '@/components/ui/Button';

interface AudioPlayerProps {
  src: string;
  fileName?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  showDownload?: boolean;
  onDownload?: () => void;
  className?: string;
}

export default function AudioPlayer({
  src,
  fileName = 'recording',
  durationSeconds = 0,
  fileSizeBytes,
  showDownload = false,
  onDownload,
  className = '',
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((err) => console.error('Audio playback error:', err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    } else if (src) {
      const a = document.createElement('a');
      a.href = src;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-xs ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause Toggle Button */}
      <button
        onClick={togglePlayPause}
        className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-transform active:scale-95 shrink-0 shadow-xs"
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>

      {/* Seek bar & timeline info */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span className="text-slate-400 font-sans text-[11px] truncate max-w-[140px]" title={fileName}>
            {fileName}
          </span>
          <span>{formatTime(duration)}</span>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
        />
      </div>

      {/* Optional Metadata / Size & Download button */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {fileSizeBytes && (
          <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md whitespace-nowrap">
            {formatFileSize(fileSizeBytes)}
          </span>
        )}

        {showDownload && (
          <button
            onClick={handleDownloadClick}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
            title="Download Recording"
          >
            <Download size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
