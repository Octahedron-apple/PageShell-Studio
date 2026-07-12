import React from 'react';
import { OTExplorerComp } from 'opfs-tools-explorer';

export default function FileManager({ files, onUpload, selectedFiles = [], onToggleSelect, onOpenFile }) {
  return (
    <div style={styles.container}>
      {/* OPFS Explorer — renders the full file management panel in-place */}
      <div style={styles.explorerWrapper}>
        <OTExplorerComp />
      </div>

      {/* AI Context Picker — shown below so files can still be wired to AI */}
      {files.length > 0 && (
        <div style={styles.contextSection}>
          <p style={styles.contextLabel}>📎 AI Context</p>
          <ul style={styles.list}>
            {files.map((file) => (
              <li key={file.path} style={styles.item}>
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.path)}
                  onChange={() => onToggleSelect(file.path)}
                  style={styles.checkbox}
                />
                <span
                  style={styles.fileName}
                  onClick={() => onOpenFile && onOpenFile(file.path)}
                  title="Click to open in Editor"
                >
                  {file.name}
                </span>
                <span style={styles.fileType}>
                  {file.name.split('.').pop().toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
          <p style={styles.contextHint}>Check files to attach as AI context</p>
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
    backgroundColor: '#121215',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  explorerWrapper: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
  },
  contextSection: {
    borderTop: '1px solid #222228',
    padding: '12px 14px',
    backgroundColor: '#0d0d10',
    flexShrink: 0,
    maxHeight: '260px',
    overflowY: 'auto',
  },
  contextLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#718096',
    margin: '0 0 8px 0',
  },
  contextHint: {
    fontSize: '10px',
    color: '#4a5568',
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#16161a',
    borderRadius: '5px',
    border: '1px solid #222228',
    fontSize: '12px',
    gap: '7px',
    boxSizing: 'border-box',
  },
  checkbox: {
    margin: 0,
    cursor: 'pointer',
    accentColor: '#4facfe',
  },
  fileName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  fileType: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: '#2d3748',
    color: '#a0aec0',
    padding: '2px 5px',
    borderRadius: '3px',
  },
};
