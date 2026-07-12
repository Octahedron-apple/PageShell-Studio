import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fileSystemAPI } from '../services/fs/fileSystem.js';
import { runPython, subscribePythonLogs } from '../services/runtimes/pyodide.js';
import { runJS } from '../services/runtimes/quickjs.js';
import { generateCode, subscribeAIStatus } from '../services/ai/models.js';
import localforage from 'localforage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // --- Navigation State ---
  const [currentPage, setCurrentPage] = useState('editor');

  // --- Editor State ---
  const [code, setCode] = useState('');
  const [activeFile, setActiveFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runTarget, setRunTarget] = useState(null);

  useEffect(() => {
    if (activeFile && (activeFile.endsWith('.py') || activeFile.endsWith('.js'))) {
      setRunTarget(activeFile);
    }
  }, [activeFile]);

  // --- File System State ---
  const [files, setFiles] = useState([]);

  // --- Terminal Logs ---
  const [logs, setLogs] = useState([]);

  // --- AI State ---
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [statusMessage, setStatusMessage] = useState('AI worker offline. Submit a query to trigger model loading.');
  const [aiStreaming, setAiStreaming] = useState(false);

  // --- File System Helpers ---
  const refreshFiles = async () => {
    try {
      const tree = await fileSystemAPI.getDirectoryTree();
      const workspaceNode = tree.find(node => node.name === 'workspace');
      setFiles(workspaceNode?.children ?? []);
    } catch (err) {
      console.error('Failed to fetch OPFS file tree:', err);
    }
  };

  const initializeDefaultWebFiles = async () => {
    try {
      await fileSystemAPI.readFile('workspace/index.html');
    } catch {
      const encoder = new TextEncoder();
      await fileSystemAPI.writeFile('workspace/index.html', encoder.encode(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PageShell Studio</title>
</head>
<body>
    <div class="container">
        <h1>Welcome to PageShell Studio</h1>
        <p>Your live, offline web development environment.</p>
        <button id="clickMe">Click Me</button>
    </div>
</body>
</html>`));
      await fileSystemAPI.writeFile('workspace/styles.css', encoder.encode(`body {
    background-color: #f0f4f8;
    color: #333;
    font-family: 'Inter', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
}
.container {
    background: white;
    padding: 2rem 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    text-align: center;
}
h1 { color: #4facfe; margin-top: 0; }
button {
    background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    margin-top: 1rem;
}`));
      await fileSystemAPI.writeFile('workspace/script.js', encoder.encode(`document.getElementById('clickMe').addEventListener('click', () => {
    alert('Hello from PageShell Studio!');
});`));
      await fileSystemAPI.writeFile('workspace/Python scripts/main.py', encoder.encode(`import pandas as pd
import numpy as np

print("--- Initializing Python Analysis ---")

try:
    df = pd.read_excel("data.xlsx")
    print("🚀 Natively loaded 'data.xlsx' from OPFS workspace!")
    print("\\nSummary Statistics:")
    print(df.describe())
    print("\\nFirst 5 rows:")
    print(df.head())
except Exception as e:
    print("⚠️ 'data.xlsx' not found. Creating a template data.xlsx for you...")
    df = pd.DataFrame({
        "Employee": ["Alice Smith", "Bob Jones", "Charlie Brown", "Diana Prince", "Evan Wright"],
        "Department": ["Engineering", "Product", "Engineering", "Design", "Product"],
        "Salary": [85000, 92000, 78000, 88000, 95000],
        "Performance_Score": [4.8, 4.2, 4.5, 4.9, 4.0]
    })
    df.to_excel("data.xlsx", index=False)
    print("💾 Successfully saved template data.xlsx to OPFS workspace!")
    print("Re-run the script to perform automated excel sheet reading!")
`));
      await refreshFiles();
    }
  };

  // --- Actions ---
  const handleRun = async () => {
    setLoading(true);

    if (!runTarget) {
      setLogs(prev => [...prev, { type: 'stderr', text: 'No script selected to run.' }]);
      setLoading(false);
      return;
    }

    const isPy = runTarget.endsWith('.py');
    const isJs = runTarget.endsWith('.js');
    setLogs(prev => [...prev, { type: 'info', text: `Executing ${isPy ? 'Python' : 'JavaScript'} script (${runTarget.split('/').pop()}) in sandbox...` }]);
    
    try {
      const fileContent = await fileSystemAPI.readFile(runTarget);
      if (isPy) {
        const result = await runPython(fileContent);
        if (result !== undefined) {
          setLogs(prev => [...prev, { type: 'success', text: `Execution completed. Return: ${JSON.stringify(result)}` }]);
        }
      } else if (isJs) {
        const result = await runJS(fileContent);
        if (result !== undefined) {
          setLogs(prev => [...prev, { type: 'success', text: `Execution completed. Return: ${JSON.stringify(result)}` }]);
        }
      } else {
        setLogs(prev => [...prev, { type: 'stderr', text: `Unsupported file type for execution: ${runTarget}` }]);
      }
      await refreshFiles();
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    setLogs(prev => [...prev, { type: 'info', text: `Reading file ${file.name}...` }]);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await fileSystemAPI.writeFile(`workspace/${file.name}`, new Uint8Array(event.target.result));
        setLogs(prev => [...prev, { type: 'success', text: `Synchronized ${file.name} to OPFS workspace successfully.` }]);
        await refreshFiles();
      } catch (err) {
        setLogs(prev => [...prev, { type: 'stderr', text: `Failed to write file to OPFS: ${err.message}` }]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleOpenFile = async (filePath) => {
    const ext = filePath.split('.').pop().toLowerCase();
    
    // Explicitly reject non-renderable media binaries
    if (['png', 'jpg', 'jpeg', 'gif', 'whl', 'wasm', 'mp4', 'webp'].includes(ext)) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Cannot open binary file ${filePath} in editor.` }]);
      return;
    }

    try {
      if (['pdf', 'docx', 'xlsx', 'xls'].includes(ext)) {
        setActiveFile(filePath);
        setLogs(prev => [...prev, { type: 'info', text: `Opening ${filePath} in Documents viewer.` }]);
        setCurrentPage('documents');
        return;
      }

      // Otherwise, assume it's text and load into the editor
      const content = await fileSystemAPI.readFile(filePath);
      setCode(content);
      setActiveFile(filePath);
      setLogs(prev => [...prev, { type: 'info', text: `Opened ${filePath} in editor.` }]);
      setCurrentPage('editor');
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Failed to open file: ${err.message}` }]);
    }
  };

  const handleSaveFile = async (newCode) => {
    if (!activeFile) return;
    try {
      await fileSystemAPI.writeFile(activeFile, new TextEncoder().encode(newCode));
      setLogs(prev => [...prev, { type: 'success', text: `Saved ${activeFile}.` }]);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Failed to save file: ${err.message}` }]);
    }
  };

  const handleToggleFileSelect = (filePath) => {
    setSelectedFiles(prev =>
      prev.includes(filePath) ? prev.filter(p => p !== filePath) : [...prev, filePath]
    );
  };

  const generateCodeAsync = (messages, onToken) => {
    return new Promise((resolve) => {
      generateCode(messages, onToken, (fullOutput) => {
        resolve(fullOutput);
      });
    });
  };

  const handleAutocomplete = async (prefixText) => {
    const systemPrompt = `You are a code completion engine. Output ONLY raw code to complete the given prefix. Do NOT wrap the code in markdown (e.g., \`\`\`), do NOT output any conversational text, and do NOT output <tool_call> tags. Your response must be the exact raw string continuation of the user's code.`;
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Please complete the following code:\n\n${prefixText}` }
    ];

    const result = await generateCodeAsync(messages, () => {});
    
    // Clean up potential markdown formatting that the model might incorrectly output
    let cleanText = result.trim();
    if (cleanText.startsWith('```')) {
      const firstNewline = cleanText.indexOf('\n');
      if (firstNewline !== -1) {
        cleanText = cleanText.substring(firstNewline + 1);
      }
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    
    return cleanText.trim();
  };

  const handleQuery = async (queryText) => {
    if (loading || aiStreaming) return;
    setAiStreaming(true);
    setAiLogs(prev => [...prev, { sender: 'user', text: queryText }]);

    let contextText = '';
    for (const filePath of selectedFiles) {
      try {
        const filename = filePath.split('/').pop();
        if (filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls')) {
          setLogs(prev => [...prev, { type: 'info', text: `Analyzing Excel schema for ${filename}...` }]);
          const pythonCode = `
import pandas as pd
import json
def preview_excel():
    try:
        df = pd.read_excel("${filename}", nrows=5)
        schema = {str(col): str(dtype) for col, dtype in df.dtypes.items()}
        preview = df.head(2).to_dict(orient='records')
        return json.dumps({"schema": schema, "preview_rows": preview}, indent=2)
    except Exception as e:
        return f"[Excel Context Extraction Failed: {str(e)}]"
preview_excel()
          `;
          try {
            const result = await runPython(pythonCode);
            contextText += `--- File: ${filename} (Excel Schema Snapshot) ---\n${result}\n\n`;
          } catch (pyErr) {
            contextText += `--- File: ${filename} ---\n[Excel extraction failed: ${pyErr.message}]\n\n`;
          }
        } else {
          const content = await fileSystemAPI.readFile(`workspace/${filename}`);
          const sliced = content.length > 1500 ? content.slice(-1500) : content;
          contextText += `--- File: ${filename} ---\n${sliced}\n\n`;
        }
      } catch (err) {
        contextText += `--- File: ${filePath.split('/').pop()} ---\n[Context Extraction Failed: ${err.message}]\n\n`;
      }
    }

    const systemPrompt = `You are an offline coding assistant. Here is the relevant file context:\n${contextText}

You have access to the following tools:
<tools>
[
  {
    "name": "write_files",
    "description": "Write one or multiple files to the workspace at once. Use this to generate whole projects (HTML, CSS, JS) together.",
    "parameters": {
      "files": {
        "type": "array",
        "description": "List of files to create",
        "items": {
          "type": "object",
          "properties": {
            "path": {"type": "string", "description": "Filename, e.g. index.html"},
            "content": {"type": "string", "description": "The full code content of the file"}
          }
        }
      }
    }
  },
  {
    "name": "run_python",
    "description": "Execute Python code in the Pyodide sandbox",
    "parameters": {
      "code": {"type": "string"}
    }
  }
]
</tools>
To use a tool, output a tool call using the following XML format. Stop generating text immediately after the closing tag.
<tool_call>
{"name": "tool_name", "args": {"arg_name": "arg_value"}}
</tool_call>`;
    const historyMessages = aiLogs
      .filter(log => log.sender === 'user' || log.sender === 'ai')
      .map(log => ({ role: log.sender === 'user' ? 'user' : 'assistant', content: log.text }));
    const cappedHistory = historyMessages.slice(-6);
    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...cappedHistory,
      { role: 'user', content: queryText }
    ];

    let currentMessages = requestMessages;

    while (true) {
      setAiLogs(prev => [...prev, { sender: 'ai', text: '' }]);
      
      const fullOutput = await generateCodeAsync(currentMessages, (token) => {
        setAiLogs(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.sender === 'ai') next[next.length - 1] = { ...last, text: last.text + token };
          return next;
        });
      });

      let toolCallMatch;
      if (typeof fullOutput === 'string') {
        toolCallMatch = fullOutput.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
      }
      
      let toolData = null;
      if (toolCallMatch) {
        try { toolData = JSON.parse(toolCallMatch[1].trim()); } catch(e){}
      } else if (typeof fullOutput === 'string') {
        // Fallback: If the model forgot the XML tags but returned valid JSON
        try {
          const parsed = JSON.parse(fullOutput.trim());
          if (parsed.name && parsed.args) {
            toolData = parsed;
          }
        } catch(e){}
      }

      if (toolData) {
        let result = '';
        try {
          if (toolData.name === 'write_files') {
            // Loop through the array of files and write each one
            const writtenPaths = [];
            for (const file of toolData.args.files) {
              await fileSystemAPI.writeFile(`workspace/${file.path}`, new TextEncoder().encode(file.content));
              writtenPaths.push(file.path);
            }
            result = `Successfully wrote files: ${writtenPaths.join(', ')}`;
            await refreshFiles();
          } else if (toolData.name === 'run_python') {
            const pyResult = await runPython(toolData.args.code);
            result = `Python output: ${JSON.stringify(pyResult)}`;
            await refreshFiles();
          } else {
            result = `Unknown tool: ${toolData.name}`;
          }
        } catch (err) {
          result = `Error executing tool: ${err.message}`;
        }
        
        currentMessages.push({ role: 'assistant', content: fullOutput });
        currentMessages.push({ role: 'system', content: `<tool_response>\n${result}\n</tool_response>` });
        
        setAiLogs(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.sender === 'ai') {
            let cleaned = last.text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
            if (!toolCallMatch && cleaned.startsWith('{') && cleaned.endsWith('}')) {
              cleaned = '';
            }
            next[next.length - 1] = { ...last, text: cleaned };
          }
          return [...next, { sender: 'ai', text: `🔧 Tool Result: ${result}` }];
        });
      } else {
        break;
      }
    }

    setAiStreaming(false);
  };

  // --- Lifecycle ---
  useEffect(() => {
    refreshFiles().then(initializeDefaultWebFiles);
    subscribePythonLogs(log => setLogs(prev => [...prev, { type: log.type, text: log.text }]));
    subscribeAIStatus(status => setStatusMessage(status));

    // Hydrate state from localforage
    const hydrateState = async () => {
      try {
        const savedFile = await localforage.getItem('activeFile');
        const savedCode = await localforage.getItem('code');
        const savedLogs = await localforage.getItem('logs');
        if (savedFile) setActiveFile(savedFile);
        if (savedCode) setCode(savedCode);
        if (savedLogs) setLogs(savedLogs);
      } catch (err) {
        console.error('Failed to hydrate state from localforage:', err);
      }
    };
    hydrateState();
  }, []);

  // Sync activeFile to localforage
  useEffect(() => {
    if (activeFile !== null) {
      localforage.setItem('activeFile', activeFile).catch(console.error);
    } else {
      localforage.removeItem('activeFile').catch(console.error);
    }
  }, [activeFile]);

  // Sync code to localforage
  useEffect(() => {
    if (code !== null) {
      localforage.setItem('code', code).catch(console.error);
    }
  }, [code]);

  // Sync logs to localforage
  useEffect(() => {
    localforage.setItem('logs', logs).catch(console.error);
  }, [logs]);

  // Global F5 Capture
  const handleRunRef = useRef(handleRun);
  const loadingRef = useRef(loading);
  useEffect(() => { handleRunRef.current = handleRun; }, [handleRun]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (!loadingRef.current) {
          handleRunRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppContext.Provider value={{
      currentPage, setCurrentPage,
      code, setCode, activeFile, setActiveFile, loading,
      files, logs, setLogs,
      selectedFiles, aiLogs, setAiLogs, statusMessage, aiStreaming,
      runTarget, setRunTarget,
      handleRun, handleUpload, handleOpenFile, handleSaveFile,
      handleToggleFileSelect, handleQuery, refreshFiles, handleAutocomplete,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
