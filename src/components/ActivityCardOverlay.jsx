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
      <div className="bg-[var(--bg-panel)]/90 backdrop-blur-md border border-[var(--border-color)] rounded-sm shadow-2xl overflow-hidden flex flex-col transition-all relative">
        {/* Top-anchored minimalist progress bar */}
        {activity.status === 'running' && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-800/50">
            <div className="h-full bg-[var(--accent-primary)] w-full origin-left animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" style={{
              animation: 'progress-indeterminate 1.5s ease-in-out infinite'
            }}/>
            <style>{`
              @keyframes progress-indeterminate {
                0% { transform: scaleX(0); transform-origin: left; }
                50% { transform: scaleX(1); transform-origin: left; }
                50.1% { transform: scaleX(1); transform-origin: right; }
                100% { transform: scaleX(0); transform-origin: right; }
              }
            `}</style>
          </div>
        )}
        
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            {activity.status === 'success' && <span className="text-[var(--color-success)] text-sm">✓</span>}
            {activity.status === 'error' && <span className="text-[var(--color-error)] text-sm">✕</span>}
            {activity.status === 'running' && <span className="text-[var(--accent-primary)] text-sm opacity-70">⚡</span>}
            
            <div className="flex flex-col">
              <span className="text-sm font-mono font-bold tracking-tight text-white uppercase">{activity.title}</span>
              <span className="text-xs font-mono text-zinc-500 tracking-wider">
                {activity.status === 'running' ? `RUNNING [${elapsed}S]` : `${activity.status === 'success' ? 'DONE' : 'FAIL'} [${elapsed}S]`}
              </span>
            </div>
          </div>
          <button 
            className="text-zinc-600 hover:text-white bg-transparent border-none outline-none p-1 transition-colors"
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
          <div className="bg-black/50 p-4 max-h-48 overflow-y-auto border-t border-[var(--border-color)] font-mono text-[10px] leading-loose flex flex-col">
            {activity.logs.map((log, i) => {
              let color = 'text-zinc-400';
              if (log.type === 'error' || log.type === 'stderr') color = 'text-[var(--color-error)]';
              if (log.type === 'success') color = 'text-[var(--color-success)]';
              if (log.type === 'info') color = 'text-[var(--accent-primary)]';
              
              return (
                <div key={i} className={`break-all ${color}`}>
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
