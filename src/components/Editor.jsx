import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

export default function Editor({ code, onChange, onRun, loading }) {
  const editorContainerRef = useRef(null);
  const viewRef = useRef(null);

  // Initialize CodeMirror instance
  useEffect(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && update.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('undo') || tr.isUserEvent('redo') || tr.isUserEvent('paste') || tr.isUserEvent('cut'))) {
        // Trigger onChange only if it's a real user edit, to prevent circular updates
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        python(),
        oneDark,
        updateListener,
        // Make the editor take full height of its wrapper
        EditorView.theme({
          "&": { height: "100%", width: "100%", backgroundColor: "#1a1a1e" },
          ".cm-scroller": { fontFamily: "'Fira Code', 'Courier New', Courier, monospace" }
        })
      ]
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current
    });
    
    viewRef.current = view;

    // Cleanup when component unmounts
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  // Run only on initial mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external state changes into the editor (e.g. from file loading)
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentDoc = view.state.doc.toString();
      if (code !== currentDoc) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: code }
        });
      }
    }
  }, [code]);
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
      <div 
        ref={editorContainerRef}
        style={styles.editorWrapper}
        id="editor-container"
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
  editorWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#1a1a1e',
    display: 'flex',
    flexDirection: 'column'
  }
};
