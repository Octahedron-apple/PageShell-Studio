import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal.jsx';
import { previewZip } from '../utils/zipUtils.js';

const BINARY_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'xlsx', 'xls', 'whl', 'wasm', 'mp4', 'webp'];
const TEXT_EXTS   = ['html', 'css', 'js', 'py', 'json', 'md', 'txt', 'csv'];
const VIEWER_EXTS = ['pdf', 'docx', 'xlsx', 'xls'];

function getIcon(name, isDir) {
  return null; // Removed as per focus-first typography-led design
}
function canOpenInEditor(name) {
  const ext = name.split('.').pop().toLowerCase();
  return TEXT_EXTS.includes(ext);
}

function canOpenInViewer(name) {
  const ext = name.split('.').pop().toLowerCase();
  return VIEWER_EXTS.includes(ext);
}

function FileNode({ node, depth, onOpenFile, selectedFiles, onToggleSelect, mode, activeFile, onDelete }) {
  const [open, setOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const isDir = node.type === 'directory';

  const handleClick = () => {
    if (isDir) {
      setOpen(o => !o);
    } else if (mode === 'editor' && (canOpenInEditor(node.name) || canOpenInViewer(node.name))) {
      onOpenFile && onOpenFile(node.path);
    }
  };

  const indent = depth * 16;
  const isSelected = !isDir && selectedFiles?.includes(node.path);
  const isEditable = !isDir && (canOpenInEditor(node.name) || canOpenInViewer(node.name));

  const isActive = !isDir && node.path === activeFile;
  const isEditorActive = isActive && canOpenInEditor(node.name);
  const isViewerActive = isActive && canOpenInViewer(node.name);

  let bgStyle = undefined;
  let borderStyle = '2px solid transparent';

  if (isEditorActive) {
    bgStyle = 'rgba(0, 255, 65, 0.1)';
    borderStyle = '1px solid var(--accent-primary)';
  } else if (isViewerActive) {
    bgStyle = 'rgba(0, 255, 65, 0.05)';
    borderStyle = '1px solid var(--accent-primary)';
  } else if (isActive) {
    bgStyle = 'rgba(0, 255, 65, 0.05)';
    borderStyle = '1px solid var(--accent-primary)';
  } else if (isSelected) {
    bgStyle = 'rgba(255, 255, 255, 0.05)';
    borderStyle = '1px solid var(--border-color)';
  }

  return (
    <>
      <div
        style={{
          paddingLeft: `${indent + 12}px`,
          backgroundColor: bgStyle,
          borderLeft: borderStyle,
          opacity: !isDir && !isEditable && mode === 'editor' ? 0.45 : 1,
        }}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm transition-opacity duration-150 select-none min-h-[30px] box-border border-b border-[var(--border-color)] hover:bg-zinc-800/30 group ${isDir || isEditable ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={isDir ? (open ? 'Collapse' : 'Expand') : node.path}
      >
        <span className="w-4 text-xs font-mono text-[var(--text-muted)] shrink-0 text-center">
          {isDir ? (open ? '-' : '+') : ''}
        </span>
        <span className={`flex-1 truncate font-mono tracking-tight transition-colors ${isDir ? 'text-zinc-300 font-semibold' : (isActive || isSelected) ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
          {node.name}
        </span>
        {!isDir && (
          <span className={`text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 shrink-0 ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
            {node.name.split('.').pop()}
          </span>
        )}
        <button
          className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-[var(--text-muted)] hover:text-red-400 cursor-pointer ml-2 p-0.5 text-xs transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(node.path); }}
          title={`Delete ${node.name}`}
        >
          ✕
        </button>
        {onToggleSelect && !isDir && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => { e.stopPropagation(); onToggleSelect && onToggleSelect(node.path); }}
            className="m-0 ml-2 cursor-pointer appearance-none w-3 h-3 border border-[var(--border-color)] checked:bg-[var(--accent-primary)] checked:border-[var(--accent-primary)] shrink-0 transition-colors"
            onClick={e => e.stopPropagation()}
          />
        )}
      </div>
      {isDir && open && node.children && node.children.map(child => (
        <FileNode
          key={child.path}
          node={child}
          depth={depth + 1}
          onOpenFile={onOpenFile}
          selectedFiles={selectedFiles}
          onToggleSelect={onToggleSelect}
          mode={mode}
          activeFile={activeFile}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export default function FileManager({ 
  files = [], 
  activeFile = null,
  onUpload, 
  onCreateFile,
  onExportProject,
  onImportProject,
  selectedFiles = [], 
  onToggleSelect, 
  onOpenFile, 
  onDeleteFile,
  onBulkActionClick,
  mode = 'sidebar' 
}) {
  const uploadRef = useRef(null);
  const importZipRef = useRef(null);
  const newFileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFilesPreview, setImportFilesPreview] = useState([]);
  const [pendingImportFile, setPendingImportFile] = useState(null);

  // files is an array of top-level nodes inside "workspace"
  const nodes = files || [];

  useEffect(() => {
    if (isCreatingFile && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [isCreatingFile]);

  const submitNewFile = () => {
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
    }
    setIsCreatingFile(false);
    setNewFileName('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        onUpload?.(e.dataTransfer.files[i]);
      }
    }
  };

  const handleZipSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const filesList = await previewZip(file);
        setImportFilesPreview(filesList);
        setPendingImportFile(file);
        setImportModalOpen(true);
      } catch (err) {
        console.error("Failed to preview zip", err);
      }
    }
    e.target.value = '';
  };

  const confirmImport = () => {
    if (pendingImportFile) {
      onImportProject?.(pendingImportFile);
    }
    setImportModalOpen(false);
    setPendingImportFile(null);
  };

  return (
    <div 
      className={`flex flex-col h-full bg-[var(--bg-app)] box-border overflow-hidden font-sans`}
      style={{
        backgroundColor: isDragging ? '#1a1a24' : '#0d0d10',
        border: isDragging ? '2px dashed #4facfe' : '2px solid transparent'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 px-4 py-3 bg-[var(--bg-panel)] border-b border-[var(--border-color)] shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono tracking-widest text-[var(--text-secondary)] uppercase">Files</span>
          <div className="flex gap-2">
            {selectedFiles.length > 0 && onBulkActionClick && (
              <button className="bg-transparent border border-[var(--border-color)] text-[var(--accent-primary)] text-xs font-mono px-2 py-1 cursor-pointer transition-opacity hover:opacity-70" onClick={onBulkActionClick} title="Run Bulk AI Action">Bulk AI</button>
            )}
            {onExportProject && (
              <button className="bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-mono px-2 py-1 cursor-pointer transition-opacity hover:opacity-70 hover:text-[var(--text-primary)]" onClick={onExportProject} title="Export project to zip">Export</button>
            )}
            {onImportProject && (
              <button className="bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-mono px-2 py-1 cursor-pointer transition-opacity hover:opacity-70 hover:text-[var(--text-primary)]" onClick={() => importZipRef.current?.click()} title="Import project from zip">Import</button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-mono px-2 py-1 cursor-pointer transition-opacity hover:opacity-70 hover:text-[var(--text-primary)]"
            onClick={() => uploadRef.current?.click()}
            title="Upload file to workspace"
          >
            Upload
          </button>
          {onCreateFile && (
            <button
              className="bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-mono px-2 py-1 cursor-pointer transition-opacity hover:opacity-70 hover:text-[var(--text-primary)]"
              onClick={() => setIsCreatingFile(true)}
              title="Create new file"
            >
              New
            </button>
          )}
        </div>
        <input
          ref={importZipRef}
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={handleZipSelect}
        />
        <input
          ref={uploadRef}
          type="file"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) onUpload?.(e.target.files[0]); e.target.value = ''; }}
        />
      </div>

      <div className="flex-1 overflow-y-auto py-1.5">
        {isCreatingFile && (
          <div className="flex items-center gap-2 px-3 py-1.5 min-h-[30px] box-border border-b border-[var(--border-color)]" style={{ paddingLeft: '28px' }}>
            <span className="w-4 text-xs font-mono text-[var(--accent-primary)] shrink-0 text-center">></span>
            <input
              ref={newFileInputRef}
              type="text"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitNewFile();
                if (e.key === 'Escape') { setIsCreatingFile(false); setNewFileName(''); }
              }}
              onBlur={submitNewFile}
              className="flex-1 bg-transparent border-none text-[var(--text-primary)] font-mono text-sm outline-none m-0 p-0"
              placeholder="filename.ext"
            />
          </div>
        )}
        {nodes.length === 0 && !isCreatingFile ? (
          <div className="px-4 py-6 text-xs text-[var(--text-muted)] text-center leading-relaxed italic">No files yet. Upload or run a script to create files.</div>
        ) : (
          nodes.map(node => (
            <FileNode
              key={node.path}
              node={node}
              depth={0}
              onOpenFile={onOpenFile}
              selectedFiles={selectedFiles}
              onToggleSelect={onToggleSelect}
              mode={mode}
              activeFile={activeFile}
              onDelete={onDeleteFile}
            />
          ))
        )}
      </div>

      {onToggleSelect && (
        <div className="px-3.5 py-2 text-[11px] text-[var(--text-muted)] border-t border-[var(--border-color)] italic shrink-0">
          ☑ Check files to include as AI context
        </div>
      )}

      {/* Zip Import Confirmation Modal */}
      <Modal 
        isOpen={importModalOpen} 
        title="Confirm Workspace Import"
        onClose={() => setImportModalOpen(false)}
        actions={
          <>
            <button 
              onClick={() => setImportModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-[var(--bg-surface-hover)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-panel)] transition-colors border border-[var(--border-color)]"
            >
              Cancel
            </button>
            <button 
              onClick={confirmImport}
              className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-bold hover:opacity-90 transition-opacity border-none"
            >
              Confirm Import
            </button>
          </>
        }
      >
        <p className="mb-4 font-medium text-[var(--text-primary)]">
          Importing this project will merge or overwrite files in your current workspace. The following files will be imported:
        </p>
        <div className="bg-[var(--bg-app)] rounded-lg border border-[var(--border-color)] max-h-48 overflow-y-auto p-3 font-mono text-xs">
          {importFilesPreview.map((path, idx) => (
            <div key={idx} className="mb-1 text-[var(--text-muted)] truncate">{path}</div>
          ))}
          {importFilesPreview.length === 0 && (
            <div className="text-center italic text-zinc-500 py-2">No files found in zip.</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
