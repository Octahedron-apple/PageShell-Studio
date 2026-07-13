import React from 'react';

export default function Modal({ isOpen, title, children, onClose, actions }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] m-0">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-[var(--text-muted)] hover:text-red-500 bg-transparent border-none cursor-pointer p-1 transition-colors outline-none"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh] text-[var(--text-secondary)] text-sm">
          {children}
        </div>
        {actions && (
          <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)] flex justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
