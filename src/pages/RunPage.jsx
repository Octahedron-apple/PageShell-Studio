import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import Terminal from '../components/Terminal.jsx';

function getExecutableScripts(nodes) {
  let scripts = [];
  for (const node of nodes) {
    if (node.type === 'directory' && node.children) {
      scripts = scripts.concat(getExecutableScripts(node.children));
    } else if (node.type === 'file' && (node.name.endsWith('.py') || node.name.endsWith('.js'))) {
      scripts.push(node.path);
    }
  }
  return scripts;
}

export default function RunPage() {
  const { logs, setLogs, handleRun, handleStop, loading, runTarget, setRunTarget, files } = useApp();
  const scripts = getExecutableScripts(files);

  useEffect(() => {
    if (!runTarget && scripts.length > 0) {
      setRunTarget(scripts[0]);
    }
  }, [scripts, runTarget, setRunTarget]);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-status)] overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3 bg-[var(--bg-panel)] border-b border-[var(--border-color)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">▶️</span>
          <span className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Execution Runner</span>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] rounded px-2.5 py-1.5 text-[13px] outline-none cursor-pointer" 
            value={runTarget || ''} 
            onChange={(e) => setRunTarget(e.target.value)}
            disabled={loading}
          >
            <option value="" disabled>Select a script to run</option>
            {scripts.map(script => (
              <option key={script} value={script}>{script.split('/').pop()}</option>
            ))}
          </select>
          {loading ? (
            <button
              onClick={handleStop}
              className="bg-[var(--color-danger)] text-white shadow-[0_4px_12px_rgba(244,63,94,0.3)] border-none px-[18px] py-2 rounded-md font-bold text-[13px] transition-all duration-300 outline-none cursor-pointer"
              id="stop-page-btn"
            >
              Stop (Shift+F5)
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!runTarget}
              className={`text-[var(--accent-text)] border-none px-[18px] py-2 rounded-md font-bold text-[13px] transition-all duration-300 outline-none ${
                !runTarget
                  ? 'bg-none bg-[var(--bg-panel)] opacity-50 cursor-not-allowed'
                  : 'bg-[var(--accent-primary)] bg-[var(--accent-gradient)] shadow-[0_4px_12px_rgba(79,172,254,0.2)] cursor-pointer'
              }`}
              id="run-page-btn"
            >
              Run (F5)
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <Terminal logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}

