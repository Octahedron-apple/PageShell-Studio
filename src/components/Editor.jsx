import React from 'react';

export default function Editor({ code, onChange, onRun, loading }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleArea}>
          <span style={styles.editorIcon}>📝</span>
          <span style={styles.title}>Python Editor</span>
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          style={{
            ...styles.runButton,
            opacity: loading ? 0.7 : 1
          }}
          id="editor-run-btn"
        >
          {loading ? 'Running...' : 'Run Analysis (F5)'}
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        style={styles.textarea}
        spellCheck="false"
        id="editor-textarea"
        placeholder="Write your Python script here..."
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#18181b',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#121215',
    borderBottom: '1px solid #222228'
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  editorIcon: {
    fontSize: '16px'
  },
  title: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#a0aec0'
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
    outline: 'none',
    '&:hover': {
      transform: 'translateY(-1px)'
    },
    '&:active': {
      transform: 'translateY(0)'
    }
  },
  textarea: {
    flex: 1,
    backgroundColor: '#1a1a1e',
    color: '#cbd5e0',
    border: 'none',
    padding: '20px',
    fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none'
  }
};
