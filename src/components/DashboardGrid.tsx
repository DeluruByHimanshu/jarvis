import React, { useState } from 'react';
import { 
  GripVertical, Maximize2, Minimize2, Eye, EyeOff, 
  RotateCcw, Sliders, X 
} from 'lucide-react';
import { WidgetConfig, WidgetId } from '../types';
import { soundFx } from '../services/soundFx';

interface DashboardGridProps {
  widgets: WidgetConfig[];
  onReorderWidgets: (newWidgets: WidgetConfig[]) => void;
  onToggleWidget: (id: WidgetId) => void;
  onResetLayout: () => void;
  renderWidget: (id: WidgetId) => React.ReactNode;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  onReorderWidgets,
  onToggleWidget,
  onResetLayout,
  renderWidget
}) => {
  const [draggedWidgetId, setDraggedWidgetId] = useState<WidgetId | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<WidgetId | null>(null);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState<WidgetId | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const handleDragStart = (id: WidgetId) => {
    setDraggedWidgetId(id);
    soundFx.playClick();
  };

  const handleDragOver = (e: React.DragEvent, id: WidgetId) => {
    e.preventDefault();
    if (draggedWidgetId && draggedWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDrop = (targetId: WidgetId) => {
    if (!draggedWidgetId || draggedWidgetId === targetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    soundFx.playJarvisChirp();
    const currentWidgets = [...widgets];
    const sourceIndex = currentWidgets.findIndex(w => w.id === draggedWidgetId);
    const targetIndex = currentWidgets.findIndex(w => w.id === targetId);

    if (sourceIndex >= 0 && targetIndex >= 0) {
      const [removed] = currentWidgets.splice(sourceIndex, 1);
      currentWidgets.splice(targetIndex, 0, removed);
      // Re-assign order numbers
      const updated = currentWidgets.map((w, index) => ({ ...w, order: index }));
      onReorderWidgets(updated);
    }

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleToggleFullscreen = (id: WidgetId) => {
    soundFx.playClick();
    if (fullscreenWidgetId === id) {
      setFullscreenWidgetId(null);
    } else {
      setFullscreenWidgetId(id);
    }
  };

  // Sorted and visible widgets
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Workspace Customizer Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <GripVertical className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">WORKSPACE MATRIX:</span>
          <span className="text-slate-200">DRAG TO REORDER WIDGETS</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowCustomizeModal(true);
              soundFx.playClick();
            }}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>CUSTOMIZE HUD</span>
          </button>

          <button
            onClick={() => {
              onResetLayout();
              soundFx.playClick();
            }}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            title="Reset HUD layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid Container */}
      {fullscreenWidgetId ? (
        // Fullscreen Widget View
        <div className="w-full relative min-h-[75vh]">
          <div className="absolute top-3 right-3 z-30">
            <button
              onClick={() => handleToggleFullscreen(fullscreenWidgetId)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-400 text-cyan-300 font-mono text-xs flex items-center gap-1.5 shadow-xl hover:bg-slate-800 cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>EXIT FULLSCREEN</span>
            </button>
          </div>
          <div className="w-full h-full">
            {renderWidget(fullscreenWidgetId)}
          </div>
        </div>
      ) : (
        // Standard Responsive Modular Grid
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {sortedWidgets.filter(w => w.visible).map((widget) => {
            const isDragged = draggedWidgetId === widget.id;
            const isTarget = dragOverWidgetId === widget.id;

            // Compute responsive span
            let colSpanClass = 'xl:col-span-6';
            if (widget.id === 'hologram') {
              colSpanClass = 'xl:col-span-5';
            } else if (widget.id === 'tycoon' || widget.id === 'agents') {
              colSpanClass = 'xl:col-span-7';
            } else if (widget.id === 'chat') {
              colSpanClass = 'xl:col-span-6';
            } else if (widget.id === 'tasks') {
              colSpanClass = 'xl:col-span-6';
            } else if (widget.id === 'telemetry' || widget.id === 'logs') {
              colSpanClass = 'xl:col-span-12';
            }

            return (
              <div
                key={widget.id}
                draggable
                onDragStart={() => handleDragStart(widget.id)}
                onDragOver={(e) => handleDragOver(e, widget.id)}
                onDragLeave={() => setDragOverWidgetId(null)}
                onDrop={() => handleDrop(widget.id)}
                className={`flex flex-col transition-all duration-200 relative ${colSpanClass} ${
                  isDragged ? 'opacity-40 scale-[0.98]' : 'opacity-100'
                } ${isTarget ? 'border-2 border-cyan-400 rounded-xl glow-cyan' : ''}`}
              >
                {/* Widget Drag Handle & Controls */}
                <div className="flex items-center justify-between px-2 py-1 mb-1 text-[11px] font-mono text-slate-500">
                  <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:text-cyan-300 select-none">
                    <GripVertical className="w-3.5 h-3.5 text-cyan-500/60" />
                    <span className="font-semibold text-slate-400 uppercase">{widget.title}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleFullscreen(widget.id)}
                      className="p-1 hover:text-cyan-300 text-slate-500 transition-colors cursor-pointer"
                      title="Expand Widget"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onToggleWidget(widget.id)}
                      className="p-1 hover:text-rose-400 text-slate-500 transition-colors cursor-pointer"
                      title="Hide Widget"
                    >
                      <EyeOff className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Render the inner widget component */}
                <div className="flex-1">
                  {renderWidget(widget.id)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customize HUD Modal */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-xl p-5 glow-cyan shadow-2xl">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3 mb-4">
              <h3 className="font-heading font-bold text-slate-100 text-sm tracking-wider uppercase flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Customize HUD Matrix Modules</span>
              </h3>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 font-mono">
              Toggle widget visibility or reset layout parameters:
            </p>

            <div className="space-y-2 mb-4">
              {widgets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    {w.title}
                  </span>
                  <button
                    onClick={() => {
                      onToggleWidget(w.id);
                      soundFx.playClick();
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                      w.visible
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {w.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{w.visible ? 'VISIBLE' : 'HIDDEN'}</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  onResetLayout();
                  soundFx.playJarvisChirp();
                }}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Defaults</span>
              </button>

              <button
                onClick={() => setShowCustomizeModal(false)}
                className="px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-tech font-bold text-xs tracking-wider cursor-pointer"
              >
                APPLY & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
