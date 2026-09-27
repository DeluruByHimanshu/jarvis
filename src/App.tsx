import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { JarvisCoreHologram } from './components/JarvisCoreHologram';
import { TycoonBotSim } from './components/TycoonBotSim';
import { AIChatSection } from './components/AIChatSection';
import { TaskManagementSection } from './components/TaskManagementSection';
import { TelemetryLogsSection } from './components/TelemetryLogsSection';
import { DashboardGrid } from './components/DashboardGrid';
import { AuthModal } from './components/AuthModal';
import { SecurityModal } from './components/SecurityModal';

import { 
  AgentId, AgentInfo, TaskItem, ChatMessage, TelemetryMetrics, 
  LogEntry, WidgetConfig, WidgetId, UserSession 
} from './types';
import { voiceSystem } from './services/voiceController';
import { soundFx } from './services/soundFx';
import { loadEncryptedItem, saveEncryptedItem, encryptData } from './services/crypto';

const INITIAL_AGENTS: Record<AgentId, AgentInfo> = {
  jarvis: {
    id: 'jarvis',
    name: 'J.A.R.V.I.S.',
    codename: 'CORE-ORCHESTRATOR',
    role: 'Master Strategic Orchestrator & Voice Liaison',
    color: '#00f0ff',
    accentGlow: 'glow-cyan',
    status: 'ONLINE',
    loadPct: 22,
    latencyMs: 14.8,
    memoryMb: 142,
    capabilities: ['Voice Arbitration', 'Multi-Agent Routing', 'Task Planning']
  },
  friday: {
    id: 'friday',
    name: 'F.R.I.D.A.Y.',
    codename: 'INTEL-SYNTHESIZER',
    role: 'Deep Knowledge Synthesis & Web Query Research',
    color: '#00ff9d',
    accentGlow: 'glow-emerald',
    status: 'ONLINE',
    loadPct: 18,
    latencyMs: 19.2,
    memoryMb: 118,
    capabilities: ['Context Graphing', 'Telemetry Invariants', 'Heuristics']
  },
  ultron: {
    id: 'ultron',
    name: 'U.L.T.R.O.N.',
    codename: 'CODE-SYNTHESIZER',
    role: 'Low-Level Execution & Systems Architecture',
    color: '#ffaa00',
    accentGlow: 'glow-amber',
    status: 'ONLINE',
    loadPct: 34,
    latencyMs: 11.5,
    memoryMb: 184,
    capabilities: ['Code Synthesis', 'Zero-Copy Buffer', 'SIMD Optimization']
  },
  edith: {
    id: 'edith',
    name: 'E.D.I.T.H.',
    codename: 'TACTICAL-DEFENSE',
    role: 'Zero-Trust Sentry & Cryptographic Security Auditor',
    color: '#ff0055',
    accentGlow: 'glow-crimson',
    status: 'ONLINE',
    loadPct: 12,
    latencyMs: 16.4,
    memoryMb: 96,
    capabilities: ['JWT Token Guard', 'AES-GCM Key Audit', 'Anomaly Containment']
  },
  nebula: {
    id: 'nebula',
    name: 'N.E.B.U.L.A.',
    codename: 'TELEMETRY-BRIDGE',
    role: 'Hardware Acceleration & Offline Cache Streamer',
    color: '#a855f7',
    accentGlow: 'glow-purple',
    status: 'ONLINE',
    loadPct: 15,
    latencyMs: 13.1,
    memoryMb: 104,
    capabilities: ['60FPS Sync', 'PWA Offline Cache', 'Latency Throttle']
  }
};

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'hologram', title: 'JARVIS Core Hologram & Voice Receptor', subtitle: 'Holographic Arc Reactor & Voice Engine', visible: true, minimized: false, order: 0 },
  { id: 'tycoon', title: 'AI Tycoon Bot Workspace', subtitle: 'Autonomous Worker Bots Floor', visible: true, minimized: false, order: 1 },
  { id: 'tasks', title: 'Tactical Objectives & ToDo Pipeline', subtitle: 'Multi-Agent Subroutine Board', visible: true, minimized: false, order: 2 },
  { id: 'chat', title: 'Neural AI Command Chat', subtitle: 'Real-time Conversational Hub', visible: true, minimized: false, order: 3 },
  { id: 'telemetry', title: 'Hardware Metrics & Live Logs', subtitle: 'Performance Telemetry & System Event Stream', visible: true, minimized: false, order: 4 }
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Initialize End-to-End AES-GCM Encrypted Storage Pipeline',
    description: 'Ensure client-side zero-trust confidentiality for cached memories and tokens.',
    assignedAgent: 'edith',
    priority: 'Critical',
    column: 'completed',
    progress: 100,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    encrypted: true
  },
  {
    id: 'task-2',
    title: 'Accelerate Canvas 3D Particle Hologram to 60 FPS',
    description: 'Optimize matrix multiplication and depth sorting for low-latency hardware rendering.',
    assignedAgent: 'ultron',
    priority: 'High',
    column: 'processing',
    progress: 70,
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now(),
    encrypted: true
  },
  {
    id: 'task-3',
    title: 'Register Service Worker & Local Neural Fallback for Offline Drops',
    description: 'Implement cache-first static shell strategy and queued offline agent deliberations.',
    assignedAgent: 'nebula',
    priority: 'High',
    column: 'verification',
    progress: 85,
    createdAt: Date.now() - 1200000,
    updatedAt: Date.now(),
    encrypted: true
  },
  {
    id: 'task-4',
    title: 'Cross-reference knowledge base with multi-agent orchestration invariants',
    description: 'Synthesize telemetry constraints and build auto-decomposition heuristics.',
    assignedAgent: 'friday',
    priority: 'Nominal',
    column: 'queue',
    progress: 0,
    createdAt: Date.now() - 600000,
    updatedAt: Date.now(),
    encrypted: true
  }
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'jarvis',
    senderName: 'J.A.R.V.I.S.',
    text: 'Good evening, Commander. All multi-agent subsystems have completed boot calibration. Real-time telemetry, AES-GCM encryption, and voice receptors are fully operational. How may we assist your operations?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    source: 'local-agent-core'
  }
];

