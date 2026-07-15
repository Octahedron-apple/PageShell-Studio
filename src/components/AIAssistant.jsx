import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { subscribeAIStatus } from '../services/ai/models.js';
import { useApp } from '../context/AppContext.jsx';

export default function AIAssistant({ 
  selectedFiles, onQuery, aiLogs, onClearLogs, aiStreaming, ragStatus, ragIndices,
  chatSessions = [], currentSessionId, onLoadChat, onDeleteChat, onNewChat, customSystemPrompt, setCustomSystemPrompt,
  confirmTool, onStop
}) {
  const { handleStopAgent } = useApp();
  const [query, setQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Engine offline — send a message to initialize.');
  
  useEffect(() => {
    subscribeAIStatus(status => setStatusMessage(status));
  }, []);

  const logsEndRef = useRef(null);
  const whisperWorkerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Initialize Speech Recognition
  const toggleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      setIsRecording(false);
      setWhisperStatus('');
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setWhisperStatus('Speech Recognition not supported in this browser.');
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setWhisperStatus('Listening...');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setQuery((prev) => (prev + ' ' + finalTranscript).trim());
        } else if (interimTranscript) {
          setWhisperStatus(`Listening... ${interimTranscript}`);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setWhisperStatus(`Error: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setWhisperStatus('');
        mediaRecorderRef.current = null;
      };

      try {
        recognition.start();
        mediaRecorderRef.current = recognition;
      } catch (err) {
        console.error('Error starting recognition', err);
      }
    }
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiLogs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onQuery(query);
    setQuery('');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] box-border">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3 bg-[var(--bg-panel)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <span className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">AI Assistant</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowPrompt(!showPrompt); setShowHistory(false); }} className="bg-transparent text-[var(--text-secondary)] text-[11px] cursor-pointer outline-none border border-[var(--border-color)] rounded px-2 py-0.5 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]">
            {showPrompt ? '← Back' : 'System Prompt'}
          </button>
          <button onClick={() => { setShowHistory(!showHistory); setShowPrompt(false); }} className="bg-transparent text-[var(--text-secondary)] text-[11px] cursor-pointer outline-none border border-[var(--border-color)] rounded px-2 py-0.5 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]">
            {showHistory ? '← Back' : 'History'}
          </button>
          <button onClick={() => { onNewChat?.(); setShowHistory(false); setShowPrompt(false); }} className="bg-transparent text-[var(--text-secondary)] text-[11px] cursor-pointer outline-none border border-[var(--border-color)] rounded px-2 py-0.5 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]">
            New Chat
          </button>
        </div>
      </div>

      {showHistory ? (
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
          <h3 className="text-[var(--text-primary)] text-sm font-bold m-0 mb-2">Chat History</h3>
          {chatSessions.length === 0 ? (
            <div className="text-[var(--text-muted)] text-xs">No saved sessions yet.</div>
          ) : (
            chatSessions.map(session => (
              <div 
                key={session.id} 
                className={`flex justify-between items-center p-3 rounded border cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-[var(--bg-surface-hover)] border-[var(--accent-primary)]' : 'bg-[var(--bg-panel)] border-[var(--border-color)] hover:border-[var(--text-muted)]'}`}
                onClick={() => { onLoadChat(session.id); setShowHistory(false); }}
              >
                <div className="flex flex-col gap-1 overflow-hidden pr-2">
                  <span className="text-[13px] text-[var(--text-primary)] font-semibold truncate">{session.title}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{new Date(session.updatedAt).toLocaleString()}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(session.id); }}
                  className="bg-transparent border-none text-[var(--text-muted)] hover:text-red-500 cursor-pointer p-1 shrink-0"
                  title="Delete chat"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      ) : showPrompt ? (
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
          <h3 className="text-[var(--text-primary)] text-sm font-bold m-0 mb-1">System Prompt</h3>
          <p className="text-xs text-[var(--text-muted)] m-0 mb-2">Define the AI's core behavior and persona for this session.</p>
          <textarea 
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
            className="w-full flex-1 bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-primary)] p-3 text-sm rounded focus:outline-none focus:border-indigo-500 resize-none font-mono"
          />
        </div>
      ) : (
        <>
          {/* Selected Context Summary */}
          <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-color)] text-xs flex gap-1.5 items-center overflow-hidden">
        <span className="text-[var(--text-muted)] font-bold">Context Ingestion:</span>
        {selectedFiles.length === 0 ? (
          <span className="text-[var(--text-muted)] italic">No files attached — select files in the sidebar to add context</span>
        ) : (
          <span className="text-[var(--accent-primary)] font-semibold truncate">{selectedFiles.map(f => f.split('/').pop()).join(', ')}</span>
        )}
      </div>

      {/* RAG Indexing Status */}
      {ragStatus && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[rgba(99,179,237,0.06)] border-b border-[rgba(99,179,237,0.15)] text-[11px] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#63b3ed] shadow-[0_0_6px_#63b3ed] shrink-0 animate-pulse" />
          <span className="text-[#63b3ed] flex-1 truncate">{ragStatus}</span>
          {ragIndices && ragIndices.size > 0 && (
            <span className="text-[10px] text-[#4facfe] bg-[rgba(79,172,254,0.1)] border border-[rgba(79,172,254,0.25)] px-[7px] py-[2px] rounded-[10px] shrink-0">📚 {ragIndices.size} indexed</span>
          )}
        </div>
      )}

      {/* Status Bar — always visible, highlighted during downloads */}
      {(() => {
        const isDownloading = statusMessage && statusMessage.includes('Downloading');
        const isLoading = statusMessage && (statusMessage.includes('%') || statusMessage.includes('Loading'));
        
        // Extract percentage from messages like "Loading WebGPU model: 47% - ..."
        const pctMatch = statusMessage && statusMessage.match(/(\d+)%/);
        const pct = pctMatch ? parseInt(pctMatch[1], 10) : null;

        const whisperPctMatch = whisperStatus && whisperStatus.match(/(\d+)%/);
        const whisperPct = whisperPctMatch ? parseInt(whisperPctMatch[1], 10) : null;

        return (
          <div className={`flex flex-col gap-1 px-4 py-[7px] bg-[var(--bg-status)] border-b border-[var(--border-color)] text-[11px] transition-colors duration-300 shrink-0 ${isDownloading ? 'bg-[rgba(245,158,11,0.08)] border-b border-[rgba(245,158,11,0.25)]' : ''}`}>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLoading ? 'bg-[var(--color-warning)] shadow-[0_0_8px_var(--color-warning)] animate-pulse' : 'bg-[#3498db] shadow-[0_0_6px_#3498db]'}`} />
              <span className="text-[var(--text-muted)] flex-1 truncate">{statusMessage || 'AI worker offline. Send a query to load the model.'}</span>
              {isDownloading && (
                <span className="text-[10px] font-bold text-[var(--color-warning)] bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.3)] px-[7px] py-[2px] rounded-[10px] shrink-0">↓ Downloading</span>
              )}
            </div>
            {pct !== null && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-[3px] bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3498db, var(--accent-primary))' }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0 w-[30px] text-right">{pct}%</span>
              </div>
            )}
            {whisperStatus && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500 shadow-[0_0_6px_#ef4444] animate-pulse' : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'} shrink-0`} />
                <span className="text-[var(--text-muted)] flex-1 truncate">Whisper: {whisperStatus}</span>
              </div>
            )}
            {whisperPct !== null && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-[3px] bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${whisperPct}%`, background: 'linear-gradient(90deg, #10b981, #00ff41)' }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0 w-[30px] text-right">{whisperPct}%</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* AI Log Output */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3" id="ai-chat-body">
        {aiLogs.length === 0 ? (
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-lg p-4 mt-2.5">
            <h4 className="m-0 mb-2 text-sm text-[var(--accent-primary)]">Qwen2.5-Coder 1.5B</h4>
            <p className="m-0 text-xs text-[var(--text-muted)] leading-relaxed">
              Runs fully offline via WebGPU. Model weights (~900 MB) are downloaded and cached locally on first use.
              Select files in the sidebar to attach them as context for your query.
            </p>
          </div>
        ) : (
          aiLogs.map((msg, idx) => (
            <div key={idx} className={msg.sender === 'user' ? "self-end bg-[var(--bg-surface-hover)] text-[var(--text-primary)] rounded-t-lg rounded-bl-lg rounded-br-none px-3.5 py-2.5 max-w-[85%] box-border" : "self-start bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-t-lg rounded-br-lg rounded-bl-none px-3.5 py-2.5 max-w-[85%] box-border"}>
              <div className="text-[11px] text-[var(--text-secondary)] mb-1">
                <strong>{msg.sender === 'user' ? 'You' : 'Assistant'}</strong>
              </div>
              
              {msg.pendingTool ? (
                <div className="bg-[var(--bg-app)] border border-amber-500/30 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 mb-2 text-amber-500 font-bold text-xs uppercase tracking-wide">
                    <span>⚠️ Pending Action:</span>
                    <span>{msg.pendingTool.name}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded text-xs font-mono text-[var(--text-secondary)] mb-3 overflow-x-auto max-h-32">
                    {JSON.stringify(msg.pendingTool.args, null, 2)}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => confirmTool(false)}
                      className="flex-1 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:bg-red-900/50 hover:text-red-300 transition-colors border border-zinc-700 text-xs font-bold"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => confirmTool(true)}
                      className="flex-1 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-500 transition-colors border-none text-xs font-bold shadow-lg shadow-amber-900/20"
                    >
                      Allow
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`text-[13px] leading-relaxed break-words whitespace-pre-wrap ${msg.sender === 'user' ? '' : 'markdown-body'}`}>
                  {msg.sender === 'user' ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex px-4 py-3 bg-[var(--bg-panel)] border-t border-[var(--border-color)] gap-2">
        <button 
          type="button"
          onClick={toggleRecording}
          className={`flex items-center justify-center w-9 h-9 rounded-md border ${isRecording ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]'} hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer outline-none`}
          title={isRecording ? "Stop Recording" : "Start Voice Input"}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={aiStreaming ? 'Generating response...' : 'Ask anything about your files or project...'}
          className={`flex-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--text-muted)] ${aiStreaming ? 'bg-[var(--bg-panel)] text-[var(--text-muted)] cursor-not-allowed' : ''}`}
          disabled={aiStreaming}
          id="ai-query-input"
        />
        {aiStreaming ? (
          <button 
            type="button" 
            onClick={() => (onStop || handleStopAgent)?.()} 
            className="bg-red-600 hover:bg-red-700 text-white border-none rounded-md px-4 py-2 text-[13px] font-bold cursor-pointer outline-none transition-colors duration-200 flex items-center gap-1 shrink-0" 
            title="Stop generating response"
            id="ai-stop-btn"
          >
            ⏹ Stop
          </button>
        ) : (
          <button type="submit" className="bg-[var(--accent-primary)] bg-[image:var(--accent-gradient)] text-white border-none rounded-md px-4 py-2 text-[13px] font-bold cursor-pointer outline-none transition-opacity duration-200 hover:opacity-90" id="ai-send-btn">
            Ask
          </button>
        )}
      </form>
      </>)}
    </div>
  );
}
