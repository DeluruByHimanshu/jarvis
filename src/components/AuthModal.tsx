import React, { useState } from 'react';
import { Shield, Key, Lock, CheckCircle, X, User } from 'lucide-react';
import { UserSession } from '../types';
import { soundFx } from '../services/soundFx';
import { voiceSystem } from '../services/voiceController';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onLogin: (callsign: string, passcode: string) => Promise<void>;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  session,
  onLogin,
  onLogout
}) => {
  const [callsign, setCallsign] = useState(session.callsign);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsign.trim()) return;

    setLoading(true);
    soundFx.playClick();

    try {
      await onLogin(callsign.trim(), passcode);
      soundFx.playJarvisChirp();
      voiceSystem.speak(`Authentication confirmed. Welcome, ${callsign.trim()}. Security clearance verified.`);
      onClose();
    } catch (err) {
      soundFx.playAlert();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-xl p-6 glow-cyan shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-heading font-bold text-slate-100 text-sm tracking-wider uppercase">
              JWT Operator Authentication
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Session Summary */}
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg mb-4 text-xs font-mono">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-500">CURRENT OPERATOR:</span>
            <span className="text-cyan-300 font-bold">{session.callsign}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-500">CLEARANCE LEVEL:</span>
            <span className="text-emerald-400 font-bold">{session.securityClearance}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">JWT STATUS:</span>
            <span className="text-cyan-400 flex items-center gap-1 font-bold">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              {session.token ? 'SIGNED & ACTIVE' : 'LOCAL DEMO TOKEN'}
            </span>
          </div>
        </div>

        {/* Login / Switch Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              COMMANDER CALLSIGN
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="e.g. Tony Stark or Colonel Rhodes"
                required
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              SECURITY PASSCODE (OPTIONAL)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Quantum Passkey..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 outline-none font-mono"
              />
            </div>
          </div>

          {/* Raw JWT Token Inspector toggle */}
          {session.token && (
            <div>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                {showToken ? 'Hide Raw JWT Bearer Token' : 'Inspect Signed JWT Bearer Token'}
              </button>
              {showToken && (
                <textarea
                  readOnly
                  value={session.token}
                  rows={3}
                  className="mt-1 w-full p-2 bg-black border border-slate-800 rounded font-mono text-[10px] text-cyan-300/80 break-all select-all outline-none"
                />
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onLogout}
              className="text-xs font-mono text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              RESET TO GUEST
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-tech font-bold text-xs tracking-wider transition-colors cursor-pointer"
            >
              {loading ? 'AUTHENTICATING...' : 'ISSUE NEW JWT TOKEN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
