import React, { useState } from 'react';
import { Lock, Key, ShieldCheck, Download, Check, X } from 'lucide-react';
import { setPassphrase } from '../services/crypto';
import { soundFx } from '../services/soundFx';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportEncryptedBackup: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  onExportEncryptedBackup
}) => {
  const [passphrase, setPassphraseInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSavePassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    await setPassphrase(passphrase.trim());
    soundFx.playJarvisChirp();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-xl p-6 glow-cyan shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <h3 className="font-heading font-bold text-slate-100 text-sm tracking-wider uppercase">
              End-to-End Data Encryption
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Algorithm details */}
        <div className="space-y-2 mb-4 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">CIPHER:</span>
            <span className="text-emerald-400 font-bold">AES-GCM 256-Bit</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">KEY DERIVATION:</span>
            <span className="text-cyan-300">PBKDF2 / SHA-256 (100k iter)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">IV VECTORS:</span>
            <span className="text-purple-400">96-Bit Cryptographic Nonce</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">INTEGRITY:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              AUTHENTICATED CIPHERTEXT
            </span>
          </div>
        </div>

        {/* Change Master Passphrase */}
        <form onSubmit={handleSavePassphrase} className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              MASTER ENCRYPTION PASSPHRASE
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphraseInput(e.target.value)}
                placeholder="Enter new master passphrase..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 outline-none font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">
              All stored tasks, objectives, and conversation history are encrypted client-side using this key.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={!passphrase.trim()}
              className="px-3.5 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-tech font-bold text-xs tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'KEY DERIVED' : 'UPDATE KEY'}</span>
            </button>
          </div>
        </form>

        {/* Export Encrypted Backup */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400">
            Export Encrypted Workspace
          </div>
          <button
            onClick={() => {
              onExportEncryptedBackup();
              soundFx.playClick();
            }}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT ENCRYPTED</span>
          </button>
        </div>
      </div>
    </div>
  );
};
