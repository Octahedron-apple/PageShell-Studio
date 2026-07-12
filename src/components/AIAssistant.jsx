import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AIAssistant({ selectedFiles, onQuery, aiLogs, onClearLogs, statusMessage, aiStreaming }) {
  const [query, setQuery] = useState('');
  const logsEndRef = useRef(null);

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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleArea}>
          <span style={styles.aiIcon}>🤖</span>
          <span style={styles.title}>Local AI Assistant</span>
        </div>
        <button onClick={onClearLogs} style={styles.clearButton} id="ai-clear-btn">
          Clear
        </button>
      </div>

      {/* Selected Context Summary */}
      <div style={styles.contextSummary}>
        <span style={styles.contextLabel}>Context Ingestion:</span>
        {selectedFiles.length === 0 ? (
          <span style={styles.noContext}>None (check files in sidebar to attach)</span>
        ) : (
          <span style={styles.activeContext}>{selectedFiles.map(f => f.split('/').pop()).join(', ')}</span>
        )}
      </div>

      {/* Status Bar — always visible, highlighted during downloads */}
      {(() => {
        const isDownloading = statusMessage && statusMessage.includes('Downloading');
        return (
          <div style={{ ...styles.statusBar, ...(isDownloading ? styles.statusBarActive : {}) }}>
            <span style={{ ...styles.statusDot, ...(isDownloading ? styles.statusDotActive : {}) }} />
            <span style={styles.statusText}>{statusMessage || 'AI worker offline. Send a query to load the model.'}</span>
            {isDownloading && (
              <span style={styles.downloadingBadge}>↓ Downloading</span>
            )}
          </div>
        );
      })()}

      {/* AI Log Output */}
      <div style={styles.chatArea} id="ai-chat-body">
        {aiLogs.length === 0 ? (
          <div style={styles.introCard}>
            <h4 style={styles.introTitle}>Qwen2.5-Coder 0.5B Instruct</h4>
            <p style={styles.introText}>
              Your offline code assistant runs 100% in a background WebGPU/WASM worker.
              On first use, ~350MB of model weights are downloaded and cached in your browser's IndexedDB.
              Check files in the sidebar to attach them as context.
            </p>
          </div>
        ) : (
          aiLogs.map((msg, idx) => (
            <div key={idx} style={msg.sender === 'user' ? styles.userMessage : styles.aiMessage}>
              <div style={styles.messageHeader}>
                <strong>{msg.sender === 'user' ? 'You' : 'Assistant'}</strong>
              </div>
              <div style={styles.messageContent} className={msg.sender === 'user' ? '' : 'markdown-body'}>
                {msg.sender === 'user' ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
              </div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={aiStreaming ? "AI is typing..." : "Ask AI about selected files..."}
          style={{ ...styles.input, ...(aiStreaming ? styles.inputDisabled : {}) }}
          disabled={aiStreaming}
          id="ai-query-input"
        />
        <button type="submit" style={styles.sendButton} id="ai-send-btn" disabled={aiStreaming}>
          {aiStreaming ? 'Working...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#121215',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#16161a',
    borderBottom: '1px solid #222228'
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  aiIcon: {
    fontSize: '16px'
  },
  title: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#cbd5e0'
  },
  clearButton: {
    backgroundColor: 'transparent',
    color: '#a0aec0',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
    border: '1px solid #222228',
    borderRadius: '4px',
    padding: '2px 8px',
    '&:hover': {
      color: '#fff',
      backgroundColor: '#1a1a20'
    }
  },
  contextSummary: {
    padding: '8px 16px',
    backgroundColor: '#1a1a20',
    borderBottom: '1px solid #222228',
    fontSize: '12px',
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    overflow: 'hidden'
  },
  contextLabel: {
    color: '#718096',
    fontWeight: '700'
  },
  noContext: {
    color: '#4a5568',
    fontStyle: 'italic'
  },
  activeContext: {
    color: '#00f2fe',
    fontWeight: '600',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 16px',
    backgroundColor: '#0c0c0e',
    borderBottom: '1px solid #222228',
    fontSize: '11px',
    transition: 'background-color 0.3s',
    flexShrink: 0,
  },
  statusBarActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#3498db',
    boxShadow: '0 0 6px #3498db',
    flexShrink: 0,
  },
  statusDotActive: {
    backgroundColor: '#f59e0b',
    boxShadow: '0 0 8px #f59e0b',
  },
  statusText: {
    color: '#718096',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  downloadingBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '2px 7px',
    borderRadius: '10px',
    flexShrink: 0,
  },
  chatArea: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  introCard: {
    backgroundColor: '#16161a',
    border: '1px solid #222228',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '10px'
  },
  introTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#4facfe'
  },
  introText: {
    margin: 0,
    fontSize: '12px',
    color: '#718096',
    lineHeight: '1.5'
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1f2937',
    color: '#f3f4f6',
    borderRadius: '8px 8px 0 8px',
    padding: '10px 14px',
    maxWidth: '85%',
    boxSizing: 'border-box'
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#16161a',
    color: '#e5e7eb',
    border: '1px solid #222228',
    borderRadius: '8px 8px 8px 0',
    padding: '10px 14px',
    maxWidth: '85%',
    boxSizing: 'border-box'
  },
  messageHeader: {
    fontSize: '11px',
    color: '#9ca3af',
    marginBottom: '4px'
  },
  messageContent: {
    fontSize: '13px',
    lineHeight: '1.5',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap'
  },
  form: {
    display: 'flex',
    padding: '12px 16px',
    backgroundColor: '#16161a',
    borderTop: '1px solid #222228',
    gap: '8px'
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1e',
    border: '1px solid #222228',
    borderRadius: '6px',
    color: '#e2e8f0',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    '&::placeholder': {
      color: '#4a5568'
    }
  },
  inputDisabled: {
    backgroundColor: '#16161a',
    color: '#718096',
    cursor: 'not-allowed'
  },
  sendButton: {
    backgroundColor: '#4facfe',
    backgroundImage: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 0.9
    }
  }
};
