import React, { useState, useEffect, useRef } from 'react';
import { searchFiles } from '../services/fs/search.js';

export default function GlobalSearch({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
    } else {
      const res = searchFiles(query);
      setResults(res.slice(0, 20)); // Limit to top 20
    }
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-[rgba(0,0,0,0.5)] flex items-start justify-center pt-[10vh] z-[9999]" onClick={onClose}>
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-app)]">
          <span className="text-sm font-bold text-[var(--text-primary)]">🔍 Global Search</span>
          <button className="bg-transparent border-none text-[var(--text-muted)] cursor-pointer text-base" onClick={onClose}>✕</button>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for text across all files..."
          className="m-3 px-3.5 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] text-sm outline-none"
        />

        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1">
          {query.length > 0 && results.length === 0 && (
            <div className="p-4 text-center text-[var(--text-muted)] text-[13px]">No results found for "{query}"</div>
          )}
          {results.map((result) => (
            <div 
              key={result.id} 
              className="px-3 py-2 rounded cursor-pointer hover:bg-[var(--bg-surface-hover)]"
              onClick={() => {
                onSelect(result.path);
                onClose();
              }}
            >
              <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">{result.path}</div>
              {result.match && (
                <div className="text-[11px] text-[var(--text-muted)] whitespace-nowrap overflow-hidden text-ellipsis">
                  Matches: {Object.keys(result.match).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

