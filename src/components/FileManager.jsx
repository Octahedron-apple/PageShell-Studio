import React from 'react';
import { OTExplorerComp } from 'opfs-tools-explorer';

const BINARY_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'xlsx', 'xls', 'whl', 'wasm', 'mp4', 'webp'];

// mode: 'editor' — clickable file list for opening in editor
// mode: 'ai'     — checkbox list for AI context selection
export default function FileManager({ files, onUpload, selectedFiles = [], onToggleSelect, onOpenFile, mode = 'editor' }) {
  const textFiles = files.filter(f => !BINARY_EXTS.includes(f.name.split('.').pop().toLowerCase()));

  return (
    <div style={styles.container}>
      {/* Native OPFS explorer — create, rename, delete, upload */}
      <div style={styles.explorerWrapper}>
        <OTExplorerComp />
      </div>

      {/* Bottom panel: differs by mode */}
      {mode === 'editor' && textFiles.length > 0 && (
        <div style={styles.bottomPanel}>
          <p style={styles.panelLabel}>📂 Open in Editor</p>
          <ul style={styles.list}>
            {textFiles.map((file) => (
              <li
                key={file.path}
                style={styles.editorItem}
                onClick={() => onOpenFile && onOpenFile(file.path)}
                title={`Open ${file.name}`}
              >
                <span style={styles.fileIcon}>{getIcon(file.name)}</span>
                <span style={styles.fileName}>{file.name}</span>
                <span style={styles.fileType}>{file.name.split('.').pop().toUpperCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === 'ai' && files.length > 0 && (
        <div style={styles.bottomPanel}>
          <p style={styles.panelLabel}>📎 AI Context</p>
          <ul style={styles.list}>
            {files.map((file) => (
              <li key={file.path} style={styles.aiItem}>
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.path)}
                  onChange={() => onToggleSelect(file.path)}
                  style={styles.checkbox}
                />
                <span style={styles.fileName}>{file.name}</span>
                <span style={styles.fileType}>{file.name.split('.').pop().toUpperCase()}</span>
              </li>
            ))}
          </ul>
          <p style={styles.contextHint}>Check files to attach as AI context</p>
        </div>
      )}
    </div>
  );
}

function getIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'html') return '🌐';
  if (ext === 'css')  return '🎨';
  if (ext === 'js')   return '⚡';
  if (ext === 'py')   return '🐍';
  if (ext === 'json') return '📋';
  if (ext === 'md')   return '📝';
  return '📄';
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#121215',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  explorerWrapper: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
    colorScheme: 'light',
    backgroundColor: '#fff',
  },
  bottomPanel: {
    borderTop: '1px solid #222228',
    padding: '10px 12px',
    backgroundColor: '#0d0d10',
    flexShrink: 0,
    maxHeight: '240px',
    overflowY: 'auto',
  },
  panelLabel: {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#4a5568',
    margin: '0 0 6px 0',
  },
  contextHint: {
    fontSize: '10px',
    color: '#4a5568',
    margin: '6px 0 0 0',
    fontStyle: 'italic',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  editorItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#16161a',
    borderRadius: '5px',
    border: '1px solid #222228',
    fontSize: '12px',
    gap: '7px',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'background 0.15s, border-color 0.15s',
  },
  aiItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 10px',
    backgroundColor: '#16161a',
    borderRadius: '5px',
    border: '1px solid #222228',
    fontSize: '12px',
    gap: '7px',
    boxSizing: 'border-box',
  },
  fileIcon: {
    fontSize: '14px',
    flexShrink: 0,
  },
  fileName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#e2e8f0',
  },
  fileType: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: '#2d3748',
    color: '#a0aec0',
    padding: '2px 5px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  checkbox: {
    margin: 0,
    cursor: 'pointer',
    accentColor: '#4facfe',
    flexShrink: 0,
  },
};
