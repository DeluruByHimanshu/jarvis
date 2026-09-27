import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, Shield, HardDrive, Wifi, Download, 
  Trash2, Pause, Play, Search, AlertTriangle, Terminal 
} from 'lucide-react';
import { LogEntry, LogLevel, TelemetryMetrics } from '../types';
import { soundFx } from '../services/soundFx';

interface TelemetryLogsSectionProps {
  telemetry: TelemetryMetrics;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const TelemetryLogsSection: React.FC<TelemetryLogsSectionProps> = ({
  telemetry,
  logs,
  onClearLogs
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [frozenLogs, setFrozenLogs] = useState<LogEntry[]>(logs);

  useEffect(() => {
    if (!isPaused) {
      setFrozenLogs(logs);
    }
  }, [logs, isPaused]);

  const filteredLogs = frozenLogs.filter(log => {
    const matchesLevel = selectedLevel === 'ALL' || log.level === selectedLevel;
    const matchesSearch = !searchQuery || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handleExportLogs = () => {
    soundFx.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `jarvis-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getLogLevelStyle = (level: LogLevel) => {
    switch (level) {
      case 'SECURITY':
        return 'text-rose-400 bg-rose-950/40 border-rose-500/40';
      case 'WARN':
        return 'text-amber-400 bg-amber-950/40 border-amber-500/40';
      case 'EXEC':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40';
      case 'AGENT':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 border border-cyan-500/20 rounded-xl p-4 backdrop-blur-md">
      {/* Performance Metrics Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pb-3 mb-3 border-b border-cyan-500/20 text-xs font-mono">
        {/* Metric 1: FPS */}
        <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px]">HARDWARE FPS</span>
          <span className="text-cyan-300 font-bold text-sm tabular-nums">
            {telemetry.fps} <span className="text-[10px] text-slate-500">FPS</span>
          </span>
        </div>

        {/* Metric 2: CPU Load */}
        <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px]">CPU NEURAL</span>
          <span className="text-emerald-400 font-bold text-sm tabular-nums">
            {telemetry.cpu_usage_pct.toFixed(1)}%
          </span>
        </div>

        {/* Metric 3: Neural Latency */}
        <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px]">LATENCY</span>
          <span className="text-cyan-300 font-bold text-sm tabular-nums">
            {telemetry.neural_latency_ms.toFixed(1)}ms
          </span>
        </div>

        {/* Metric 4: Memory Buffer */}
        <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px]">MEMORY HEAP</span>
          <span className="text-amber-400 font-bold text-sm tabular-nums">
            {telemetry.memory_mb.toFixed(0)} MB
          </span>
        </div>

        {/* Metric 5: Active Threads */}
        <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px]">WORKER THREADS</span>
          <span className="text-purple-400 font-bold text-sm tabular-nums">
            {telemetry.active_threads} CORES
          </span>
        </div>

        {/* Metric 6: Security Cipher */}
        <div className="p-2 rounded bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px]">CIPHER SUITE</span>
          <span className="text-emerald-400 font-bold text-xs truncate">
            {telemetry.encryption_cipher}
          </span>
        </div>
      </div>

      {/* Logs Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2">
        {/* Filter Levels */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-mono">
          {['ALL', 'AGENT', 'EXEC', 'SECURITY', 'WARN'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                soundFx.playClick();
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Pause / Resume */}
          <button
            onClick={() => {
              setIsPaused(!isPaused);
              soundFx.playClick();
            }}
            className={`p-1.5 rounded border text-xs font-mono flex items-center gap-1 cursor-pointer ${
              isPaused
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={isPaused ? 'Resume live stream' : 'Pause log stream'}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span className="hidden sm:inline">{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          {/* Export */}
          <button
            onClick={handleExportLogs}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Export Logs JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            onClick={() => {
              onClearLogs();
              soundFx.playClick();
            }}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Purge Logs Buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Log Stream Viewer */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs max-h-[220px]">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600">
            <span>NO TELEMETRY LOGS IN BUFFER</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2 rounded bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 flex items-start gap-2.5 transition-colors"
            >
              <span className="text-[10px] text-slate-500 shrink-0 tabular-nums pt-0.5">
                {log.timestamp}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase shrink-0 font-bold ${getLogLevelStyle(log.level)}`}>
                {log.level}
              </span>
              <span className="text-[11px] text-cyan-400/80 shrink-0 font-semibold">
                [{log.source}]
              </span>
              <span className="text-slate-300 break-words flex-1">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
