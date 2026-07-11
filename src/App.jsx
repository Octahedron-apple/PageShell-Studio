import React, { useState, useEffect } from 'react';
import { fileSystemAPI } from './services/fs/fileSystem.js';
import { runPython, subscribePythonLogs } from './services/runtimes/pyodide.js';
import { generateCode, subscribeAIStatus } from './services/ai/models.js';
import FileManager from './components/FileManager.jsx';
import Editor from './components/Editor.jsx';
import Terminal from './components/Terminal.jsx';
import AIAssistant from './components/AIAssistant.jsx';
import Preview from './components/Preview.jsx';

export default function App() {
  const [code, setCode] = useState(`import pandas as pd
import numpy as np

print("--- Initializing Python Analysis ---")

try:
    # 1. Try reading the excel sheet natively from OPFS workspace directory
    df = pd.read_excel("data.xlsx")
    print("🚀 Natively loaded 'data.xlsx' from OPFS workspace!")
    print("\\nSummary Statistics:")
    print(df.describe())
    print("\\nFirst 5 rows:")
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

  // 1. Define the View State
  const [viewState, setViewState] = useState('editor'); // 'editor' | 'preview'
  const [previewData, setPreviewData] = useState({ html: '', css: '', js: '' });

  // AI Assistant States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [statusMessage, setStatusMessage] = useState('AI worker offline. Submit a query to trigger model loading.');
  const [aiStreaming, setAiStreaming] = useState(false);

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

    // 3. Subscribe AI Worker status to status banner
    subscribeAIStatus((status) => {
      setStatusMessage(status);
    });
  }, []);

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

  // Drag and Drop Ingestion callback
  const handleUpload = async (file) => {
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
  };

  // File context selection toggler
  const handleToggleFileSelect = (filePath) => {
    setSelectedFiles((prev) =>
      prev.includes(filePath) ? prev.filter((p) => p !== filePath) : [...prev, filePath]
    );
  };

  // Submit query to local WebGPU AI
  const handleQuery = async (queryText) => {
    if (loading || aiStreaming) return;
    setAiStreaming(true);
    setAiLogs((prev) => [...prev, { sender: 'user', text: queryText }]);

    // 1. Ingest File Context dynamically via sliding window
    let contextText = '';
    for (const filePath of selectedFiles) {
      try {
        const filename = filePath.split('/').pop();
        
        // Intercept Excel files for structural analysis via Pyodide
        if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
          setLogs((prev) => [...prev, { type: 'info', text: `Analyzing Excel schema for ${filename}...` }]);
          
          const pythonCode = `
import pandas as pd
import json

def preview_excel():
    try:
        # Bounded read to prevent crashes on massive sheets
        df = pd.read_excel("${filename}", nrows=5)
        
        # Extract column structure and data types
        schema = {str(col): str(dtype) for col, dtype in df.dtypes.items()}
        
        # Format a preview bundle (first 2 rows)
        preview = df.head(2).to_dict(orient='records')
        
        return json.dumps({
            "schema": schema,
            "preview_rows": preview
        }, indent=2)
    except Exception as e:
        return f"[Excel Context Extraction Failed: {str(e)}]"

preview_excel()
          `;
          
          try {
            const result = await runPython(pythonCode);
            contextText += `--- File: ${filename} (Excel Schema Snapshot) ---\n${result}\n\n`;
            setLogs((prev) => [...prev, { type: 'success', text: `Successfully extracted schema for ${filename}` }]);
          } catch (pyErr) {
            contextText += `--- File: ${filename} (Excel Schema Snapshot) ---\n[Excel Context Extraction Failed: ${pyErr.message}]\n\n`;
          }
        } else {
          // Standard text file reading with sliding window
          const content = await fileSystemAPI.readFile(`workspace/${filename}`);
          // Slice text dynamically (keeping the final 1500 characters of context)
          const slicedContent = content.length > 1500 ? content.slice(-1500) : content;
          contextText += `--- File: ${filename} ---\n${slicedContent}\n\n`;
        }
      } catch (err) {
        // If file reading fails (e.g. unknown binary format), add metadata instead
        contextText += `--- File: ${filePath.split('/').pop()} ---\n[Context Extraction Failed: ${err.message}]\n\n`;
      }
    }

    // 2. Assemble prompt template
    const systemPrompt = `You are an offline coding assistant. Here is the relevant file context:\n${contextText}`;

    // 3. Map dialogue history to SmolLM2 messages structure
    const historyMessages = aiLogs
      .filter(log => log.sender === 'user' || log.sender === 'ai')
      .map(log => ({
        role: log.sender === 'user' ? 'user' : 'assistant',
        content: log.text
      }));

    // Keep only the last 6 messages of conversation history to stay within context size
    const cappedHistory = historyMessages.slice(-6);

    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...cappedHistory,
      { role: 'user', content: queryText }
    ];

    // 4. Initialize AI Assistant response log bubble
    setAiLogs((prev) => [...prev, { sender: 'ai', text: '' }]);

    // 5. Fire generation query carrying the full conversation history to AI worker
    generateCode(
      requestMessages,
      (token) => {
        setAiLogs((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.sender === 'ai') {
            next[next.length - 1] = {
              ...last,
              text: last.text + token
            };
          }
          return next;
        });
      },
      (finalOutput) => {
        setAiStreaming(false);
      }
    );
  };

  // Launch preview mode by loading the files from OPFS
  const handlePreview = async () => {
    try {
      // 2. Prepare the File Data
      const html = await fileSystemAPI.readFile('workspace/index.html').catch(() => '');
      const css = await fileSystemAPI.readFile('workspace/styles.css').catch(() => '');
      const js = await fileSystemAPI.readFile('workspace/script.js').catch(() => '');
      
      setPreviewData({ html, css, js });
      setViewState('preview');
    } catch (e) {
      console.error('Failed to prepare preview data', e);
    }
  };

  // 3. Implement Conditional Rendering
  if (viewState === 'preview') {
    return (
      <Preview 
        htmlContent={previewData.html}
        cssContent={previewData.css}
        jsContent={previewData.js}
        onBack={() => setViewState('editor')}
      />
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoArea}>
          <img src={`${import.meta.env.BASE_URL}assets/logo.png`} alt="PageShell Studio" style={styles.logoImage} />
          <h1 style={styles.title}>PageShell Studio</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={handlePreview} style={styles.previewButton}>
            Launch Preview
          </button>
          <div style={styles.badge}>
            <span style={styles.badgeIndicator}></span>
            Offline Container Core Active
          </div>
        </div>
      </header>

      {/* Main Grid: 3-column layout */}
      <div style={styles.mainGrid}>
        
        {/* Left Column: Workspace File Manager */}
        <section style={styles.sidebar}>
          <FileManager 
            files={files} 
            onUpload={handleUpload} 
            selectedFiles={selectedFiles}
            onToggleSelect={handleToggleFileSelect}
          />
        </section>

        {/* Middle Column: Python Editor & Terminal */}
        <section style={styles.editorArea}>
          <div style={styles.editorFlex}>
            <Editor 
              code={code} 
              onChange={setCode} 
              onRun={handleRun} 
              loading={loading} 
            />
          </div>
          <div style={styles.terminalFlex}>
            <Terminal 
              logs={logs} 
              onClear={() => setLogs([])} 
            />
          </div>
        </section>

        {/* Right Column: AI Assistant Chat */}
        <section style={styles.aiArea}>
          <AIAssistant
            selectedFiles={selectedFiles}
            onQuery={handleQuery}
            aiLogs={aiLogs}
            onClearLogs={() => setAiLogs([])}
            statusMessage={statusMessage}
          />
        </section>

      </div>
    </div>
  );
}

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
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    height: '56px',
    boxSizing: 'border-box'
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  logoImage: {
    height: '28px',
    width: 'auto',
    display: 'block',
    borderRadius: '6px'
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
    gridTemplateColumns: '300px 1fr 340px',
    height: 'calc(100vh - 56px)',
    overflow: 'hidden'
  },
  sidebar: {
    backgroundColor: '#121215',
    borderRight: '1px solid #222228',
    height: '100%',
    overflow: 'hidden'
  },
  editorArea: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#18181b',
    overflow: 'hidden'
  },
  editorFlex: {
    flex: 1,
    overflow: 'hidden'
  },
  terminalFlex: {
    height: '240px',
    overflow: 'hidden'
  },
  aiArea: {
    height: '100%',
    overflow: 'hidden'
  },
  previewButton: {
    backgroundColor: '#34495e',
    color: '#fff',
    border: '1px solid #455a64',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'background-color 0.2s',
  }
};
