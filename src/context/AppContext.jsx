import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileSystemAPI } from '../services/fs/fileSystem.js';
import { runPython, subscribePythonLogs, terminateWorker as terminatePythonWorker } from '../services/runtimes/pyodide.js';
import { runJS, terminateWorker as terminateJSWorker } from '../services/runtimes/quickjs.js';
import { generateCode, stopGeneration } from '../services/ai/models.js';
import { extractDocxText, extractPdfText } from '../services/ai/rag.js';
import { exportWorkspaceToZip, importWorkspaceFromZip } from '../utils/zipUtils.js';
import { buildGlobalIndex, updateFileInIndex, removeFileFromIndex } from '../services/fs/search.js';
import localforage from 'localforage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [isHydrated, setIsHydrated] = useState(false);

  // --- Theme State ---
  const [activeMediaUrl, setActiveMediaUrl] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState('dark'); // 'light' or 'dark'

  // --- Editor State ---
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [code, setCode] = useState('');
  const [logs, setLogs] = useState([]);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runTarget, setRunTarget] = useState(null);

  useEffect(() => {
    if (activeFile && (activeFile.endsWith('.py') || activeFile.endsWith('.js'))) {
      setRunTarget(activeFile);
    }
  }, [activeFile]);

  // --- Global Hotkeys ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Terminal Logs ---
  // --- AI State ---
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  const [chatSessions, setChatSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('pageshell_ai_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState(() => {
    try {
      const saved = localStorage.getItem('pageshell_ai_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      }
    } catch (e) {
      console.error(e);
    }
    return crypto.randomUUID();
  });

  const [aiLogs, setAiLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('pageshell_ai_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].logs || [];
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    if (aiLogs.length > 0) {
      setChatSessions(prev => {
        const existingIdx = prev.findIndex(s => s.id === currentSessionId);
        let updated;
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], logs: aiLogs, updatedAt: Date.now() };
        } else {
          const firstUserLog = aiLogs.find(l => l.sender === 'user');
          const title = firstUserLog ? firstUserLog.text.substring(0, 40) + '...' : 'New Chat';
          updated = [{ id: currentSessionId, title, logs: aiLogs, updatedAt: Date.now() }, ...prev];
        }
        localStorage.setItem('pageshell_ai_history', JSON.stringify(updated));
        return updated;
      });
    }
  }, [aiLogs, currentSessionId]);

  const handleStartNewChat = () => {
    setAiLogs([]);
    setCurrentSessionId(crypto.randomUUID());
  };

  const handleLoadChat = (id) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      setAiLogs(session.logs);
      setCurrentSessionId(id);
    }
  };

  const handleDeleteChat = (id) => {
    setChatSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('pageshell_ai_history', JSON.stringify(updated));
      return updated;
    });
    if (id === currentSessionId) {
      handleStartNewChat();
    }
  };
  const [aiStreaming, setAiStreaming] = useState(false);

  const [customSystemPrompt, setCustomSystemPrompt] = useState(() => {
    return localStorage.getItem('pageshell_system_prompt') || 'You are PageShell, an expert offline coding assistant running entirely in the browser. Be helpful, concise, and conversational. When answering questions, always reply in plain, readable text. NEVER output raw JSON objects or tool call syntax in your response text — tool calls are handled separately and invisibly. Only invoke a tool when the user has clearly and explicitly asked you to create a file or run code.';
  });

  useEffect(() => {
    localStorage.setItem('pageshell_system_prompt', customSystemPrompt);
  }, [customSystemPrompt]);

  // --- RAG State ---
  // ragIndices: Map<filePath, MiniSearch index>
  const [ragIndices, setRagIndices] = useState(new Map());
  const [ragStatus, setRagStatus] = useState('');

  // --- File System Helpers ---
  const refreshFiles = async () => {
    try {
      const tree = await fileSystemAPI.getDirectoryTree();
      const workspaceNode = tree.find(node => node.name === 'workspace');
      setFiles(workspaceNode?.children ?? []);
      // Ensure initial search index is built
      buildGlobalIndex();
    } catch (err) {
      console.error('Failed to fetch OPFS file tree:', err);
    }
  };

  const initializeDefaultWebFiles = async () => {
    try {
      await fileSystemAPI.readFile('workspace/index.html');
    } catch {
      const encoder = new TextEncoder();
      
      // Basic Web Project
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

      // Fetch and seed samples
      try {
        const baseUrl = import.meta.env.BASE_URL;
        const [pyRes, xlsxRes, docxRes] = await Promise.all([
          fetch(`${baseUrl}samples/sample_code.py`),
          fetch(`${baseUrl}samples/financial_data.xlsx`),
          fetch(`${baseUrl}samples/company_policy.docx`)
        ]);

        if (pyRes.ok) await fileSystemAPI.writeFile('workspace/sample_code.py', new Uint8Array(await pyRes.arrayBuffer()));
        if (xlsxRes.ok) await fileSystemAPI.writeFile('workspace/financial_data.xlsx', new Uint8Array(await xlsxRes.arrayBuffer()));
        if (docxRes.ok) await fileSystemAPI.writeFile('workspace/company_policy.docx', new Uint8Array(await docxRes.arrayBuffer()));
      } catch (err) {
        console.error('Failed to seed sample files:', err);
      }

      await refreshFiles();
    }
  };

  // --- Actions ---
  const handleRun = async () => {
    if (!runTarget) return;
    setLoading(true);
    setLogs([{ type: 'info', text: `Starting execution of ${runTarget}...` }]);
    
    const startTime = Date.now();
    setActivity({ 
      id: startTime, 
      title: `Running ${runTarget.split('/').pop()}`, 
      status: 'running', 
      startTime, 
      logs: [] 
    });

    try {
      const content = await fileSystemAPI.readFile(runTarget);
      if (runTarget.endsWith('.py')) {
        await runPython(content);
      } else if (runTarget.endsWith('.js')) {
        await runJS(content);
      }
      setLogs(prev => [...prev, { type: 'success', text: `\nExecution completed successfully.` }]);
      setActivity(prev => prev ? { ...prev, status: 'success', duration: Math.floor((Date.now() - prev.startTime) / 1000) } : null);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `\nExecution failed: ${err.message}` }]);
      setActivity(prev => prev ? { ...prev, status: 'error', duration: Math.floor((Date.now() - prev.startTime) / 1000) } : null);
    } finally {
      setLoading(false);
    }
  };
  const handleStopAgent = () => {
    stopGeneration();
    setAiStreaming(false);
    setAiLogs(prev => [...prev, { sender: 'ai', text: '\n🛑 [Generation stopped by user]' }]);
  };

  const handleStop = () => {
    stopGeneration();
    if (aiStreaming) {
      setAiStreaming(false);
      setAiLogs(prev => [...prev, { sender: 'ai', text: '\n🛑 [Generation stopped by user]' }]);
    }
    if (runTarget || loading) {
      if (runTarget?.endsWith('.py')) {
        terminatePythonWorker();
      } else if (runTarget?.endsWith('.js')) {
        terminateJSWorker();
      }
      setLogs(prev => [...prev, { type: 'stderr', text: `\nExecution manually stopped.` }]);
      setActivity(prev => prev ? { ...prev, status: 'error', duration: Math.floor((Date.now() - prev.startTime) / 1000) } : null);
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    setLogs(prev => [...prev, { type: 'info', text: `Reading file ${file.name}...` }]);
    try {
      const buffer = await file.arrayBuffer();
      await fileSystemAPI.writeFile(`workspace/${file.name}`, new Uint8Array(buffer));
      setLogs(prev => [...prev, { type: 'success', text: `Synchronized ${file.name} to OPFS workspace successfully.` }]);
      await refreshFiles();
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Failed to write file to OPFS: ${err.message}` }]);
      throw err;
    }
  };

  const handleExportZip = async () => {
    try {
      setLogs(prev => [...prev, { type: 'info', text: `Exporting project to zip...` }]);
      await exportWorkspaceToZip();
      setLogs(prev => [...prev, { type: 'success', text: `Project exported successfully.` }]);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Export failed: ${err.message}` }]);
    }
  };

  const handleImportZip = async (file) => {
    try {
      setLogs(prev => [...prev, { type: 'info', text: `Importing project from ${file.name}...` }]);
      await importWorkspaceFromZip(file);
      await refreshFiles();
      setLogs(prev => [...prev, { type: 'success', text: `Project imported successfully.` }]);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Import failed: ${err.message}` }]);
    }
  };

  const handleCreateFile = async (fileName) => {
    if (!fileName) return;
    const filePath = `workspace/${fileName}`;
    try {
      await fileSystemAPI.writeFile(filePath, new TextEncoder().encode(''));
      setLogs(prev => [...prev, { type: 'success', text: `Created ${fileName}.` }]);
      await refreshFiles();
      updateFileInIndex(filePath);
      handleOpenFile(filePath);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Failed to create file: ${err.message}` }]);
    }
  };

  const handleOpenFile = async (filePath) => {
    const ext = filePath.split('.').pop().toLowerCase();
    
    // Explicitly handle media files
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      try {
        const bytes = await fileSystemAPI.readFileBinary(filePath);
        
        const mimeTypes = {
          'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
          'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml'
        };
        const blob = new Blob([bytes], { type: mimeTypes[ext] || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        setActiveMediaUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        
        setActiveFile(filePath);
        setLogs(prev => [...prev, { type: 'info', text: `Opening ${filePath} in Media viewer.` }]);
        navigate('/media');
      } catch (err) {
        setLogs(prev => [...prev, { type: 'stderr', text: `Failed to open media: ${err.message}` }]);
      }
      return;
    }

    // Explicitly reject other unrenderable binaries
    if (['whl', 'wasm', 'mp4', 'zip', 'gz', 'tar'].includes(ext)) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Cannot open binary file ${filePath} in editor.` }]);
      return;
    }

    try {
      if (['pdf', 'docx', 'xlsx', 'xls'].includes(ext)) {
        setActiveFile(filePath);
        setLogs(prev => [...prev, { type: 'info', text: `Opening ${filePath} in Documents viewer.` }]);
        navigate('/documents');
        return;
      }

      // Otherwise, assume it's text and load into the editor
      const content = await fileSystemAPI.readFile(filePath);
      setCode(content);
      setActiveFile(filePath);
      setLogs(prev => [...prev, { type: 'info', text: `Opened ${filePath} in editor.` }]);
      navigate('/editor');
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Failed to open file: ${err.message}` }]);
    }
  };

  const handleSaveFile = async (newCode) => {
    if (!activeFile) return;
    try {
      await fileSystemAPI.writeFile(activeFile, new TextEncoder().encode(newCode));
      setLogs(prev => [...prev, { type: 'success', text: `Saved ${activeFile}.` }]);
      updateFileInIndex(activeFile);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Failed to save file: ${err.message}` }]);
    }
  };

  const handleDeleteFile = async (path) => {
    try {
      await fileSystemAPI.deleteEntry(path);
      if (activeFile === path) {
        setActiveFile(null);
        setCode('');
      }
      setSelectedFiles(prev => prev.filter(p => p !== path));
      removeFileFromIndex(path);
      await refreshFiles();
      setLogs(prev => [...prev, { type: 'success', text: `Deleted ${path}.` }]);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `Failed to delete file: ${err.message}` }]);
    }
  };

  const handleToggleFileSelect = (filePath) => {
    setSelectedFiles(prev =>
      prev.includes(filePath) ? prev.filter(p => p !== filePath) : [...prev, filePath]
    );
  };

  // RAG indexing disabled — selected documents are extracted directly on query.

  const generateCodeAsync = (messages, onToken, tools) => {
    return new Promise((resolve) => {
      generateCode(messages, onToken, (fullOutput, tool_calls) => {
        resolve({ fullOutput, tool_calls });
      }, tools);
    });
  };

  const handleAutocomplete = async (prefixText) => {
    const systemPrompt = `You are a code completion engine. Output ONLY raw code to complete the given prefix. Do NOT wrap the code in markdown (e.g., \`\`\`), do NOT output any conversational text, and do NOT output <tool_call> tags. Your response must be the exact raw string continuation of the user's code.`;
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Please complete the following code:\n\n${prefixText}` }
    ];

    const { fullOutput } = await generateCodeAsync(messages, () => {});
    
    // Clean up potential markdown formatting that the model might incorrectly output
    let cleanText = fullOutput.trim();
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

    const truncateForContext = (text, maxChars = 4000) => {
      if (!text || typeof text !== 'string' || text.length <= maxChars) return text;
      const half = Math.floor(maxChars / 2);
      const firstPart = text.slice(0, half);
      const lastPart = text.slice(-half);
      return `${firstPart}\n... [middle portion omitted: only first and last tokens included to fit context window] ...\n${lastPart}`;
    };

    const perFileMaxChars = Math.max(1000, Math.min(4000, Math.floor(4800 / Math.max(1, selectedFiles.length))));

    // ── Direct Document Context (PDF & DOCX) ──
    for (const filePath of selectedFiles) {
      try {
        const filename = filePath.split('/').pop();
        const ext = filename.toLowerCase().split('.').pop();
        if (ext === 'pdf') {
          setLogs(prev => [...prev, { type: 'info', text: `Extracting text from ${filename}...` }]);
          const bytes = await fileSystemAPI.readFileBinary(filePath);
          const text = await extractPdfText(bytes);
          contextText += `\n--- Content of ${filename} (PDF) ---\n${truncateForContext(text, perFileMaxChars)}\n\n`;
        } else if (ext === 'docx') {
          setLogs(prev => [...prev, { type: 'info', text: `Extracting text from ${filename}...` }]);
          const bytes = await fileSystemAPI.readFileBinary(filePath);
          const text = await extractDocxText(bytes);
          contextText += `\n--- Content of ${filename} (DOCX) ---\n${truncateForContext(text, perFileMaxChars)}\n\n`;
        }
      } catch (err) {
        console.error(`Failed extracting context from ${filePath}:`, err);
      }
    }

    // ── Direct Context (Excel & other files) ──
    for (const filePath of selectedFiles) {
      try {
        const filename = filePath.split('/').pop();
        const ext = filename.toLowerCase().split('.').pop();

        if (['pdf', 'docx'].includes(ext)) continue;

        if (['xlsx', 'xls'].includes(ext)) {
          setLogs(prev => [...prev, { type: 'info', text: `Analyzing Excel schema for ${filename}...` }]);
          const pythonCode = `
import pandas as pd
import json
def preview_excel():
    try:
        df = pd.read_excel("${filePath}", nrows=5)
        schema = {str(col): str(dtype) for col, dtype in df.dtypes.items()}
        preview = df.head(2).astype(str).to_dict(orient='records')
        return json.dumps({"schema": schema, "preview_rows": preview}, indent=2)
    except Exception as e:
        return f"[Excel Context Extraction Failed: {str(e)}]"
preview_excel()
          `;
          try {
            const result = await runPython(pythonCode);
            contextText += `--- File: ${filename} (Excel Schema Snapshot) ---\n${truncateForContext(result, perFileMaxChars)}\n\n`;
          } catch (pyErr) {
            contextText += `--- File: ${filename} ---\n[Excel extraction failed: ${pyErr.message}]\n\n`;
          }
        } else {
          const content = await fileSystemAPI.readFile(`workspace/${filename}`);
          contextText += `--- File: ${filename} ---\n${truncateForContext(content, perFileMaxChars)}\n\n`;
        }
      } catch (err) {
        contextText += `--- File: ${filePath.split('/').pop()} ---\n[Context Extraction Failed: ${err.message}]\n\n`;
      }
    }

    const tools = [
      {
        name: "write_files",
        description: "Write one or multiple files to the workspace at once. Use this to generate whole projects (HTML, CSS, JS) together.",
        parameters: {
          files: {
            type: "array",
            description: "List of files to create",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Filename, e.g. index.html" },
                content: { type: "string", description: "The full code content of the file" }
              },
              required: ["path", "content"]
            }
          }
        }
      },
      {
        name: "run_python",
        description: "Execute Python code in the Pyodide sandbox",
        parameters: {
          code: { type: "string" }
        }
      }
    ];

    const systemPrompt = `${customSystemPrompt}\n${contextText}`;

    const historyMessages = aiLogs
      .filter(log => log.sender === 'user' || log.sender === 'ai')
      .map(log => ({ role: log.sender === 'user' ? 'user' : 'assistant', content: log.text }));
    const cappedHistory = historyMessages.slice(-4).map(msg => ({
      ...msg,
      content: truncateForContext(msg.content, 1200)
    }));
    const requestMessages = [
      { role: 'system', content: systemPrompt },
      ...cappedHistory,
      { role: 'user', content: queryText }
    ];

    let currentMessages = requestMessages;
    
    // AI pending tool state hook inside Context
    toolConfirmationResolveRef.current = null;

    while (true) {
      setAiLogs(prev => [...prev, { sender: 'ai', text: '' }]);
      
      const { fullOutput, tool_calls } = await generateCodeAsync(currentMessages, (token) => {
        setAiLogs(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.sender === 'ai') next[next.length - 1] = { ...last, text: last.text + token };
          return next;
        });
      }, tools);

      let toolData = null;
      let toolCallMatch = false;

      if (tool_calls && tool_calls.length > 0) {
        const tc = tool_calls[0];
        try {
          toolData = {
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
          };
          toolCallMatch = true;
        } catch (e) {
          console.error("Failed to parse native tool arguments:", e);
        }
      } else if (typeof fullOutput === 'string') {
        // Fallback string extraction if model outputs raw JSON text instead of native tool_calls
        const jsonMatch = fullOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            let rawJson = jsonMatch[0];
            // Escape literal newlines inside double-quoted strings
            rawJson = rawJson.replace(/"([^"\\]|\\.)*"/g, (m) => 
              m.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
            );
            // Remove trailing commas before closing braces/brackets
            rawJson = rawJson.replace(/,(\s*[\]}])/g, '$1');

            const parsed = JSON.parse(rawJson);
            if (parsed && parsed.name && parsed.args) {
              toolData = parsed;
              toolCallMatch = false; // mark as fallback so we know to hide the text
            }
          } catch(e){
            console.warn("Failed parsing repaired JSON fallback:", e);
          }
        }
      }

      if (toolData) {
        // Always erase the last streamed AI message — it either contains raw JSON (fallback)
        // or was empty (native tool_calls). Neither should be shown to the user.
        setAiLogs(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.sender === 'ai' && !last.pendingTool) {
            // Remove the empty/JSON entry entirely so there's no blank bubble
            return next.slice(0, next.length - 1);
          }
          return next;
        });
        setAiLogs(prev => [...prev, { sender: 'ai', pendingTool: toolData }]);

        const isAccepted = await new Promise(resolve => {
          toolConfirmationResolveRef.current = resolve;
        });
        
        let result = '';
        
        if (isAccepted) {
          try {
            if (toolData.name === 'write_files') {
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

          if (tool_calls && tool_calls.length > 0) {
            currentMessages.push({ role: 'assistant', content: fullOutput || null, tool_calls });
          } else {
            if (!toolCallMatch && toolData) {
              const simulatedToolCall = [{
                 type: 'function',
                 function: { name: toolData.name, arguments: JSON.stringify(toolData.args) }
              }];
              currentMessages.push({ role: 'assistant', content: null, tool_calls: simulatedToolCall });
            } else {
              currentMessages.push({ role: 'assistant', content: fullOutput });
            }
          }
          currentMessages.push({ role: 'user', content: `<tool_response>\n${result}\n</tool_response>` });
          
          setAiLogs(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.sender === 'ai') {
              let cleaned = (last.text || '').trim();
              if (!toolCallMatch && cleaned.startsWith('{') && cleaned.endsWith('}')) {
                cleaned = '';
              }
              next[next.length - 1] = { ...last, text: cleaned };
            }
            return [...next, { sender: 'ai', text: `🔧 Tool Result: ${result}` }];
          });
        } else {
           // User rejected — show a note and stop the loop so they can type
           setAiLogs(prev => [...prev, { sender: 'ai', text: '❌ Tool call was rejected. You can type your next message.' }]);
           break;
        }
      } else {
        break;
      }
    }

    setAiStreaming(false);
  };

  const toolConfirmationResolveRef = useRef(null);
  
  const confirmTool = (accepted) => {
    if (toolConfirmationResolveRef.current) {
      toolConfirmationResolveRef.current(accepted);
      toolConfirmationResolveRef.current = null;
    }
  };

  // --- Lifecycle ---
  useEffect(() => {
    fileSystemAPI.clearTrash().then(() => {
      refreshFiles().then(initializeDefaultWebFiles);
    });
    
    subscribePythonLogs(log => {
      setLogs(prev => [...prev, { type: log.type, text: log.text }]);
      setActivity(prev => {
        if (!prev || prev.status !== 'running') return prev;
        return { ...prev, logs: [...(prev.logs || []), { type: log.type, text: log.text }] };
      });
    });

    // Hydrate state from localforage
    const hydrateState = async () => {
      try {
        const savedFile = await localforage.getItem('activeFile');
        const savedCode = await localforage.getItem('code');
        const savedLogs = await localforage.getItem('logs');
        const savedTheme = await localforage.getItem('theme');
        if (savedFile) setActiveFile(prev => prev === null ? savedFile : prev);
        if (savedCode) setCode(prev => prev === '' ? savedCode : prev);
        if (savedLogs) setLogs(prev => prev.length === 0 ? savedLogs : prev);
        if (savedTheme) setTheme(savedTheme);
      } catch (err) {
        console.error('Failed to hydrate state from localforage:', err);
      } finally {
        setIsHydrated(true);
      }
    };
    hydrateState();
  }, []);

  // Sync theme to localforage and document class
  useEffect(() => {
    localforage.setItem('theme', theme).catch(console.error);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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

  const handleStopRef = useRef(handleStop);
  useEffect(() => { handleStopRef.current = handleStop; }, [handleStop]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (e.shiftKey) {
          if (loadingRef.current) {
            handleStopRef.current();
          }
        } else {
          if (!loadingRef.current) {
            handleRunRef.current();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[var(--bg-app)] text-[var(--text-muted)] font-mono text-xs tracking-widest uppercase">
        Hydrating Workspace...
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      activeMediaUrl, setActiveMediaUrl,
      isSearchOpen, setIsSearchOpen,
      theme, setTheme,
      files, setFiles, activeFile, setActiveFile, code, setCode, logs, setLogs, loading, setLoading, runTarget, setRunTarget,
      activity, setActivity,
      selectedFiles, aiLogs, setAiLogs, aiStreaming,
      chatSessions, currentSessionId,
      handleStartNewChat, handleLoadChat, handleDeleteChat,
      ragStatus, ragIndices, handleRun,
      handleStop, handleStopAgent,
      handleCreateFile,
      handleUpload, handleOpenFile, handleSaveFile, handleDeleteFile,
      handleExportZip, handleImportZip,
      handleToggleFileSelect, handleQuery, refreshFiles, handleAutocomplete,
      customSystemPrompt, setCustomSystemPrompt,
      confirmTool
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);


