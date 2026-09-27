import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Zap, Sparkles, RefreshCw, Volume2, ShieldCheck, 
  Terminal, Activity, HardDrive, Coffee, Bot, ArrowRight 
} from 'lucide-react';
import { AgentId, TaskItem } from '../types';
import { soundFx } from '../services/soundFx';
import { voiceSystem } from '../services/voiceController';

interface TycoonBotSimProps {
  tasks: TaskItem[];
  activeAgent: AgentId;
  onSelectAgent: (agentId: AgentId) => void;
  onTriggerTask?: (taskId: string) => void;
}

interface WorkerBot {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetStation: string;
  carryingItem: string | null;
  state: 'walking' | 'working' | 'idle' | 'celebrating';
  workTimer: number;
  currentAction: string;
  energy: number;
  completedCount: number;
  emoji: string;
}

interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  icon: string;
  description: string;
  activeCount: number;
}

export const TycoonBotSim: React.FC<TycoonBotSimProps> = ({
  tasks,
  activeAgent,
  onSelectAgent,
  onTriggerTask
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedBot, setSelectedBot] = useState<WorkerBot | null>(null);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [sprintActive, setSprintActive] = useState<boolean>(false);
  const [totalWorkDone, setTotalWorkDone] = useState<number>(142);

  // Define Workstations on the Tycoon Floor
  const stations: Station[] = [
    { id: 'command', name: 'Strategic Command Deck', x: 260, y: 70, width: 140, height: 80, color: '#00f0ff', icon: '👑', description: 'Task delegation & strategic planning', activeCount: 0 },
    { id: 'server', name: 'Knowledge & Data Vault', x: 80, y: 90, width: 120, height: 90, color: '#00ff9d', icon: '💽', description: 'Context indexing & research synthesis', activeCount: 0 },
    { id: 'forge', name: 'Algorithmic Code Forge', x: 450, y: 100, width: 130, height: 90, color: '#ffaa00', icon: '⚙️', description: 'Zero-copy pipeline compilation', activeCount: 0 },
    { id: 'security', name: 'Firewall & Defense Sentry', x: 100, y: 250, width: 120, height: 80, color: '#ff0055', icon: '🛡️', description: 'AES-GCM encryption & token verification', activeCount: 0 },
    { id: 'conveyor', name: 'Conveyor & Pipeline Hub', x: 270, y: 240, width: 130, height: 80, color: '#a855f7', icon: '📦', description: 'Task serialization & delivery', activeCount: 0 },
    { id: 'cafe', name: 'Recharge & Cyber Pod', x: 460, y: 250, width: 110, height: 75, color: '#38bdf8', icon: '⚡', description: 'Neural memory cooling & defrag', activeCount: 0 }
  ];

  // Initialize Worker Bots
  const botsRef = useRef<WorkerBot[]>([
    {
      id: 'jarvis',
      name: 'Jarvis Bot',
      role: 'Chief Architect',
      color: '#00f0ff',
      x: 320,
      y: 110,
      targetX: 320,
      targetY: 110,
      targetStation: 'command',
      carryingItem: null,
      state: 'working',
      workTimer: 60,
      currentAction: 'Planning sprint tasks',
      energy: 98,
      completedCount: 42,
      emoji: '🎩'
    },
    {
      id: 'friday',
      name: 'Friday Bot',
      role: 'Research Scout',
      color: '#00ff9d',
      x: 140,
      y: 135,
      targetX: 140,
      targetY: 135,
      targetStation: 'server',
      carryingItem: 'Data Orb #7',
      state: 'working',
      workTimer: 80,
      currentAction: 'Cross-referencing telemetry',
      energy: 94,
      completedCount: 38,
      emoji: '🔬'
    },
    {
      id: 'ultron',
      name: 'Ultron Bot',
      role: 'Code Assembler',
      color: '#ffaa00',
      x: 515,
      y: 145,
      targetX: 515,
      targetY: 145,
      targetStation: 'forge',
      carryingItem: null,
      state: 'working',
      workTimer: 100,
      currentAction: 'Synthesizing low-level code',
      energy: 90,
      completedCount: 31,
      emoji: '⚡'
    },
    {
      id: 'edith',
      name: 'Edith Bot',
      role: 'Security Sentry',
      color: '#ff0055',
      x: 160,
      y: 290,
      targetX: 160,
      targetY: 290,
      targetStation: 'security',
      carryingItem: null,
      state: 'working',
      workTimer: 50,
      currentAction: 'Auditing AES-GCM cipher',
      energy: 96,
      completedCount: 29,
      emoji: '🛡️'
    },
    {
      id: 'nebula',
      name: 'Nebula Bot',
      role: 'Conveyor Streamer',
      color: '#a855f7',
      x: 335,
      y: 280,
      targetX: 335,
      targetY: 280,
      targetStation: 'conveyor',
      carryingItem: 'Task Packet',
      state: 'working',
      workTimer: 70,
      currentAction: 'Dispatching stream packets',
      energy: 92,
      completedCount: 26,
      emoji: '🚀'
    }
  ]);

  // Main Tycoon Game Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick++;
      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Tycoon Floor (Cyber Isometric Tiles)
      ctx.fillStyle = '#060a17';
      ctx.fillRect(0, 0, width, height);

      // Floor grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Conveyor track line connecting Server -> Forge -> Conveyor
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -tick * (sprintActive ? 4 : 1.5) * simSpeed;
      ctx.strokeStyle = 'rgba(0, 255, 157, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(140, 135);
      ctx.lineTo(330, 110);
      ctx.lineTo(515, 145);
      ctx.lineTo(335, 280);
      ctx.lineTo(160, 290);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw Workstations
      stations.forEach(st => {
        // Station glow
        ctx.fillStyle = 'rgba(11, 19, 43, 0.85)';
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 1.5;

        // Station base rounded rect
        ctx.beginPath();
        ctx.roundRect(st.x, st.y, st.width, st.height, 8);
        ctx.fill();
        ctx.stroke();

        // Station corner accents
        ctx.fillStyle = st.color;
        ctx.fillRect(st.x, st.y, 6, 2);
        ctx.fillRect(st.x, st.y, 2, 6);
        ctx.fillRect(st.x + st.width - 6, st.y, 6, 2);
        ctx.fillRect(st.x + st.width - 2, st.y, 2, 6);

        // Station Icon & Label
        ctx.font = '16px sans-serif';
        ctx.fillText(st.icon, st.x + 8, st.y + 24);

        ctx.font = 'bold 11px Chakra Petch';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(st.name, st.x + 30, st.y + 22);

        // Station sub-description
        ctx.font = '9px JetBrains Mono';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(st.description, st.x + 10, st.y + 40);

        // Animated station activity bar
        const activeBarW = (st.width - 20) * (0.4 + Math.sin(tick * 0.05 + st.x) * 0.3);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(st.x + 10, st.y + 54, st.width - 20, 6);
        ctx.fillStyle = st.color;
        ctx.fillRect(st.x + 10, st.y + 54, activeBarW, 6);
      });

      // 3. Update & Draw Worker Bots
      const speedMultiplier = (sprintActive ? 2.5 : 1) * simSpeed;

      botsRef.current.forEach((bot, idx) => {
        // Bot movement logic
        if (bot.state === 'walking') {
          const dx = bot.targetX - bot.x;
          const dy = bot.targetY - bot.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 4) {
            // Arrived at destination station!
            bot.x = bot.targetX;
            bot.y = bot.targetY;
            bot.state = 'working';
            bot.workTimer = Math.floor(60 + Math.random() * 80);

            // Action based on station
            if (bot.targetStation === 'forge') {
              bot.currentAction = 'Forging subroutines';
              bot.carryingItem = null;
            } else if (bot.targetStation === 'server') {
              bot.currentAction = 'Retrieving context memory';
              bot.carryingItem = 'Data Cube';
            } else if (bot.targetStation === 'security') {
              bot.currentAction = 'Cryptographic hash check';
            } else if (bot.targetStation === 'conveyor') {
              bot.currentAction = 'Packaging for deployment';
              bot.completedCount += 1;
              setTotalWorkDone(prev => prev + 1);
              if (Math.random() > 0.6) {
                soundFx.playClick();
              }
            } else if (bot.targetStation === 'cafe') {
              bot.currentAction = 'Sipping cyber-latte ☕';
              bot.energy = Math.min(100, bot.energy + 15);
            }
          } else {
            bot.x += (dx / dist) * (1.8 * speedMultiplier);
            bot.y += (dy / dist) * (1.8 * speedMultiplier);
          }
        } else if (bot.state === 'working') {
          bot.workTimer -= speedMultiplier;
          if (bot.workTimer <= 0) {
            // Pick next station to walk to
            const otherStations = stations.filter(s => s.id !== bot.targetStation);
            const nextStation = otherStations[Math.floor(Math.random() * otherStations.length)];
            bot.targetStation = nextStation.id;
            bot.targetX = nextStation.x + nextStation.width / 2 + (Math.random() - 0.5) * 20;
            bot.targetY = nextStation.y + nextStation.height / 2 + (Math.random() - 0.5) * 15;
            bot.state = 'walking';
            bot.currentAction = `Moving to ${nextStation.name.split(' ')[0]}`;
          }
        }

        // Bobbing animation
        const bob = Math.sin(tick * 0.15 + idx) * 2;

        // Draw Bot Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(bot.x, bot.y + 14, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Bot Body
        ctx.save();
        ctx.translate(bot.x, bot.y + bob);

        // Aura glow
        ctx.shadowColor = bot.color;
        ctx.shadowBlur = 10;

        // Bot chassis (cute rounded shape)
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = bot.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-12, -14, 24, 24, 6);
        ctx.fill();
        ctx.stroke();

        // Bot Face Screen
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.roundRect(-9, -11, 18, 12, 3);
        ctx.fill();

        // Bot Glowing Eyes
        ctx.fillStyle = bot.color;
        const eyeOffset = Math.sin(tick * 0.08 + idx) > 0 ? 0 : 0.5;
        ctx.fillRect(-6, -8, 4, 3 + eyeOffset);
        ctx.fillRect(2, -8, 4, 3 + eyeOffset);

        // Bot Antenna
        ctx.strokeStyle = bot.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(0, -20);
        ctx.stroke();
        ctx.fillStyle = bot.color;
        ctx.beginPath();
        ctx.arc(0, -21, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // If carrying item, draw small glowing box in hands
        if (bot.carryingItem) {
          ctx.fillStyle = '#00ff9d';
          ctx.fillRect(-5, 4, 10, 8);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.strokeRect(-5, 4, 10, 8);
        }

        // Active working spark / gear effect
        if (bot.state === 'working' && tick % 20 < 10) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(14, -8, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Draw Bot Name & Speech Tag above head
        ctx.font = 'bold 10px Chakra Petch';
        ctx.fillStyle = bot.color;
        ctx.textAlign = 'center';
        ctx.fillText(bot.name, bot.x, bot.y - 25);

        // Thought Bubble / Current Action
        ctx.font = '9px JetBrains Mono';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(bot.currentAction, bot.x, bot.y + 26);
        ctx.textAlign = 'left';
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [simSpeed, sprintActive]);

  // Click on Canvas to select bot
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check if clicked near any bot
    const clicked = botsRef.current.find(b => Math.hypot(b.x - clickX, b.y - clickY) < 28);
    if (clicked) {
      setSelectedBot(clicked);
      onSelectAgent(clicked.id);
      soundFx.playClick();
      voiceSystem.speak(`Inspecting ${clicked.name}. Current objective: ${clicked.currentAction}.`);
    } else {
      setSelectedBot(null);
    }
  };

  const handleSprintBurst = () => {
    soundFx.playBootSweep();
    setSprintActive(true);
    voiceSystem.speak('Tycoon work overdrive engaged! All autonomous bot workers are operating at maximum velocity.');
    setTimeout(() => {
      setSprintActive(false);
      soundFx.playTaskComplete();
    }, 4500);
  };

  const handleBoostBot = (botId: AgentId) => {
    const bot = botsRef.current.find(b => b.id === botId);
    if (bot) {
      bot.energy = 100;
      bot.completedCount += 2;
      setTotalWorkDone(prev => prev + 2);
      soundFx.playJarvisChirp();
      voiceSystem.speak(`${bot.name} received a hyper-energy boost. Efficiency restored.`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 border border-cyan-500/20 rounded-xl p-4 backdrop-blur-md">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-heading font-bold text-slate-100 tracking-wider text-sm uppercase flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>AI Tycoon Bot Workspace &middot; Collaboration Floor</span>
          </h3>
        </div>

        {/* Tycoon Stats & Overdrive Controls */}
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            TOTAL DELIVERIES: <strong className="text-emerald-400">{totalWorkDone}</strong>
          </div>

          {/* Speed Buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            {[1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSimSpeed(s)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                  simSpeed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Sprint Button */}
          <button
            onClick={handleSprintBurst}
            disabled={sprintActive}
            className={`px-3 py-1 text-xs font-tech font-bold rounded border flex items-center gap-1.5 cursor-pointer transition-all ${
              sprintActive
                ? 'bg-amber-500 border-amber-400 text-slate-950 animate-pulse'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:border-cyan-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{sprintActive ? 'OVERDRIVE ACTIVE!' : 'DISPATCH SPRINT'}</span>
          </button>
        </div>
      </div>

      {/* Tycoon Animated Canvas Floor */}
      <div className="relative w-full flex-1 min-h-[340px] rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950 flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={680}
          height={360}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* Selected Bot Inspector Card Floating Overlay */}
        {selectedBot && (
          <div className="absolute top-3 right-3 z-20 w-64 bg-slate-950/95 border border-cyan-400/50 rounded-lg p-3 shadow-2xl glow-cyan text-xs font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{selectedBot.emoji}</span>
                <span className="font-bold text-slate-100">{selectedBot.name}</span>
              </div>
              <button
                onClick={() => setSelectedBot(null)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                [X]
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">
              Role: <strong className="text-cyan-300">{selectedBot.role}</strong>
            </p>
            <p className="text-[11px] text-slate-400 mb-2">
              Current Duty: <span className="text-emerald-400">{selectedBot.currentAction}</span>
            </p>

            <div className="space-y-1 pt-1 border-t border-slate-800 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">ENERGY:</span>
                <span className="text-amber-400 font-bold">{selectedBot.energy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">DELIVERIES:</span>
                <span className="text-cyan-300 font-bold">{selectedBot.completedCount}</span>
              </div>
            </div>

            <button
              onClick={() => handleBoostBot(selectedBot.id)}
              className="w-full mt-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Boost Energy + Tasks</span>
            </button>
          </div>
        )}
      </div>

      {/* Bot Roster Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-800/80">
        {botsRef.current.map((b) => (
          <div
            key={b.id}
            onClick={() => {
              setSelectedBot(b);
              onSelectAgent(b.id);
              soundFx.playClick();
            }}
            className={`p-2 rounded bg-slate-900/60 border cursor-pointer transition-all flex items-center justify-between ${
              activeAgent === b.id ? 'border-cyan-400 glow-cyan' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-sm">{b.emoji}</span>
              <div className="truncate">
                <span className="font-tech text-xs font-bold text-slate-200 block truncate">{b.name}</span>
                <span className="text-[9px] font-mono text-slate-500 truncate block">{b.role}</span>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
          </div>
        ))}
      </div>
    </div>
  );
};
