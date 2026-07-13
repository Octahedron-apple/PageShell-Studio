import React, { useEffect, useState } from 'react';

export default function MediaViewer({ activeFile, activeMediaUrl }) {

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
        <span className="text-sm">No media selected.</span>
      </div>
    );
  }

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(activeFile.split('.').pop().toLowerCase());

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-panel)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🖼️</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">{activeFile.split('/').pop()}</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-5 overflow-auto bg-[var(--bg-surface)]">
        {activeMediaUrl && isImage ? (
          <img src={activeMediaUrl} alt={activeFile} className="max-w-full max-h-full object-contain shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
            <span className="text-sm">Unsupported media format.</span>
          </div>
        )}
      </div>
    </div>
  );
}

