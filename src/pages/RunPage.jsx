import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import Terminal from '../components/Terminal.jsx';

export default function RunPage() {
  const { logs, setLogs, handleRun, loading } = useApp();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleArea}>
          <span style={styles.icon}>▶️</span>
          <span style={styles.title}>Execution Runner</span>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          style={{
            ...styles.runButton,
            ...(loading ? styles.runButtonLoading : {})
          }}
          id="run-page-btn"
        >
          {loading ? 'Running...' : 'Run Analysis (F5)'}
        </button>
      </div>
      <div style={styles.terminalWrapper}>
        <Terminal logs={logs} onClear={() => setLogs([])} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    backgroundColor: '#0c0c0e',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#121215',
    borderBottom: '1px solid #222228',
    flexShrink: 0,
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '16px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#a0aec0',
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
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  runButtonLoading: {
    backgroundImage: 'none',
    backgroundColor: '#f59e0b',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
    cursor: 'not-allowed',
    animation: 'pulse 1.5s infinite',
  },
  terminalWrapper: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  }
};
