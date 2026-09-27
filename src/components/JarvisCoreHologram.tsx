import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Shield, Cpu, RefreshCw, Radio, Sparkles, Activity } from 'lucide-react';
import { voiceSystem, AI_PERSONALITIES } from '../services/voiceController';
import { soundFx } from '../services/soundFx';
import { wakeWordDetector, WakeWordState, WakeWordTriggerEvent } from '../services/wakeWordDetector';
import { AgentId } from '../types';

interface JarvisCoreHologramProps {
  activeAgent: AgentId;
  onAgentSelect: (agent: AgentId) => void;
  neuralLatency: number;
  cpuLoad: number;
  onVoiceCommandReceived?: (text: string) => void;
}

export const JarvisCoreHologram: React.FC<JarvisCoreHologramProps> = ({
  activeAgent,
  onAgentSelect,
  neuralLatency,
  cpuLoad,
  onVoiceCommandReceived
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [audioMuted, setAudioMuted] = useState(false);
  const [activePersonality, setActivePersonality] = useState(voiceSystem.currentPersonality.id);
  const [sphereRotation, setSphereRotation] = useState({ x: 0.2, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Wake-Word Sentry States
  const [wakeState, setWakeState] = useState<WakeWordState>(wakeWordDetector.state);
  const [wakeDetails, setWakeDetails] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [wakeSurge, setWakeSurge] = useState<boolean>(false);
  const [recentCommand, setRecentCommand] = useState<string>('');

  // Sync state with voice controller
  useEffect(() => {
    const interval = setInterval(() => {
      setIsListening(voiceSystem.isListening);
      setIsSpeaking(voiceSystem.isSpeaking);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to Wake-Word Sentry events, mic levels & triggers
  useEffect(() => {
    const unsubState = wakeWordDetector.onStateChange((state, details) => {
      setWakeState(state);
      if (details) setWakeDetails(details);
    });

    const unsubAudio = wakeWordDetector.onAudioLevel((level) => {
      setAudioLevel(level);
    });

    const unsubTrigger = wakeWordDetector.onWakeTrigger((event: WakeWordTriggerEvent) => {
      setWakeSurge(true);
      setTimeout(() => setWakeSurge(false), 2800);

      if (event.commandText) {
        setRecentCommand(event.commandText);
        if (onVoiceCommandReceived) {
          onVoiceCommandReceived(event.commandText);
        }
      }
    });

    return () => {
      unsubState();
      unsubAudio();
      unsubTrigger();
    };
  }, [onVoiceCommandReceived]);

  // WebGL / 2D Canvas Hardware-Accelerated Particle Sphere & HUD Rings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;
    let ringAngle1 = 0;
    let ringAngle2 = 0;
    let pulseScale = 1;

    // Create 3D particle cloud points
    const PARTICLE_COUNT = 320;
    const particles: { x: number; y: number; z: number; origX: number; origY: number; origZ: number; size: number; color: string; speed: number }[] = [];

    const radius = 95;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Golden spiral distribution on sphere
      const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
      const theta = Math.PI * (1 + 5 ** 0.5) * (i + 0.5);

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      const colorScheme = i % 4 === 0 
        ? '#00f0ff' // cyan
        : i % 4 === 1 
        ? '#00ff9d' // emerald
        : i % 4 === 2 
        ? '#ffaa00' // amber
        : '#38bdf8'; // sky

      particles.push({
        x, y, z,
        origX: x, origY: y, origZ: z,
        size: Math.random() * 2 + 1,
        color: colorScheme,
        speed: (Math.random() - 0.5) * 0.02
      });
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Audio reactive pulse incorporating mic volume level and wake word surge
      const micPulse = audioLevel * 0.5;
      const surgePulse = wakeSurge ? Math.sin(Date.now() * 0.025) * 0.25 : 0;
      const activePulse = isListening 
        ? Math.sin(Date.now() * 0.01) * 0.08 + micPulse
        : isSpeaking 
        ? Math.sin(Date.now() * 0.015) * 0.12 
        : Math.sin(Date.now() * 0.003) * 0.03 + micPulse * 0.6 + surgePulse;
      pulseScale = 1 + activePulse;

      angle += 0.008;
      ringAngle1 += 0.005;
      ringAngle2 -= 0.007;

      // 1. Draw outer HUD rings & tick marks
      ctx.save();
      ctx.translate(cx, cy);

      // Ambient radial glow
      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 160);
      grad.addColorStop(0, 'rgba(0, 240, 255, 0.22)');
      grad.addColorStop(0.4, 'rgba(0, 240, 255, 0.06)');
      grad.addColorStop(0.8, 'rgba(11, 16, 33, 0.02)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.fill();

      // Concentric HUD outer ring
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 142 * pulseScale, 0, Math.PI * 2);
      ctx.stroke();

      // Middle rotating arc segment
      ctx.setLineDash([]);
      ctx.strokeStyle = isListening ? 'rgba(0, 255, 157, 0.8)' : isSpeaking ? 'rgba(255, 170, 0, 0.8)' : 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 126 * pulseScale, ringAngle1, ringAngle1 + Math.PI * 0.75);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 126 * pulseScale, ringAngle1 + Math.PI, ringAngle1 + Math.PI * 1.6);
      ctx.stroke();

      // Counter-rotating precision inner ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 112 * pulseScale, ringAngle2, ringAngle2 + Math.PI * 1.2);
      ctx.stroke();

      // Outer radial tick notches
      const totalTicks = 36;
      for (let t = 0; t < totalTicks; t++) {
        const tickAngle = (t * Math.PI * 2) / totalTicks + ringAngle1 * 0.4;
        const innerR = 135;
        const outerR = t % 3 === 0 ? 142 : 138;
        const x1 = Math.cos(tickAngle) * innerR;
        const y1 = Math.sin(tickAngle) * innerR;
        const x2 = Math.cos(tickAngle) * outerR;
        const y2 = Math.sin(tickAngle) * outerR;

        ctx.strokeStyle = t % 6 === 0 ? 'rgba(0, 240, 255, 0.8)' : 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = t % 6 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 2. Render 3D Holographic Particle Sphere
      const cosY = Math.cos(angle + sphereRotation.y);
      const sinY = Math.sin(angle + sphereRotation.y);
      const cosX = Math.cos(sphereRotation.x);
      const sinX = Math.sin(sphereRotation.x);

      // Sort particles by depth for true 3D rendering
      const projected = particles.map(p => {
        // Rotate around Y
        const x1 = p.origX * cosY - p.origZ * sinY;
        const z1 = p.origZ * cosY + p.origX * sinY;

        // Rotate around X
        const y2 = p.origY * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.origY * sinX;

        // Perspective projection
        const fov = 300;
        const scale = fov / (fov + z2);
        return {
          px: x1 * scale * pulseScale,
          py: y2 * scale * pulseScale,
          pz: z2,
          size: Math.max(0.5, p.size * scale * (isListening || isSpeaking ? 1.4 : 1)),
          alpha: Math.max(0.15, Math.min(1, (z2 + radius) / (2 * radius) + 0.2)),
          color: p.color
        };
      }).sort((a, b) => a.pz - b.pz);

      // Draw particle interconnecting holographic neural lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i += 6) {
        const p1 = projected[i];
        if (p1.pz > 0) { // only in front hemisphere
          for (let j = i + 1; j < Math.min(i + 4, projected.length); j++) {
            const p2 = projected[j];
            const dist = Math.hypot(p1.px - p2.px, p1.py - p2.py);
            if (dist < 38) {
              ctx.strokeStyle = `rgba(0, 240, 255, ${(1 - dist / 38) * 0.25})`;
              ctx.beginPath();
              ctx.moveTo(p1.px, p1.py);
              ctx.lineTo(p2.px, p2.py);
              ctx.stroke();
            }
          }
        }
      }

      // Draw particle dots
      projected.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Extra flare on frontal bright particles
        if (p.pz > 40 && Math.random() > 0.8) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(p.px, p.py, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1.0;

      // 3. Central Arc Reactor Core
      const coreRadius = 24 * (isListening ? 1.25 : isSpeaking ? 1.35 : 1);
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRadius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, isListening ? '#00ff9d' : isSpeaking ? '#ffaa00' : '#00f0ff');
      coreGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Core Tri-Hexagonal Reticle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const segAngle = (s * Math.PI) / 3 + ringAngle2 * 1.5;
        const hx = Math.cos(segAngle) * 14;
        const hy = Math.sin(segAngle) * 14;
        if (s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, isSpeaking, sphereRotation, audioLevel, wakeSurge]);

  // Mouse drag 3D rotation handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setSphereRotation(prev => ({
      x: Math.max(-1.2, Math.min(1.2, prev.x + dy * 0.008)),
      y: prev.y + dx * 0.008
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Voice toggle
  const toggleVoiceReceptor = () => {
    if (isListening) {
      voiceSystem.stopListening();
      setIsListening(false);
      setInterimSpeech('');
    } else {
      soundFx.playJarvisChirp();
      const started = voiceSystem.startListening(
        (interim) => setInterimSpeech(interim),
        (finalText) => {
          setInterimSpeech('');
          if (onVoiceCommandReceived) onVoiceCommandReceived(finalText);
        }
      );
      if (started) {
        setIsListening(true);
      }
    }
  };

  const toggleMute = () => {
    soundFx.enabled = !audioMuted ? false : true;
    voiceSystem.ttsEnabled = !audioMuted ? false : true;
    setAudioMuted(!audioMuted);
    if (!audioMuted) {
      voiceSystem.stopSpeaking();
    } else {
      soundFx.playClick();
    }
  };

  const handlePersonalityChange = (personalityId: string) => {
    voiceSystem.setPersonality(personalityId);
    setActivePersonality(personalityId);
    voiceSystem.speak(`Personality core shifted to ${AI_PERSONALITIES[personalityId].name}. Systems operational.`, personalityId);
  };

  // Toggle Wake-Word Sentry
  const toggleWakeWordSentry = async () => {
    const isArmed = wakeState === 'LISTENING_FOR_WAKE_WORD' || wakeState === 'CAPTURING_COMMAND';
    if (isArmed) {
      wakeWordDetector.stop();
    } else {
      await wakeWordDetector.start();
    }
  };

  // Simulate saying "Jarvis" for instant verification / demonstration
  const handleSimulateWakeWord = () => {
    // Trigger simulated wake-word detection through the wakeWordDetector service
    (wakeWordDetector as any).triggerWakeWord('Jarvis', 'run diagnostics report');
  };

  return (
    <div className="relative flex flex-col items-center justify-between p-4 bg-slate-950/80 border border-cyan-500/30 rounded-xl glow-cyan overflow-hidden backdrop-blur-md">
      {/* Corner Tech Brackets */}
      <div className="hud-corner-tl absolute top-0 left-0 w-4 h-4" />
      <div className="hud-corner-tr absolute top-0 right-0 w-4 h-4" />

      {/* Top HUD Telemetry Bar */}
      <div className="w-full flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            wakeState === 'LISTENING_FOR_WAKE_WORD' || wakeState === 'CAPTURING_COMMAND'
              ? 'bg-emerald-400 animate-ping'
              : 'bg-cyan-400 animate-pulse'
          }`} />
          <span className="text-cyan-400 font-bold tracking-wider">JARVIS // CORE ORBIT</span>
          <span className="text-slate-500 hidden sm:inline">| SEC-LEVEL 9</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="tabular-nums">LATENCY: <strong className="text-cyan-300 font-semibold">{neuralLatency.toFixed(1)}ms</strong></span>
          <span className="tabular-nums hidden sm:inline">LOAD: <strong className="text-emerald-400 font-semibold">{cpuLoad.toFixed(1)}%</strong></span>
        </div>
      </div>

      {/* Center Holographic Interactive Canvas */}
      <div 
        className="relative w-full flex justify-center items-center py-2 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={340}
          height={320}
          className="max-w-full drop-shadow-[0_0_25px_rgba(0,240,255,0.35)]"
        />

        {/* Central Overlay Status Tag */}
        <div className="absolute bottom-2 flex flex-col items-center pointer-events-none px-2 w-full">
          <div className={`px-3 py-1 rounded text-center backdrop-blur-md shadow-lg transition-all duration-300 border ${
            wakeSurge 
              ? 'bg-cyan-500/30 border-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.7)] scale-105'
              : wakeState === 'CAPTURING_COMMAND'
              ? 'bg-amber-500/20 border-amber-400/80 shadow-[0_0_15px_rgba(255,170,0,0.5)]'
              : wakeState === 'LISTENING_FOR_WAKE_WORD'
              ? 'bg-emerald-950/80 border-emerald-500/60'
              : 'bg-slate-900/90 border-cyan-400/40'
          }`}>
            <p className="text-[11px] font-mono tracking-widest font-bold uppercase flex items-center justify-center gap-1.5">
              {wakeSurge ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                  <span className="text-cyan-200">⚡ WAKE-WORD "JARVIS" DETECTED</span>
                </>
              ) : wakeState === 'CAPTURING_COMMAND' ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span className="text-amber-300">JARVIS LISTENING FOR COMMAND...</span>
                </>
              ) : wakeState === 'LISTENING_FOR_WAKE_WORD' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-emerald-300">WAKE SENTRY ACTIVE // SAY "JARVIS"</span>
                </>
              ) : isListening ? (
                <span className="text-emerald-300">AUDIO RECEPTOR ENGAGED</span>
              ) : isSpeaking ? (
                <span className="text-amber-300">VOCAL SYNTHESIZER ACTIVE</span>
              ) : (
                <span className="text-cyan-300">QUANTUM ORBIT // STANDBY</span>
              )}
            </p>
          </div>
          {interimSpeech && (
            <p className="mt-2 text-xs text-emerald-400 font-mono italic max-w-[280px] text-center truncate bg-black/60 px-2 py-0.5 rounded">
              "{interimSpeech}"
            </p>
          )}
          {recentCommand && !interimSpeech && (
            <p className="mt-1 text-[11px] text-cyan-300 font-mono max-w-[280px] text-center truncate bg-slate-950/70 px-2 py-0.5 rounded border border-cyan-500/20">
              Cmd: "{recentCommand}"
            </p>
          )}
        </div>
      </div>

      {/* Live Microphone API Real-Time VU Meter Bar */}
      <div className="w-full px-2 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 shrink-0">
          <Activity className={`w-3.5 h-3.5 ${
            wakeState === 'LISTENING_FOR_WAKE_WORD' || wakeState === 'CAPTURING_COMMAND' || isListening
              ? 'text-emerald-400 animate-pulse'
              : 'text-slate-500'
          }`} />
          <span className="text-[11px] text-slate-400">MIC SENSITIVITY:</span>
        </div>

        {/* Dynamic VU Meter bars */}
        <div className="flex items-center gap-1 flex-1 h-3 bg-slate-950 px-1 rounded border border-slate-800 overflow-hidden">
          {Array.from({ length: 16 }).map((_, i) => {
            const threshold = (i + 1) / 16;
            const isLit = audioLevel >= threshold;
            let barColor = 'bg-cyan-500';
            if (i > 12) barColor = 'bg-rose-500';
            else if (i > 8) barColor = 'bg-amber-400';
            else barColor = 'bg-emerald-400';

            return (
              <div
                key={i}
                className={`h-2 flex-1 rounded-xs transition-all duration-75 ${
                  isLit ? `${barColor} shadow-[0_0_6px_currentColor]` : 'bg-slate-800/50'
                }`}
              />
            );
          })}
        </div>

        <span className="text-[10px] tabular-nums text-slate-400 w-10 text-right">
          {Math.round(audioLevel * 100)}%
        </span>
      </div>

      {/* Voice Receptor Interaction & Personality Controls */}
      <div className="w-full mt-3 pt-3 border-t border-cyan-500/20 flex flex-col gap-2">
        {/* Wake-Word Sentry Control Strip */}
        <div className="w-full flex items-center justify-between gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <button
            onClick={toggleWakeWordSentry}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer ${
              wakeState === 'LISTENING_FOR_WAKE_WORD' || wakeState === 'CAPTURING_COMMAND'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-[0_0_12px_rgba(0,255,157,0.3)]'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Uses the Microphone API to continuously detect when you say 'Jarvis' and trigger commands"
          >
            <Radio className={`w-3.5 h-3.5 ${
              wakeState === 'LISTENING_FOR_WAKE_WORD' || wakeState === 'CAPTURING_COMMAND' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
            }`} />
            <span>
              {wakeState === 'LISTENING_FOR_WAKE_WORD'
                ? 'WAKE-WORD: "JARVIS" (ARMED)'
                : wakeState === 'CAPTURING_COMMAND'
                ? 'WAKE-WORD: (CAPTURING COMMAND)'
                : 'WAKE-WORD: "JARVIS" (OFF)'}
            </span>
          </button>

          {/* Quick Simulate Trigger (useful for testing or quiet environments) */}
          <button
            onClick={handleSimulateWakeWord}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 hover:text-cyan-200 border border-cyan-700/50 rounded-lg text-[11px] font-mono transition-colors cursor-pointer"
            title="Simulate saying 'Jarvis' to test the wake-word trigger and command pipeline"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Simulate "Jarvis"</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Direct Manual Mic Toggle Button */}
          <button
            onClick={toggleVoiceReceptor}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-tech font-bold text-sm tracking-wider transition-all duration-200 cursor-pointer ${
              isListening
                ? 'bg-emerald-500 text-slate-950 glow-emerald scale-[1.02]'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400'
            }`}
            aria-label={isListening ? 'Disable Voice Input' : 'Enable Voice Command Input'}
          >
            {isListening ? (
              <>
                <Mic className="w-4 h-4 animate-bounce" />
                <span>LISTENING... (CLICK TO STOP)</span>
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4" />
                <span>DIRECT VOICE COMMAND</span>
              </>
            )}
          </button>

          {/* Audio Mute Button */}
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
            aria-label={audioMuted ? 'Unmute Audio Feedback' : 'Mute Audio Feedback'}
            title={audioMuted ? 'Audio Feedback Muted' : 'Audio Feedback Active'}
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        {/* Personality Selector Strip */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[10px] font-mono text-slate-500 shrink-0 mr-1 uppercase">Personality:</span>
          {Object.values(AI_PERSONALITIES).map((p) => {
            const isCurrent = activePersonality === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePersonalityChange(p.id)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,240,255,0.5)]'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800'
                }`}
                title={p.description}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
