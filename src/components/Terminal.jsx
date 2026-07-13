import React, { useEffect, useRef } from 'react';

export default function Terminal({ logs, onClear }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-status)] border-t border-[var(--border-color)] overflow-hidden font-mono">
      <div className="flex justify-between items-center px-4 py-2 bg-[var(--bg-app)] border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">💻</span>
          <span className="tracking-[0.02em]">Terminal Output</span>
        </div>
        <button onClick={onClear} className="bg-transparent text-[var(--text-secondary)] text-[11px] cursor-pointer outline-none transition-colors duration-200 px-2 py-0.5 rounded border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]" id="terminal-clear-btn">
          Clear Logs
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto text-[13px] leading-relaxed flex flex-col gap-1" id="terminal-log-body">
        {logs.length === 0 ? (
          <div className="text-[var(--text-muted)] italic text-xs">Console idle. Press run to compile and execute Python code.</div>
        ) : (
          logs.map((log, index) => {
            let colorClass = 'text-[var(--text-primary)]';
            if (log.type === 'stderr') colorClass = 'text-[var(--color-error)]';
            else if (log.type === 'success') colorClass = 'text-[var(--color-success)]';
            else if (log.type === 'info') colorClass = 'text-[var(--accent-primary)]';
            
            return (
              <div
                key={index}
                className={`break-all whitespace-pre-wrap ${colorClass}`}
              >
                {log.type === 'stdout' && <span className="mr-2 opacity-50 text-[11px] font-bold">[STDOUT]</span>}
                {log.type === 'stderr' && <span className="mr-2 opacity-50 text-[11px] font-bold">[ERROR]</span>}
                {log.type === 'info' && <span className="mr-2 opacity-50 text-[11px] font-bold">[SYSTEM]</span>}
                {log.type === 'success' && <span className="mr-2 opacity-50 text-[11px] font-bold">[SUCCESS]</span>}
                {log.text}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}

