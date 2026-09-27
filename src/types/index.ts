export type AgentId = 'jarvis' | 'friday' | 'ultron' | 'edith' | 'nebula';

export interface AgentInfo {
  id: AgentId;
  name: string;
  codename: string;
  role: string;
  color: string;
  accentGlow: string;
  status: 'ONLINE' | 'COMPUTING' | 'SYNCING' | 'IDLE';
  currentTask?: string;
  loadPct: number;
  latencyMs: number;
  memoryMb: number;
  capabilities: string[];
}

export type TaskPriority = 'Critical' | 'High' | 'Nominal' | 'Low';
export type TaskColumn = 'queue' | 'processing' | 'verification' | 'completed';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  assignedAgent: AgentId;
  priority: TaskPriority;
  column: TaskColumn;
  subroutines?: string[];
  progress: number;
  createdAt: number;
  updatedAt: number;
  encrypted?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | AgentId;
  senderName: string;
  text: string;
  timestamp: string;
  source?: 'gemini-3.8-flash' | 'local-agent-core' | 'user';
  codeSnippet?: {
    language: string;
    code: string;
  };
  telemetrySnapshot?: {
    latency: number;
    agent: string;
  };
}

export interface TelemetryMetrics {
  cpu_usage_pct: number;
  neural_latency_ms: number;
  memory_mb: number;
  gpu_draw_calls: number;
  throughput_kbps: number;
  active_threads: number;
  encryption_cipher: string;
  quantum_entropy: string;
  fps: number;
}

export type LogLevel = 'INFO' | 'WARN' | 'EXEC' | 'SECURITY' | 'AGENT';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  details?: any;
}

export type WidgetId = 'hologram' | 'tycoon' | 'agents' | 'chat' | 'tasks' | 'telemetry' | 'logs';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  subtitle: string;
  visible: boolean;
  minimized: boolean;
  order: number;
  colSpan?: 1 | 2 | 3;
}

export interface VoicePersonality {
  id: string;
  name: string;
  agentId: AgentId;
  pitch: number;
  rate: number;
  voiceNameHint?: string;
  description: string;
}

export interface UserSession {
  token: string | null;
  callsign: string;
  role: string;
  securityClearance: string;
  isAuthenticated: boolean;
}
