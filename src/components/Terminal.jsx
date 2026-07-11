import React, { useEffect, useRef } from 'react';

export default function Terminal({ logs, onClear }) {
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleArea}>
          <span style={styles.terminalIcon}>💻</span>
          <span style={styles.title}>Terminal Output</span>
        </div>
        <button onClick={onClear} style={styles.clearButton} id="terminal-clear-btn">
          Clear Logs
        </button>
      </div>
      <div style={styles.body} id="terminal-log-body">
        {logs.length === 0 ? (
          <div style={styles.emptyLogs}>Console idle. Press run to compile and execute Python code.</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                ...styles.line,
                color: log.type === 'stderr' ? '#ff6b6b' :
                       log.type === 'success' ? '#2ecc71' :
                       log.type === 'info' ? '#3498db' : '#ecf0f1'
              }}
            >
              {log.type === 'stdout' && <span style={styles.prefix}>[STDOUT]</span>}
              {log.type === 'stderr' && <span style={styles.prefix}>[ERROR]</span>}
              {log.type === 'info' && <span style={styles.prefix}>[SYSTEM]</span>}
              {log.type === 'success' && <span style={styles.prefix}>[SUCCESS]</span>}
              {log.text}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#0c0c0e',
    borderTop: '1px solid #222228',
    overflow: 'hidden',
    fontFamily: "'Fira Code', 'Courier New', Courier, monospace"
  },
  header: {
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
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  terminalIcon: {
    fontSize: '14px'
  },
  title: {
    letterSpacing: '0.02em'
  },
  clearButton: {
    backgroundColor: 'transparent',
    color: '#a0aec0',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'color 0.2s',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid #222228',
    '&:hover': {
      color: '#fff',
      backgroundColor: '#1a1a20'
    }
  },
  body: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    fontSize: '13px',
    lineHeight: '1.5',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  emptyLogs: {
    color: '#4a5568',
    fontStyle: 'italic',
    fontSize: '12px'
  },
  line: {
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap'
  },
  prefix: {
    marginRight: '8px',
    opacity: 0.5,
    fontSize: '11px',
    fontWeight: '700'
  }
};
