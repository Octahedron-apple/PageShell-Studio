import React, { useState, useEffect, useRef } from 'react';
import { fileSystemAPI } from './services/fs/fileSystem.js';
import { runPython, subscribePythonLogs } from './services/runtimes/pyodide.js';

export default function App() {
  const [code, setCode] = useState(`import pandas as pd
import numpy as np

print("--- Initializing Python Analysis ---")

try:
    # 1. Try reading the excel sheet natively from OPFS workspace directory
    df = pd.read_excel("data.xlsx")
    print("🚀 Natively loaded 'data.xlsx' from OPFS workspace!")
    print("\nSummary Statistics:")
    print(df.describe())
    print("\nFirst 5 rows:")
    print(df.head())
except Exception as e:
    print("⚠️ 'data.xlsx' not found. Creating a template data.xlsx for you...")
    
    # 2. Generate a mock Pandas DataFrame
    df = pd.DataFrame({
        "Employee": ["Alice Smith", "Bob Jones", "Charlie Brown", "Diana Prince", "Evan Wright"],
        "Department": ["Engineering", "Product", "Engineering", "Design", "Product"],
        "Salary": [85000, 92000, 78000, 88000, 95000],
        "Performance_Score": [4.8, 4.2, 4.5, 4.9, 4.0]
    })
    
    # 3. Save it natively to the workspace directory
    df.to_excel("data.xlsx", index=False)
    print("💾 Successfully saved template data.xlsx to OPFS workspace!")
    print("Re-run the script to perform automated excel sheet reading!")
`);

  const [logs, setLogs] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const terminalEndRef = useRef(null);

  // Load directory tree from OPFS
  const refreshFiles = async () => {
    try {
      const tree = await fileSystemAPI.getDirectoryTree();
      // Locate the workspace node
      const workspaceNode = tree.find(node => node.name === 'workspace');
      if (workspaceNode && workspaceNode.children) {
        setFiles(workspaceNode.children);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Failed to fetch OPFS file tree:", err);
    }
  };

  useEffect(() => {
    // 1. Initial file load
    refreshFiles();

    // 2. Subscribe Pyodide worker logs to the UI terminal
    subscribePythonLogs((log) => {
      setLogs((prev) => [...prev, { type: log.type, text: log.text }]);
    });
  }, []);

  // Auto-scroll terminal logs to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Execute Code
  const handleRun = async () => {
    setLoading(true);
    setLogs((prev) => [...prev, { type: 'info', text: 'Executing script in Pyodide sandbox...' }]);
    try {
      const result = await runPython(code);
      if (result !== undefined) {
        setLogs((prev) => [...prev, { type: 'success', text: `Execution completed. Return: ${JSON.stringify(result)}` }]);
      }
      refreshFiles(); // Refresh files since Python might write new files (e.g. data.xlsx)
    } catch (err) {
      setLogs((prev) => [...prev, { type: 'stderr', text: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop Ingestion
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
      setLogs((prev) => [...prev, { type: 'info', text: `Reading file ${file.name}...` }]);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);

          // Save directly into workspace/ folder inside OPFS
          const savePath = `workspace/${file.name}`;
          await fileSystemAPI.writeFile(savePath, uint8Array);

          setLogs((prev) => [...prev, { type: 'success', text: `Synchronized ${file.name} to OPFS workspace successfully.` }]);
          refreshFiles();
        } catch (err) {
          setLogs((prev) => [...prev, { type: 'stderr', text: `Failed to write file to OPFS: ${err.message}` }]);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Delete file from workspace
  const handleDeleteFile = async (filePath) => {
    try {
      // In the OPFS manager, we delete by overwriting or deleting
      // Since fs.worker.js has no explicit DELETE action, we can write an empty file or update tree
      // Wait, let's keep it simple. If we want to add file deletion, we can do it, but refreshing works.
      setLogs((prev) => [...prev, { type: 'info', text: `Deleting files is not yet exposed via FS broker, but you can overwrite it.` }]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoArea}>
          <span style={styles.logoIcon}>🔮</span>
          <h1 style={styles.title}>PageShell Studio</h1>
        </div>
        <div style={styles.badge}>
          <span style={styles.badgeIndicator}></span>
          Offline Pyodide + OPFS Active
        </div>
      </header>

      {/* Main Grid */}
      <div style={styles.mainGrid}>
        
        {/* Left Column: Workspace File Manager */}
        <section style={styles.sidebar}>
          <h2 style={styles.sectionTitle}>📁 Workspace Volume</h2>
          <p style={styles.description}>Persistent browser storage volume shared with Python runtime.</p>
          
          {/* Drag Ingestion Zone */}
          <div 
            style={{
              ...styles.dropZone,
              borderColor: dragActive ? '#4e9af1' : '#444',
              backgroundColor: dragActive ? 'rgba(78, 154, 241, 0.05)' : '#1e1e1e'
            }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <span style={styles.dropZoneIcon}>📥</span>
            <p style={styles.dropZoneText}>Drag & Drop Excel/CSV spreadsheet here</p>
            <span style={styles.dropZoneSubtext}>Writes directly to OPFS workspace</span>
          </div>

          {/* Active File Tree */}
          <div style={styles.fileTree}>
            <h3 style={styles.subTitle}>Mounted Files ({files.length})</h3>
            {files.length === 0 ? (
              <div style={styles.emptyFiles}>No files in workspace. Run script to create template files or drag files here.</div>
            ) : (
              <ul style={styles.fileList}>
                {files.map(f => (
                  <li key={f.path} style={styles.fileItem}>
                    <span style={styles.fileIcon}>📄</span>
                    <span style={styles.fileName}>{f.name}</span>
                    <span style={styles.fileType}>{f.name.split('.').pop().toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right Column: Code Editor & Terminal */}
        <section style={styles.editorArea}>
          {/* Editor Controls */}
          <div style={styles.editorHeader}>
            <h2 style={styles.sectionTitle}>🐍 Code Editor</h2>
            <button 
              onClick={handleRun} 
              disabled={loading} 
              style={{
                ...styles.runButton,
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Running...' : 'Run Analysis (F5)'}
            </button>
          </div>

          {/* Textarea Code Editor */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={styles.editor}
            spellCheck="false"
          />

          {/* Terminal Console Log */}
          <div style={styles.terminalContainer}>
            <div style={styles.terminalHeader}>
              <span>💻 Interactive Terminal Console</span>
              <button onClick={() => setLogs([])} style={styles.clearButton}>Clear Logs</button>
            </div>
            <div style={styles.terminalBody}>
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  style={{
                    ...styles.terminalLine,
                    color: log.type === 'stderr' ? '#ff6b6b' : 
                           log.type === 'success' ? '#2ecc71' : 
                           log.type === 'info' ? '#3498db' : '#ecf0f1'
                  }}
                >
                  {log.type === 'stdout' && <span style={styles.logPrefix}>[STDOUT]</span>}
                  {log.type === 'stderr' && <span style={styles.logPrefix}>[ERROR]</span>}
                  {log.type === 'info' && <span style={styles.logPrefix}>[SYSTEM]</span>}
                  {log.type === 'success' && <span style={styles.logPrefix}>[SUCCESS]</span>}
                  {log.text}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

// Inlined high-performance CSS styles matching Design Aesthetics guidelines
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0f0f11',
    color: '#e2e8f0',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#16161a',
    borderBottom: '1px solid #222228',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  logoIcon: {
    fontSize: '24px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    color: '#2ecc71',
    padding: '6px 12px',
    borderRadius: '12px',
    border: '1px solid rgba(46, 204, 113, 0.2)'
  },
  badgeIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#2ecc71',
    boxShadow: '0 0 8px #2ecc71'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    backgroundColor: '#121215',
    borderRight: '1px solid #222228',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto'
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
    border: '2px dashed #444',
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
  dropZoneIcon: {
    fontSize: '32px'
  },
  dropZoneText: {
    fontSize: '13px',
    fontWeight: '600',
    margin: 0,
    color: '#cbd5e0'
  },
  dropZoneSubtext: {
    fontSize: '11px',
    color: '#718096'
  },
  fileTree: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  subTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#cbd5e0',
    margin: 0
  },
  emptyFiles: {
    fontSize: '12px',
    color: '#718096',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#16161a',
    borderRadius: '6px',
    border: '1px dashed #222'
  },
  fileList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#16161a',
    borderRadius: '6px',
    border: '1px solid #222228',
    fontSize: '13px',
    gap: '8px',
    transition: 'background-color 0.2s',
    cursor: 'default'
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
  editorArea: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#18181b',
    overflow: 'hidden'
  },
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#121215',
    borderBottom: '1px solid #222228'
  },
  runButton: {
    backgroundColor: '#4facfe',
    backgroundImage: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(79, 172, 254, 0.2)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    outline: 'none'
  },
  editor: {
    flex: 1,
    backgroundColor: '#1a1a1e',
    color: '#cbd5e0',
    border: 'none',
    padding: '20px',
    fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none',
    borderBottom: '1px solid #222228'
  },
  terminalContainer: {
    height: '240px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0c0c0e',
    borderTop: '1px solid #222228'
  },
  terminalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#121215',
    borderBottom: '1px solid #1a1a20',
    fontSize: '12px',
    fontWeight: '700',
    color: '#718096'
  },
  clearButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#a0aec0',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
    '&:hover': {
      color: '#fff'
    }
  },
  terminalBody: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
    fontSize: '13px',
    lineHeight: '1.5',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  terminalLine: {
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap'
  },
  logPrefix: {
    marginRight: '8px',
    opacity: 0.5,
    fontSize: '11px',
    fontWeight: '700'
  }
};
