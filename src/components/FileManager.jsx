import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal.jsx';
import { previewZip } from '../utils/zipUtils.js';

const BINARY_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'xlsx', 'xls', 'whl', 'wasm', 'mp4', 'webp'];
const TEXT_EXTS   = ['html', 'css', 'js', 'py', 'json', 'md', 'txt', 'csv'];
const VIEWER_EXTS = ['pdf', 'docx', 'xlsx', 'xls'];

function getIcon(name, isDir) {
  if (isDir) return '📁';
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'html') return '🌐';
  if (ext === 'css')  return '🎨';
  if (ext === 'js')   return '⚡';
  if (ext === 'py')   return '🐍';
  if (ext === 'json') return '📋';
  if (ext === 'md')   return '📝';
  if (ext === 'xlsx' || ext === 'xls') return '📊';
  return '📄';
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
    bgStyle = 'rgba(16, 185, 129, 0.15)'; // Emerald for editor
    borderStyle = '2px solid #10b981';
  } else if (isViewerActive) {
    bgStyle = 'rgba(245, 158, 11, 0.15)'; // Amber for document viewer
    borderStyle = '2px solid #f59e0b';
  } else if (isActive) {
    bgStyle = 'rgba(236, 72, 153, 0.15)'; // Pink for media
    borderStyle = '2px solid #ec4899';
  } else if (isSelected) {
    bgStyle = 'rgba(79, 172, 254, 0.12)'; // Blue for AI context
    borderStyle = '2px solid #4facfe';
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
        className={`flex items-center gap-1.5 px-3 py-1 text-[13px] transition-colors duration-100 select-none min-h-[30px] box-border ${isDir || isEditable ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={isDir ? (open ? 'Collapse' : 'Expand') : node.path}
      >
        <span className="w-2.5 text-[10px] text-[var(--text-muted)] shrink-0 text-center">
          {isDir ? (open ? '▾' : '▸') : ''}
        </span>
        <span className="text-sm shrink-0">{getIcon(node.name, isDir)}</span>
        <span className={`flex-1 truncate ${isDir ? 'text-[#a0aec0]' : isEditable ? 'text-[#e2e8f0]' : 'text-[#718096]'}`}>
          {node.name}
        </span>
        {!isDir && (
          <span className="text-[9px] font-extrabold bg-[var(--bg-surface)] text-[var(--text-muted)] px-1.5 py-0.5 rounded shrink-0 border border-[var(--border-color)]">{node.name.split('.').pop().toUpperCase()}</span>
        )}
        <button
          style={{ opacity: isHovered ? 1 : 0 }}
          className="bg-transparent border-none text-[var(--text-muted)] hover:text-red-500 cursor-pointer ml-1 p-0.5 text-xs transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(node.path); }}
          title={`Delete ${node.name}`}
        >
          🗑️
        </button>
        {onToggleSelect && !isDir && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => { e.stopPropagation(); onToggleSelect && onToggleSelect(node.path); }}
            className="m-0 cursor-pointer accent-[var(--accent-primary)] shrink-0"
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
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">📁 Files</span>
          <div className="flex gap-2">
            {selectedFiles.length > 0 && onBulkActionClick && (
              <button className="bg-transparent border border-[var(--border-color)] text-indigo-400 text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer transition-all duration-150 hover:bg-indigo-400/10" onClick={onBulkActionClick} title="Run Bulk AI Action">✨ Bulk AI</button>
            )}
            {onExportProject && (
              <button className="bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer transition-all duration-150 hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]" onClick={onExportProject} title="Export project to zip">↓ Export</button>
            )}
            {onImportProject && (
              <button className="bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer transition-all duration-150 hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]" onClick={() => importZipRef.current?.click()} title="Import project from zip">↑ Import</button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer transition-all duration-150 hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            onClick={() => uploadRef.current?.click()}
            title="Upload file to workspace"
          >
            ↑ Upload
          </button>
          {onCreateFile && (
            <button
              className="bg-transparent border border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] font-bold px-2.5 py-1 rounded cursor-pointer transition-all duration-150 hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              onClick={() => setIsCreatingFile(true)}
              title="Create new file"
            >
              + New
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
          <div className="flex items-center gap-1.5 px-3 py-1 text-[13px] min-h-[30px] box-border" style={{ paddingLeft: '28px' }}>
            <span className="text-sm shrink-0">📄</span>
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
              className="flex-1 bg-transparent border-b border-[var(--accent-primary)] text-[var(--text-primary)] text-[13px] outline-none m-0 p-0"
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
