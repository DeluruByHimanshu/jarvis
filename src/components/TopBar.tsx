import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Wifi, WifiOff, Radio } from 'lucide-react';
import { UserSession } from '../types';
import { soundFx } from '../services/soundFx';
import { wakeWordDetector, WakeWordState } from '../services/wakeWordDetector';

interface TopBarProps {
  session: UserSession;
  isOnline: boolean;
  onOpenAuth: () => void;
  onOpenSecurity: () => void;
  onNavigateSection: (sectionId: string) => void;
  activeSection: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  session,
  isOnline,
  onOpenAuth,
  onOpenSecurity,
  onNavigateSection,
  activeSection
}) => {
  const [wakeState, setWakeState] = useState<WakeWordState>(wakeWordDetector.state);

  useEffect(() => {
    return wakeWordDetector.onStateChange((state) => {
      setWakeState(state);
    });
  }, []);
  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-cyan-500/20 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onNavigateSection('matrix');
          soundFx.playClick();
        }}
        className="text-lg sm:text-xl font-heading font-extrabold tracking-wider text-slate-100 text-glow-cyan hover:text-cyan-300 transition-colors whitespace-nowrap"
      >
        JARVIS CORE
      </a>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-tech font-semibold tracking-wider text-slate-400">
        <button
          onClick={() => {
            onNavigateSection('tycoon');
            soundFx.playClick();
          }}
          className={`hover:text-cyan-300 transition-colors uppercase cursor-pointer ${
            activeSection === 'tycoon' || activeSection === 'matrix' ? 'text-cyan-400 border-b border-cyan-400 pb-0.5' : ''
          }`}
        >
          Tycoon Bots
        </button>
        <button
          onClick={() => {
            onNavigateSection('chat');
            soundFx.playClick();
          }}
          className={`hover:text-cyan-300 transition-colors uppercase cursor-pointer ${
            activeSection === 'chat' ? 'text-cyan-400 border-b border-cyan-400 pb-0.5' : ''
          }`}
        >
          AI Chat
        </button>
        <button
          onClick={() => {
            onNavigateSection('tasks');
            soundFx.playClick();
          }}
          className={`hover:text-cyan-300 transition-colors uppercase cursor-pointer ${
            activeSection === 'tasks' ? 'text-cyan-400 border-b border-cyan-400 pb-0.5' : ''
          }`}
        >
          Objectives
        </button>
        <button
          onClick={() => {
            onNavigateSection('telemetry');
            soundFx.playClick();
          }}
          className={`hover:text-cyan-300 transition-colors uppercase cursor-pointer ${
            activeSection === 'telemetry' ? 'text-cyan-400 border-b border-cyan-400 pb-0.5' : ''
          }`}
        >
          Telemetry
        </button>
        <button
          onClick={() => {
            onOpenSecurity();
            soundFx.playClick();
          }}
          className="hover:text-cyan-300 transition-colors uppercase cursor-pointer flex items-center gap-1"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Security</span>
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2.5">
        {/* Wake-Word Sentry Indicator in TopBar */}
        <button
          onClick={() => {
            wakeWordDetector.toggle();
            soundFx.playClick();
          }}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-all cursor-pointer ${
            wakeState === 'LISTENING_FOR_WAKE_WORD' || wakeState === 'CAPTURING_COMMAND'
              ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
              : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle Microphone API Wake-Word detection ('Jarvis')"
        >
          <Radio className={`w-3.5 h-3.5 ${
            wakeState === 'LISTENING_FOR_WAKE_WORD' || wakeState === 'CAPTURING_COMMAND' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
          }`} />
          <span className="font-semibold">
            {wakeState === 'LISTENING_FOR_WAKE_WORD' 
              ? 'WAKE: "JARVIS"' 
              : wakeState === 'CAPTURING_COMMAND' 
              ? 'JARVIS: HEARD' 
              : 'WAKE: OFF'}
          </span>
        </button>

        {/* Offline / Online Network Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse'
          }`}
          title={isOnline ? 'Online // Real-time server sync' : 'Offline // Local neural caching active'}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isOnline ? 'ONLINE' : 'CACHED'}</span>
        </div>

        {/* User Account / JWT Auth Button */}
        <button
          onClick={() => {
            onOpenAuth();
            soundFx.playClick();
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-tech font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-[0_0_12px_rgba(0,240,255,0.4)] transition-all cursor-pointer whitespace-nowrap"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span className="max-w-[120px] truncate">{session.callsign}</span>
        </button>
      </div>
    </header>
  );
};
