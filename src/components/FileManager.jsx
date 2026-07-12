import React, { useState, useRef } from 'react';

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

function FileNode({ node, depth, onOpenFile, selectedFiles, onToggleSelect, mode }) {
  const [open, setOpen] = useState(true);
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

  return (
    <>
      <div
        style={{
          ...styles.row,
          paddingLeft: `${indent + 12}px`,
          cursor: isDir ? 'pointer' : isEditable ? 'pointer' : 'default',
          backgroundColor: isSelected ? 'rgba(79, 172, 254, 0.12)' : undefined,
          borderLeft: isSelected ? '2px solid #4facfe' : '2px solid transparent',
          opacity: !isDir && !isEditable && mode === 'editor' ? 0.45 : 1,
        }}
        onClick={handleClick}
        title={isDir ? (open ? 'Collapse' : 'Expand') : node.path}
      >
        <span style={styles.arrow}>
          {isDir ? (open ? '▾' : '▸') : ''}
        </span>
        <span style={styles.icon}>{getIcon(node.name, isDir)}</span>
        <span style={{ ...styles.name, color: isDir ? '#a0aec0' : isEditable ? '#e2e8f0' : '#718096' }}>
          {node.name}
        </span>
        {!isDir && (
          <span style={styles.badge}>{node.name.split('.').pop().toUpperCase()}</span>
        )}
        {onToggleSelect && !isDir && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => { e.stopPropagation(); onToggleSelect && onToggleSelect(node.path); }}
            style={styles.checkbox}
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
        />
      ))}
    </>
  );
}

export default function FileManager({ files, onUpload, selectedFiles = [], onToggleSelect, onOpenFile, mode = 'editor' }) {
  const uploadRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // files is an array of top-level nodes inside "workspace"
  const nodes = files || [];

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

  return (
    <div 
      style={{
        ...styles.container,
        backgroundColor: isDragging ? '#1a1a24' : '#0d0d10',
        border: isDragging ? '2px dashed #4facfe' : '2px solid transparent'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>📁 Files</span>
        <button
          style={styles.uploadBtn}
          onClick={() => uploadRef.current?.click()}
          title="Upload file to workspace"
        >
          ↑ Upload
        </button>
        <input
          ref={uploadRef}
          type="file"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) onUpload?.(e.target.files[0]); e.target.value = ''; }}
        />
      </div>

      {/* Tree */}
      <div style={styles.tree}>
        {nodes.length === 0 ? (
          <div style={styles.empty}>No files yet. Upload or run a script to create files.</div>
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
            />
          ))
        )}
      </div>

      {onToggleSelect && (
        <div style={styles.contextHint}>
          ☑ Check files to include as AI context
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0d0d10',
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid #1a1a22',
    backgroundColor: '#121215',
    gap: '8px',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#718096',
  },
  uploadBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #2d3748',
    color: '#a0aec0',
    fontSize: '11px',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tree: {
    flex: 1,
    overflowY: 'auto',
    padding: '6px 0',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    fontSize: '13px',
    transition: 'background 0.1s',
    userSelect: 'none',
    minHeight: '30px',
    boxSizing: 'border-box',
  },
  arrow: {
    width: '10px',
    fontSize: '10px',
    color: '#4a5568',
    flexShrink: 0,
    textAlign: 'center',
  },
  icon: {
    fontSize: '14px',
    flexShrink: 0,
  },
  name: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: '#1a1a2a',
    color: '#4a5568',
    padding: '2px 5px',
    borderRadius: '3px',
    flexShrink: 0,
    border: '1px solid #2d3748',
  },
  checkbox: {
    margin: 0,
    cursor: 'pointer',
    accentColor: '#4facfe',
    flexShrink: 0,
  },
  empty: {
    padding: '24px 16px',
    fontSize: '12px',
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: '1.6',
    fontStyle: 'italic',
  },
  contextHint: {
    padding: '8px 14px',
    fontSize: '11px',
    color: '#4a5568',
    borderTop: '1px solid #1a1a22',
    fontStyle: 'italic',
    flexShrink: 0,
  },
};
