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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-start justify-center pt-[15vh] z-[9999]" onClick={onClose}>
      <div className="bg-[var(--bg-panel)] rounded-sm w-[640px] max-w-[90vw] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-800" onClick={e => e.stopPropagation()}>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search files..."
          className="w-full px-6 py-5 bg-transparent text-[var(--text-primary)] text-2xl outline-none placeholder:text-zinc-600 border-b border-zinc-800 focus:ring-0"
        />

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {query.length > 0 && results.length === 0 && (
            <div className="p-6 text-center text-[var(--text-muted)] text-sm">No results found for "{query}"</div>
          )}
          {results.map((result, idx) => (
            <div 
              key={result.id} 
              className={`px-4 py-3 rounded-sm cursor-pointer transition-opacity text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 flex items-center justify-between ${idx === 0 ? 'bg-zinc-800/30 text-zinc-200' : ''}`}
              onClick={() => {
                onSelect(result.path);
                onClose();
              }}
            >
              <div className="text-sm font-medium">{result.path}</div>
              {result.match && (
                <div className="text-xs text-zinc-500 max-w-[50%] truncate">
                  {Object.keys(result.match).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

