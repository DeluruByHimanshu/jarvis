import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Volume2, Copy, Check, Sparkles, Terminal, Shield, Cpu, RefreshCw } from 'lucide-react';
import { AgentId, ChatMessage } from '../types';
import { voiceSystem } from '../services/voiceController';
import { soundFx } from '../services/soundFx';

interface AIChatSectionProps {
  messages: ChatMessage[];
  activeAgent: AgentId;
  onSendMessage: (text: string, targetAgent: AgentId) => Promise<void>;
  isLoading: boolean;
  onQuickAction: (actionText: string, agent: AgentId) => void;
}

export const AIChatSection: React.FC<AIChatSectionProps> = ({
  messages,
  activeAgent,
  onSendMessage,
  isLoading,
  onQuickAction
}) => {
  const [inputText, setInputText] = useState('');
  const [targetAgent, setTargetAgent] = useState<AgentId>(activeAgent);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync target agent with parent active agent selection
  useEffect(() => {
    setTargetAgent(activeAgent);
  }, [activeAgent]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const text = inputText.trim();
    setInputText('');
    soundFx.playClick();
    await onSendMessage(text, targetAgent);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    soundFx.playClick();
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSpeakMessage = (text: string, agentId: AgentId) => {
    soundFx.playClick();
    voiceSystem.speak(text, agentId);
  };

  const handleVoiceInput = () => {
    soundFx.playJarvisChirp();
    voiceSystem.startListening(
      (interim) => setInputText(interim),
      (finalText) => {
        setInputText(finalText);
        soundFx.playClick();
      }
    );
  };

  const getAgentColor = (sender: string) => {
    switch (sender) {
      case 'jarvis': return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20';
      case 'friday': return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
      case 'ultron': return 'text-amber-400 border-amber-500/40 bg-amber-950/20';
      case 'edith': return 'text-rose-400 border-rose-500/40 bg-rose-950/20';
      default: return 'text-slate-200 border-slate-700 bg-slate-900/60';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 border border-cyan-500/20 rounded-xl p-4 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <h3 className="font-heading font-bold text-slate-100 tracking-wider text-sm uppercase">
            Neural Command & AI Chat
          </h3>
        </div>

        {/* Target Agent Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-500 uppercase hidden sm:inline">Route to:</span>
          <select
            value={targetAgent}
            onChange={(e) => {
              setTargetAgent(e.target.value as AgentId);
              soundFx.playClick();
            }}
            className="text-xs font-mono bg-slate-900 border border-slate-700 text-cyan-300 rounded px-2 py-1 outline-none focus:border-cyan-400"
          >
            <option value="jarvis">@JARVIS (Core)</option>
            <option value="friday">@FRIDAY (Intel)</option>
            <option value="ultron">@ULTRON (Code)</option>
            <option value="edith">@EDITH (Defense)</option>
          </select>
        </div>
      </div>

      {/* Quick Action Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none text-[11px] font-mono">
        <button
          onClick={() => onQuickAction("Run full system diagnostic and neural load report.", 'jarvis')}
          className="px-2.5 py-1 rounded bg-slate-900/80 hover:bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Diagnostics
        </button>
        <button
          onClick={() => onQuickAction("Deconstruct current pending tasks and plan sprint architecture.", 'friday')}
          className="px-2.5 py-1 rounded bg-slate-900/80 hover:bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Cpu className="w-3 h-3 text-emerald-400" />
          Task Decomposition
        </button>
        <button
          onClick={() => onQuickAction("Verify encryption tokens, check cipher integrity and audit vulnerabilities.", 'edith')}
          className="px-2.5 py-1 rounded bg-slate-900/80 hover:bg-rose-950/40 border border-rose-500/30 text-rose-300 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Shield className="w-3 h-3 text-rose-400" />
          Security Audit
        </button>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Terminal className="w-8 h-8 text-cyan-500/40 mb-2" />
            <p className="font-tech text-sm text-slate-400">NEURAL CHAT BUS INITIALIZED</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Communicate directly with JARVIS, FRIDAY, ULTRON, or EDITH. Ask for task plans, system diagnostics, or voice commands.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const colorClass = getAgentColor(msg.sender);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Meta header */}
                <div className="flex items-center gap-2 mb-1 text-[10px] font-mono text-slate-500">
                  <span className={isUser ? 'text-slate-300 font-semibold' : 'text-cyan-400 font-semibold uppercase'}>
                    {msg.senderName}
                  </span>
                  <span>·</span>
                  <span className="tabular-nums">{msg.timestamp}</span>
                  {msg.source && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {msg.source}
                    </span>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[88%] rounded-xl p-3 border text-sm leading-relaxed ${
                    isUser
                      ? 'bg-cyan-950/30 border-cyan-500/30 text-slate-100 rounded-tr-none'
                      : `${colorClass} rounded-tl-none`
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Optional code snippet */}
                  {msg.codeSnippet && (
                    <div className="mt-2 p-2 rounded bg-black/60 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-800 pb-1 mb-1">
                        <span>{msg.codeSnippet.language}</span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.codeSnippet!.code)}
                          className="hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <code>{msg.codeSnippet.code}</code>
                    </div>
                  )}

                  {/* Actions bar for AI response */}
                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <button
                        onClick={() => handleSpeakMessage(msg.text, msg.sender as AgentId)}
                        className="flex items-center gap-1 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Read aloud with AI voice"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Voice Speak</span>
                      </button>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="flex items-center gap-1 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3 text-xs font-mono text-cyan-300 bg-cyan-950/20 border border-cyan-500/20 rounded-lg">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Agent synthesizing response across neural mesh...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2 pt-2 border-t border-cyan-500/20">
        <button
          type="button"
          onClick={handleVoiceInput}
          className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
          title="Dictate message with voice"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Command @${targetAgent.toUpperCase()}... (e.g., 'Status report' or 'Create task for data sync')`}
          disabled={isLoading}
          className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none placeholder:text-slate-500 transition-all font-mono"
        />

        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-tech font-bold text-xs tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <span>SEND</span>
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