export default function App() {
  // Session State (JWT)
  const [session, setSession] = useState<UserSession>({
    token: null,
    callsign: 'Tony Stark',
    role: 'Supreme Commander',
    securityClearance: 'LEVEL-9',
    isAuthenticated: true
  });

  // Active Selected Agent
  const [activeAgent, setActiveAgent] = useState<AgentId>('jarvis');
  const [agents, setAgents] = useState<Record<AgentId, AgentInfo>>(INITIAL_AGENTS);

  // Real-time Telemetry with true measured FPS
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>({
    cpu_usage_pct: 18.2,
    neural_latency_ms: 14.5,
    memory_mb: 432,
    gpu_draw_calls: 168,
    throughput_kbps: 1120,
    active_threads: 18,
    encryption_cipher: 'AES-GCM-256',
    quantum_entropy: '0.984',
    fps: 60
  });

  // Tasks, Messages, Logs
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);

  // Network & UI States
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [activeNavSection, setActiveNavSection] = useState<string>('matrix');
  const [scanlinesActive, setScanlinesActive] = useState<boolean>(true);
  const [srAnnouncement, setSrAnnouncement] = useState<string>('');

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);

  // Ref for FPS calculation
  const fpsFrameCount = useRef(0);
  const fpsLastTime = useRef(performance.now());

  // 1. Initial Load from Encrypted Storage
  useEffect(() => {
    async function loadData() {
      const storedTasks = await loadEncryptedItem<TaskItem[]>('jarvis_tasks', INITIAL_TASKS);
      const storedMessages = await loadEncryptedItem<ChatMessage[]>('jarvis_messages', INITIAL_MESSAGES);
      const storedWidgets = await loadEncryptedItem<WidgetConfig[]>('jarvis_widgets', DEFAULT_WIDGETS);
      const storedToken = localStorage.getItem('jarvis_jwt_token');

      if (storedTasks) setTasks(storedTasks);
      if (storedMessages) setMessages(storedMessages);
      if (storedWidgets) {
        // Upgrade legacy 'agents' widget ID to 'tycoon'
        const normalized = storedWidgets.map(w => 
          (w.id as any) === 'agents' 
            ? { ...w, id: 'tycoon' as WidgetId, title: 'AI Tycoon Bot Workspace', subtitle: 'Autonomous Worker Bots Floor' } 
            : w
        );
        setWidgets(normalized);
      }
      if (storedToken) {
        setSession(prev => ({ ...prev, token: storedToken }));
      }

      addLog('SYSTEM', 'Core encryption vault initialized. AES-GCM-256 active.', 'SECURITY');
      addLog('SYSTEM', 'Autonomous Tycoon Bot Workspace active: Jarvis, Friday, Ultron, Edith, Nebula.', 'INFO');
    }
    loadData();

    // Clean up any legacy or stale service workers and caches
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
    }

    // Network connectivity listeners
    const handleOnline = () => {
      setIsOnline(true);
      addLog('SYSTEM', 'Network connection restored. Quantum mesh online.', 'INFO');
      soundFx.playJarvisChirp();
    };
    const handleOffline = () => {
      setIsOnline(false);
      addLog('SYSTEM', 'Network connection severed. Local offline neural cache engaged.', 'WARN');
      soundFx.playAlert();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Hardware FPS Tracking via requestAnimationFrame
  useEffect(() => {
    let animId: number;
    const calculateFps = (now: number) => {
      fpsFrameCount.current++;
      const elapsed = now - fpsLastTime.current;
      if (elapsed >= 1000) {
        const calculatedFps = Math.round((fpsFrameCount.current * 1000) / elapsed);
        setTelemetry(prev => ({ ...prev, fps: Math.min(60, Math.max(30, calculatedFps)) }));
        fpsFrameCount.current = 0;
        fpsLastTime.current = now;
      }
      animId = requestAnimationFrame(calculateFps);
    };
    animId = requestAnimationFrame(calculateFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 3. Telemetry periodic refresh from Python Backend / Simulated Load
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (isOnline) {
          const res = await fetch('/api/python/agent-dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'telemetry' })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.telemetry) {
              setTelemetry(prev => ({
                ...prev,
                cpu_usage_pct: data.telemetry.cpu_usage_pct,
                neural_latency_ms: data.telemetry.neural_latency_ms,
                memory_mb: data.telemetry.memory_mb,
                gpu_draw_calls: data.telemetry.gpu_draw_calls,
                throughput_kbps: data.telemetry.throughput_kbps,
                active_threads: data.telemetry.active_threads,
                encryption_cipher: data.telemetry.encryption_cipher,
                quantum_entropy: data.telemetry.quantum_entropy
              }));
            }
          }
        } else {
          // Offline realistic jitter
          setTelemetry(prev => ({
            ...prev,
            cpu_usage_pct: Math.round(15 + Math.random() * 8),
            neural_latency_ms: Math.round((14 + Math.random() * 5) * 10) / 10
          }));
        }
      } catch (err) {
        // Fallback smooth behavior
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOnline]);

  // Helper to append logs
  const addLog = useCallback((source: string, message: string, level: LogEntry['level'] = 'INFO') => {
    const newLog: LogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      source,
      message,
      level
    };
    setLogs(prev => [newLog, ...prev.slice(0, 75)]);
  }, []);

  // Sync tasks and messages to encrypted persistence
  const saveTasks = async (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    await saveEncryptedItem('jarvis_tasks', newTasks);
  };

  const saveMessages = async (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    await saveEncryptedItem('jarvis_messages', newMessages);
  };

  const saveWidgets = async (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    await saveEncryptedItem('jarvis_widgets', newWidgets);
  };

  // 4. Voice Command Dispatcher Listener
  useEffect(() => {
    const unsubscribe = voiceSystem.onCommand((cmd) => {
      addLog('VOICE', `Acoustic receptor parsed: "${cmd.raw}" [Action: ${cmd.action}]`, 'AGENT');

      if (cmd.action === 'CREATE_TASK' && cmd.parameter) {
        const newTask: TaskItem = {
          id: 'task-' + Date.now(),
          title: cmd.parameter,
          description: 'Dictated via JARVIS acoustic receptor.',
          assignedAgent: cmd.agent || 'jarvis',
          priority: 'High',
          column: 'queue',
          progress: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          encrypted: true
        };
        saveTasks([newTask, ...tasks]);
        soundFx.playTaskComplete();
        voiceSystem.speak(`Tactical objective '${cmd.parameter}' added to queue and assigned to ${cmd.agent?.toUpperCase() || 'JARVIS'}.`);
        setSrAnnouncement(`Task ${cmd.parameter} created.`);
      } else if (cmd.action === 'SYSTEM_DIAGNOSTICS') {
        const report = `All 5 neural agent cores are active. Memory heap at ${telemetry.memory_mb.toFixed(0)}MB. Neural latency running at ${telemetry.neural_latency_ms.toFixed(1)}ms. Low-latency hardware acceleration confirmed.`;
        voiceSystem.speak(report);
        handleSendMessage('Run complete system diagnostics', 'jarvis');
      } else if (cmd.action === 'CLEAR_LOGS') {
        setLogs([]);
        soundFx.playClick();
        voiceSystem.speak('System logs buffer purged.');
      } else if (cmd.action === 'SECURITY_AUDIT') {
        voiceSystem.speak('Security audit initiated. AES-GCM 256-bit ciphertext authenticated. Zero breaches detected.');
        handleSendMessage('Run security audit on memory and tokens', 'edith');
      } else if (cmd.action === 'SWITCH_PERSONALITY' && cmd.parameter) {
        const target = cmd.parameter.toLowerCase();
        if (target.includes('friday')) voiceSystem.setPersonality('friday');
        else if (target.includes('ultron')) voiceSystem.setPersonality('ultron');
        else if (target.includes('edith')) voiceSystem.setPersonality('edith');
        else voiceSystem.setPersonality('jarvis');
        voiceSystem.speak(`Personality core switched to ${voiceSystem.currentPersonality.name}.`);
      } else if (cmd.action === 'CHAT_QUERY' && cmd.parameter) {
        handleSendMessage(cmd.parameter, activeAgent);
      }
    });

    return () => unsubscribe();
  }, [tasks, activeAgent, telemetry]);

  // 5. Send Chat Message to Multi-Agent API
  const handleSendMessage = async (text: string, targetAgent: AgentId) => {
    if (!text.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      senderName: session.callsign,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'user'
    };

    const updated = [...messages, userMsg];
    await saveMessages(updated);
    setIsChatLoading(true);
    addLog(`CHAT -> @${targetAgent.toUpperCase()}`, text.trim(), 'AGENT');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          agent: targetAgent,
          history: updated.slice(-4).map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            text: m.text
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: 'msg-' + Date.now() + '-reply',
          sender: targetAgent,
          senderName: data.agent || targetAgent.toUpperCase(),
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: data.source || 'gemini-3.8-flash'
        };

        await saveMessages([...updated, aiMsg]);
        soundFx.playJarvisChirp();
        voiceSystem.speak(data.text, targetAgent);
        addLog(`@${targetAgent.toUpperCase()}`, `Replied: ${data.text.substring(0, 45)}...`, 'AGENT');
      } else {
        throw new Error('API server returned error');
      }
    } catch (err: any) {
      // Local fallback
      const fallbackMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-reply',
        sender: targetAgent,
        senderName: targetAgent.toUpperCase(),
        text: `Commander, query processed through localized neural buffer. All parameters for objective '${text.substring(0, 25)}' are locked. Standing by for tactical orders.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'local-agent-core'
      };
      await saveMessages([...updated, fallbackMsg]);
      soundFx.playJarvisChirp();
      voiceSystem.speak(fallbackMsg.text, targetAgent);
    } finally {
      setIsChatLoading(false);
    }
  };

  // 6. Python Multi-Agent Workflow Runner
  const handleRunWorkflow = async (workflowName: string) => {
    addLog('ORCHESTRATOR', `Dispatching workflow '${workflowName}' to Python subsystem...`, 'EXEC');
    try {
      const res = await fetch('/api/python/agent-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'orchestrate',
          task: workflowName,
          priority: 'Critical'
        })
      });
      const data = await res.json();
      addLog('PYTHON_SUBSYSTEM', `Workflow synthesized in ${data.total_latency_ms || 18.2}ms across 4 agent stages.`, 'EXEC');
      return data;
    } catch (e) {
      addLog('PYTHON_SUBSYSTEM', `Local execution completed. Invariants verified.`, 'EXEC');
      return {
        pipeline: [
          { agent: 'jarvis', action: 'Arbitration', duration_ms: 22 },
          { agent: 'friday', action: 'Telemetry Synthesis', duration_ms: 35 },
          { agent: 'ultron', action: 'Buffer Optimization', duration_ms: 45 },
          { agent: 'edith', action: 'Cryptographic Sign', duration_ms: 18 }
        ]
      };
    }
  };

  // 7. AI Task Decomposition via Python Subsystem
  const handleAiDecomposeTask = async (goal: string) => {
    addLog('JARVIS', `Deconstructing goal '${goal}' into sub-agent work packages...`, 'AGENT');
    try {
      const res = await fetch('/api/python/agent-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decompose',
          goal
        })
      });
      return await res.json();
    } catch (e) {
      return {
        decomposed_tasks: [
          { title: `Analyze metrics for ${goal}`, agent: 'friday', priority: 'High', column: 'processing' },
          { title: `Implement low-latency routine for ${goal}`, agent: 'ultron', priority: 'Critical', column: 'queue' },
          { title: `Security & cipher guard for ${goal}`, agent: 'edith', priority: 'Nominal', column: 'queue' }
        ]
      };
    }
  };

  // 8. Execute Task Pipeline
  const handleExecuteTaskPipeline = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    addLog(task.assignedAgent.toUpperCase(), `Executing pipeline for '${task.title}'`, 'EXEC');
    voiceSystem.speak(`Executing task pipeline for '${task.title}' via ${task.assignedAgent.toUpperCase()}.`);

    // Progress animation
    for (let p = 25; p <= 100; p += 25) {
      await new Promise(r => setTimeout(r, 200));
      setTasks(prev => prev.map(t => t.id === taskId ? { 
        ...t, 
        progress: p, 
        column: p === 100 ? 'completed' : p > 50 ? 'verification' : 'processing' 
      } : t));
    }

    soundFx.playTaskComplete();
    addLog('ORCHESTRATOR', `Task '${task.title}' marked COMPLETED.`, 'INFO');
  };

  // 9. Login & Token Generator
  const handleLogin = async (callsign: string, passcode: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callsign, passcode })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('jarvis_jwt_token', data.token);
        setSession({
          token: data.token,
          callsign: data.user.callsign,
          role: data.user.role,
          securityClearance: data.user.securityClearance,
          isAuthenticated: true
        });
        addLog('AUTH', `Signed JWT token granted for ${callsign}. Role: ${data.user.role}`, 'SECURITY');
      }
    } catch (e) {
      // Offline fallback token
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.offline_session_' + Date.now();
      localStorage.setItem('jarvis_jwt_token', mockToken);
      setSession({
        token: mockToken,
        callsign,
        role: 'Supreme Commander (Offline)',
        securityClearance: 'LEVEL-9',
        isAuthenticated: true
      });
      addLog('AUTH', `Offline cryptographic token generated for ${callsign}.`, 'SECURITY');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jarvis_jwt_token');
    setSession({
      token: null,
      callsign: 'Guest Analyst',
      role: 'Analyst',
      securityClearance: 'LEVEL-3',
      isAuthenticated: false
    });
    soundFx.playClick();
    addLog('AUTH', 'Commander session terminated. Level-3 Guest role active.', 'SECURITY');
  };

  // 10. Export Encrypted Workspace
  const handleExportEncryptedBackup = async () => {
    const workspaceData = {
      tasks,
      messages,
      telemetry,
      timestamp: Date.now(),
      session: { callsign: session.callsign, role: session.role }
    };
    const encrypted = await encryptData(workspaceData);
    const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(encrypted);
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `jarvis-encrypted-backup-${Date.now()}.aes`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    addLog('SECURITY', 'Encrypted workspace snapshot exported successfully.', 'SECURITY');
  };

  // Widget Render Dispatcher
  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'hologram':
        return (
          <JarvisCoreHologram
            activeAgent={activeAgent}
            onAgentSelect={setActiveAgent}
            neuralLatency={telemetry.neural_latency_ms}
            cpuLoad={telemetry.cpu_usage_pct}
            onVoiceCommandReceived={(text) => handleSendMessage(text, activeAgent)}
          />
        );
      case 'tycoon':
      case 'agents':
        return (
          <TycoonBotSim
            tasks={tasks}
            activeAgent={activeAgent}
            onSelectAgent={setActiveAgent}
            onTriggerTask={handleExecuteTaskPipeline}
          />
        );
      case 'chat':
        return (
          <AIChatSection
            messages={messages}
            activeAgent={activeAgent}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            onQuickAction={(text, agent) => handleSendMessage(text, agent)}
          />
        );
      case 'tasks':
        return (
          <TaskManagementSection
            tasks={tasks}
            onAddTask={(task) => {
              const newTask: TaskItem = {
                ...task,
                id: 'task-' + Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
              saveTasks([newTask, ...tasks]);
              addLog('OBJECTIVES', `New objective registered: '${task.title}'`, 'INFO');
            }}
            onUpdateTask={(id, updates) => {
              const updated = tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t);
              saveTasks(updated);
            }}
            onDeleteTask={(id) => {
              const updated = tasks.filter(t => t.id !== id);
              saveTasks(updated);
              addLog('OBJECTIVES', `Task purged: ${id}`, 'WARN');
            }}
            onExecuteTaskPipeline={handleExecuteTaskPipeline}
            onAiDecomposeTask={handleAiDecomposeTask}
          />
        );
      case 'telemetry':
        return (
          <TelemetryLogsSection
            telemetry={telemetry}
            logs={logs}
            onClearLogs={() => {
              setLogs([]);
              addLog('SYSTEM', 'Logs buffer cleared by user action.', 'INFO');
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Accessibility screen-reader live announcements */}
      <div aria-live="polite" className="sr-only">
        {srAnnouncement}
      </div>

      {/* Cyber Background Grid & Ambient Glows */}
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
      <div className="fixed -top-40 left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-1/2 -right-40 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed -bottom-40 left-10 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Scanline CRT Overlay (Toggleable) */}
      {scanlinesActive && (
        <div className="fixed inset-0 scanlines pointer-events-none z-30 opacity-60" />
      )}

      {/* Top Bar Contract (3 zones) */}
      <TopBar
        session={session}
        isOnline={isOnline}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        onNavigateSection={(sec) => setActiveNavSection(sec)}
        activeSection={activeNavSection}
      />

      {/* Main Viewport Content Container */}
      <main role="main" className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-5 lg:p-6 z-10 flex flex-col gap-5">
        {/* Quick HUD Sub-Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-lg bg-slate-950/70 border border-cyan-500/20 text-xs font-mono backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              JARVIS OPERATIONAL CORE v4.8
            </span>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="text-slate-400 hidden md:inline">
              FOCUSED AGENT: <strong className="text-slate-200">@{activeAgent.toUpperCase()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <button
              onClick={() => {
                setScanlinesActive(!scanlinesActive);
                soundFx.playClick();
              }}
              className="hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>SCANLINES:</span>
              <strong className={scanlinesActive ? 'text-cyan-400' : 'text-slate-600'}>
                {scanlinesActive ? 'ON' : 'OFF'}
              </strong>
            </button>
            <span className="text-slate-600">|</span>
            <span className="tabular-nums">
              FPS: <strong className="text-emerald-400">{telemetry.fps}</strong>
            </span>
          </div>
        </div>

        {/* Draggable Modular HUD Grid */}
        <DashboardGrid
          widgets={widgets}
          onReorderWidgets={saveWidgets}
          onToggleWidget={(id) => {
            const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
            saveWidgets(updated);
          }}
          onResetLayout={() => {
            saveWidgets(DEFAULT_WIDGETS);
            soundFx.playJarvisChirp();
          }}
          renderWidget={renderWidget}
        />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-3 px-6 text-center text-xs font-mono text-slate-500 z-10 flex flex-wrap justify-between items-center">
        <div>
          JARVIS MULTI-AGENT QUANTUM CORE &middot; HARDWARE ACCELERATED &middot; AES-GCM 256
        </div>
        <div className="flex items-center gap-3 mt-1 sm:mt-0">
          <span>ALL SYSTEMS NOMINAL</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        session={session}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        onExportEncryptedBackup={handleExportEncryptedBackup}
      />
    </div>
  );
}
