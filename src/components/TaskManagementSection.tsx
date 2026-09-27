import React, { useState } from 'react';
import { 
  Plus, CheckCircle, Clock, ArrowRight, ArrowLeft, Trash2, 
  Sparkles, Filter, Search, Play, ShieldAlert, Cpu, BarChart3, LayoutGrid, Columns 
} from 'lucide-react';
import { TaskItem, TaskColumn, TaskPriority, AgentId } from '../types';
import { soundFx } from '../services/soundFx';
import { voiceSystem } from '../services/voiceController';
import { TaskAnalyticsD3 } from './TaskAnalyticsD3';

interface TaskManagementSectionProps {
  tasks: TaskItem[];
  onAddTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTask: (id: string, updates: Partial<TaskItem>) => void;
  onDeleteTask: (id: string) => void;
  onExecuteTaskPipeline: (taskId: string) => Promise<void>;
  onAiDecomposeTask: (goal: string) => Promise<any>;
}

export const TaskManagementSection: React.FC<TaskManagementSectionProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onExecuteTaskPipeline,
  onAiDecomposeTask
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'pipeline' | 'analytics'>('split');

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAgent, setNewAgent] = useState<AgentId>('jarvis');
  const [newPriority, setNewPriority] = useState<TaskPriority>('High');

  const columns: { id: TaskColumn; label: string; countColor: string }[] = [
    { id: 'queue', label: 'QUEUE // PENDING', countColor: 'text-slate-400' },
    { id: 'processing', label: 'AGENT PROCESSING', countColor: 'text-amber-400' },
    { id: 'verification', label: 'VERIFICATION AUDIT', countColor: 'text-cyan-400' },
    { id: 'completed', label: 'COMPLETED', countColor: 'text-emerald-400' }
  ];

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      description: newDesc.trim(),
      assignedAgent: newAgent,
      priority: newPriority,
      column: 'queue',
      progress: 0,
      encrypted: true
    });

    soundFx.playJarvisChirp();
    voiceSystem.speak(`New tactical task registered: ${newTitle.trim()}. Allocated to ${newAgent.toUpperCase()}.`);

    setNewTitle('');
    setNewDesc('');
    setIsModalOpen(false);
  };

  const handleDecomposeWithAI = async () => {
    if (!newTitle.trim() || isDecomposing) return;
    setIsDecomposing(true);
    soundFx.playBootSweep();

    try {
      const res = await onAiDecomposeTask(newTitle.trim());
      if (res && res.decomposed_tasks && res.decomposed_tasks.length > 0) {
        // Add all subtasks automatically
        res.decomposed_tasks.forEach((st: any) => {
          onAddTask({
            title: st.title,
            description: `Auto-decomposed by JARVIS Core. Subroutines: ${st.subroutines?.join(', ')}`,
            assignedAgent: st.agent as AgentId,
            priority: st.priority as TaskPriority,
            column: st.column || 'queue',
            progress: 10,
            subroutines: st.subroutines,
            encrypted: true
          });
        });
        soundFx.playTaskComplete();
        voiceSystem.speak(`Task successfully decomposed into ${res.decomposed_tasks.length} specialized agent sub-routines.`);
        setIsModalOpen(false);
        setNewTitle('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleMoveColumn = (task: TaskItem, direction: 'forward' | 'backward') => {
    soundFx.playClick();
    const order: TaskColumn[] = ['queue', 'processing', 'verification', 'completed'];
    const currentIndex = order.indexOf(task.column);
    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < order.length) {
      const newColumn = order[nextIndex];
      const newProgress = newColumn === 'completed' ? 100 : newColumn === 'verification' ? 75 : newColumn === 'processing' ? 40 : 0;
      onUpdateTask(task.id, { column: newColumn, progress: newProgress });

      if (newColumn === 'completed') {
        soundFx.playTaskComplete();
      }
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesAgent = filterAgent === 'all' || t.assignedAgent === filterAgent;
    const matchesSearch = !searchQuery || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAgent && matchesSearch;
  });

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'Critical':
        return <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-500/40 px-1.5 py-0.5 rounded">CRITICAL</span>;
      case 'High':
        return <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/40 px-1.5 py-0.5 rounded">HIGH</span>;
      case 'Nominal':
        return <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/40 px-1.5 py-0.5 rounded">NOMINAL</span>;
      default:
        return <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded">LOW</span>;
    }
  };

  const getAgentColor = (agent: AgentId) => {
    switch (agent) {
      case 'jarvis': return 'text-cyan-400 border-cyan-500/30';
      case 'friday': return 'text-emerald-400 border-emerald-500/30';
      case 'ultron': return 'text-amber-400 border-amber-500/30';
      case 'edith': return 'text-rose-400 border-rose-500/30';
      case 'nebula': return 'text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 border border-cyan-500/20 rounded-xl p-4 backdrop-blur-md">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="font-heading font-bold text-slate-100 tracking-wider text-sm uppercase">
            Task Pipeline & Multi-Agent Dispatch
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 tabular-nums">
            {tasks.length} OBJECTIVES
          </span>
        </div>

        {/* Filter, View Switcher and Add Button */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            <button
              onClick={() => {
                setViewMode('split');
                soundFx.playClick();
              }}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'split' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split View: D3 Analytics + Pipeline Board"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setViewMode('pipeline');
                soundFx.playClick();
              }}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'pipeline' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Kanban Pipeline View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setViewMode('analytics');
                soundFx.playClick();
              }}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'analytics' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="D3.js Visualization & Workload Trends"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Agent Filter */}
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="text-xs font-mono bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1 outline-none"
          >
            <option value="all">ALL AGENTS</option>
            <option value="jarvis">JARVIS</option>
            <option value="friday">FRIDAY</option>
            <option value="ultron">ULTRON</option>
            <option value="edith">EDITH</option>
          </select>

          {/* New Task Button */}
          <button
            onClick={() => {
              setIsModalOpen(true);
              soundFx.playClick();
            }}
            className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-tech font-bold text-xs tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW OBJECTIVE</span>
          </button>
        </div>
      </div>

      {/* D3.js Visualization (Displayed in 'split' or 'analytics' mode) */}
      {(viewMode === 'split' || viewMode === 'analytics') && (
        <TaskAnalyticsD3 tasks={tasks} />
      )}

      {/* Kanban / Pipeline Columns Grid (Displayed in 'split' or 'pipeline' mode) */}
      {(viewMode === 'split' || viewMode === 'pipeline') && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 overflow-y-auto pr-1">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(t => t.column === col.id);

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-lg bg-slate-900/40 border border-slate-800/80 p-3 min-h-[160px]"
            >
              {/* Column Title */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-xs font-mono font-bold text-slate-300 tracking-wider">
                  {col.label}
                </span>
                <span className={`text-xs font-mono font-bold ${col.countColor} tabular-nums`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-center">
                    <span className="text-[11px] font-mono text-slate-600">NO OBJECTIVES</span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-medium text-slate-200 line-clamp-2">
                          {task.title}
                        </h4>
                        <button
                          onClick={() => {
                            onDeleteTask(task.id);
                            soundFx.playClick();
                          }}
                          className="text-slate-600 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Purge Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Agent Badge & Priority */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                        <span className={`font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${getAgentColor(task.assignedAgent)}`}>
                          @{task.assignedAgent}
                        </span>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handleMoveColumn(task, 'backward')}
                          disabled={task.column === 'queue'}
                          className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 disabled:opacity-20 text-slate-400 hover:text-slate-200 cursor-pointer disabled:cursor-not-allowed"
                          title="Move Back"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>

                        {/* Execute Multi-Agent Pipeline */}
                        {task.column !== 'completed' && (
                          <button
                            onClick={() => {
                              onExecuteTaskPipeline(task.id);
                              soundFx.playBootSweep();
                            }}
                            className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 cursor-pointer"
                            title="Execute with multi-agent orchestration"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>EXECUTE</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleMoveColumn(task, 'forward')}
                          disabled={task.column === 'completed'}
                          className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 disabled:opacity-20 text-slate-400 hover:text-slate-200 cursor-pointer disabled:cursor-not-allowed"
                          title="Advance Column"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* New Task Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-xl p-5 glow-cyan shadow-2xl">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-4">
              <h3 className="font-heading font-bold text-slate-100 text-sm tracking-wider uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Initialize Tactical Objective</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono cursor-pointer"
              >
                [ESC / CLOSE]
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  OBJECTIVE TITLE
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Optimize neural cache and encrypt telemetry feed"
                  required
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  TACTICAL SPECIFICATION (OPTIONAL)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  placeholder="Additional parameter constraints or subroutine targets..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    ASSIGN AGENT
                  </label>
                  <select
                    value={newAgent}
                    onChange={(e) => setNewAgent(e.target.value as AgentId)}
                    className="w-full bg-slate-900 border border-slate-700 text-cyan-300 rounded px-3 py-2 text-xs font-mono outline-none"
                  >
                    <option value="jarvis">@JARVIS (Core)</option>
                    <option value="friday">@FRIDAY (Intel)</option>
                    <option value="ultron">@ULTRON (Code)</option>
                    <option value="edith">@EDITH (Defense)</option>
                    <option value="nebula">@NEBULA (Stream)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    PRIORITY LEVEL
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-900 border border-slate-700 text-amber-300 rounded px-3 py-2 text-xs font-mono outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Nominal">Nominal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* AI Decomposition Option */}
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-lg flex items-center justify-between">
                <div className="text-[11px] font-mono text-slate-400">
                  <strong className="text-cyan-300 block">AI SUBROUTINE BREAKDOWN</strong>
                  Deconstruct into multiple tasks assigned across agents
                </div>
                <button
                  type="button"
                  onClick={handleDecomposeWithAI}
                  disabled={isDecomposing || !newTitle.trim()}
                  className="px-2.5 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isDecomposing ? 'ANALYZING...' : 'DECOMPOSE'}</span>
                </button>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-tech font-bold text-xs tracking-wider cursor-pointer"
                >
                  CREATE OBJECTIVE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
