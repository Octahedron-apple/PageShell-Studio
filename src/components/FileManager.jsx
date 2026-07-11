import React, { useState } from 'react';

export default function FileManager({ files, onUpload, selectedFiles = [], onToggleSelect }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      onUpload(file);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>📁 Workspace Volume</h2>
      <p style={styles.description}>Persistent browser storage volume shared with Python runtime.</p>
      
      {/* Drag & Drop Ingestion Zone */}
      <div 
        style={{
          ...styles.dropZone,
          borderColor: dragActive ? '#4e9af1' : '#333',
          backgroundColor: dragActive ? 'rgba(78, 154, 241, 0.05)' : '#16161a'
        }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        id="filemanager-dropzone"
      >
        <span style={styles.dropIcon}>📥</span>
        <p style={styles.dropText}>Drag & Drop spreadsheet here</p>
        <span style={styles.dropSubtext}>Writes directly to OPFS workspace</span>
      </div>

      {/* Mounted Files Tree list */}
      <div style={styles.treeSection}>
        <h3 style={styles.subTitle}>Mounted Files ({files.length})</h3>
        {files.length === 0 ? (
          <div style={styles.empty}>
            No files in workspace. Run code to generate template assets or drag spreadsheets here.
          </div>
        ) : (
          <ul style={styles.list}>
            {files.map((file) => (
              <li key={file.path} style={styles.item}>
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.path)}
                  onChange={() => onToggleSelect(file.path)}
                  style={styles.checkbox}
                />
                <span style={styles.fileIcon}>📄</span>
                <span style={styles.fileName}>{file.name}</span>
                <span style={styles.fileType}>
                  {file.name.split('.').pop().toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#121215',
    padding: '20px',
    gap: '16px',
    boxSizing: 'border-box'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#a0aec0',
    margin: 0
  },
  description: {
    fontSize: '12px',
    color: '#718096',
    margin: 0,
    lineHeight: '1.4'
  },
  dropZone: {
    border: '2px dashed #333',
    borderRadius: '8px',
    padding: '24px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  dropIcon: {
    fontSize: '32px'
  },
  dropText: {
    fontSize: '13px',
    fontWeight: '600',
    margin: 0,
    color: '#cbd5e0'
  },
  dropSubtext: {
    fontSize: '11px',
    color: '#718096'
  },
  treeSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto'
  },
  subTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#cbd5e0',
    margin: 0
  },
  empty: {
    fontSize: '12px',
    color: '#718096',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#16161a',
    borderRadius: '6px',
    border: '1px dashed #222228'
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#16161a',
    borderRadius: '6px',
    border: '1px solid #222228',
    fontSize: '13px',
    gap: '8px',
    cursor: 'default',
    boxSizing: 'border-box'
  },
  fileIcon: {
    fontSize: '16px'
  },
  fileName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#e2e8f0'
  },
  fileType: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: '#2d3748',
    color: '#a0aec0',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  checkbox: {
    margin: '0 4px 0 0',
    cursor: 'pointer'
  }
};
