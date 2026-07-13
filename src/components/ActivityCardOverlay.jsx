import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function ActivityCardOverlay() {
  const { activity, setActivity } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval;
    if (activity && activity.status === 'running') {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activity.startTime) / 1000));
      }, 1000);
    } else if (activity && activity.duration) {
      setElapsed(activity.duration);
    }
    return () => clearInterval(interval);
  }, [activity]);

  if (!activity) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--bg-surface)] transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            {activity.status === 'running' && (
              <div className="relative flex items-center justify-center w-6 h-6">
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
              </div>
            )}
            {activity.status === 'success' && <span className="text-emerald-500 text-lg">✅</span>}
            {activity.status === 'error' && <span className="text-red-500 text-lg">❌</span>}
            
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-100">{activity.title}</span>
              <span className="text-xs text-zinc-400">
                {activity.status === 'running' ? `Processing... (${elapsed}s)` : `${activity.status === 'success' ? 'Completed' : 'Failed'} in ${elapsed}s`}
              </span>
            </div>
          </div>
          <button 
            className="text-zinc-500 hover:text-zinc-300 bg-transparent border-none outline-none p-1"
            onClick={(e) => {
              e.stopPropagation();
              setActivity(null);
            }}
          >
            ✕
          </button>
        </div>

        {/* Collapsible Logs */}
        {expanded && activity.logs && activity.logs.length > 0 && (
          <div className="bg-black/40 p-3 max-h-48 overflow-y-auto border-t border-[var(--border-color)] font-mono text-[10px] leading-relaxed flex flex-col gap-1">
            {activity.logs.map((log, i) => {
              let color = 'text-zinc-300';
              if (log.type === 'error' || log.type === 'stderr') color = 'text-red-400';
              if (log.type === 'success') color = 'text-emerald-400';
              if (log.type === 'info') color = 'text-blue-400';
              
              return (
                <div key={i} className={`break-all ${color}`}>
                  <span className="opacity-50 mr-2">[{log.type.toUpperCase()}]</span>
                  {log.text}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
