import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { keymap, drawSelection, dropCursor, rectangularSelection, highlightActiveLine } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

export default function Editor({ code, activeFile, onChange, onRun, onSave, loading }) {
  const editorContainerRef = useRef(null);
  const viewRef = useRef(null);
  
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // Initialize CodeMirror instance
  useEffect(() => {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && update.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('undo') || tr.isUserEvent('redo') || tr.isUserEvent('paste') || tr.isUserEvent('cut'))) {
        if (onChangeRef.current) onChangeRef.current(update.state.doc.toString());
      }
    });

    const saveKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: (v) => {
          if (onSaveRef.current) onSaveRef.current(v.state.doc.toString());
          return true;
        }
      }
    ]);

    const ext = activeFile ? activeFile.split('.').pop().toLowerCase() : 'py';
    const langExt = ext === 'html' ? html() : ext === 'css' ? css() : ext === 'js' ? javascript() : python();

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        langExt,
        oneDark,
        updateListener,
        saveKeymap,
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        // Make the editor take full height of its wrapper
        EditorView.theme({
          "&": { height: "100%", width: "100%", backgroundColor: "#1a1a1e" },
          ".cm-scroller": { fontFamily: "'Fira Code', 'Courier New', Courier, monospace" },
          ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.04)" }
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
  // Re-initialize editor when activeFile changes to swap language extensions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

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
          <span style={styles.title}>{activeFile ? activeFile.split('/').pop() : 'Editor'}</span>
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          style={{
            ...styles.runButton,
            ...(loading ? styles.runButtonLoading : {})
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
  editorWrapper: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#1a1a1e',
    display: 'flex',
    flexDirection: 'column'
  }
};
