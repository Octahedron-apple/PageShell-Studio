import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { keymap, drawSelection, dropCursor, rectangularSelection, highlightActiveLine } from '@codemirror/view';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion } from '@codemirror/autocomplete';
import { useApp } from '../context/AppContext.jsx';

export default function Editor({ code, activeFile, onChange, onRun, onSave, loading }) {
  const editorContainerRef = useRef(null);
  const viewRef = useRef(null);
  
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const { handleAutocomplete, theme } = useApp();
  const handleAutocompleteRef = useRef(handleAutocomplete);
  useEffect(() => { handleAutocompleteRef.current = handleAutocomplete; }, [handleAutocomplete]);

  // Initialize CodeMirror instance
  useEffect(() => {
    const aiAutocompleteSource = async (context) => {
      // Only trigger autocomplete on explicit user request (e.g., Ctrl + Space)
      if (!context.explicit) return null;

      // Extract up to 1000 characters before the cursor for context
      const prefixText = context.state.sliceDoc(Math.max(0, context.pos - 1000), context.pos);
      if (!prefixText.trim() || !handleAutocompleteRef.current) return null;

      try {
        const completion = await handleAutocompleteRef.current(prefixText);
        if (!completion) return null;

        return {
          from: context.pos,
          options: [{ label: completion, type: 'text', apply: completion }]
        };
      } catch (err) {
        console.error("Autocomplete failed:", err);
        return null;
      }
    };
    const debounceTimerRef = { current: null };
    const lastEmittedCodeRef = { current: code };

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && update.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('undo') || tr.isUserEvent('redo') || tr.isUserEvent('paste') || tr.isUserEvent('cut'))) {
        const currentDoc = update.state.doc.toString();
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          lastEmittedCodeRef.current = currentDoc;
          if (onChangeRef.current) onChangeRef.current(currentDoc);
        }, 300);
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
        theme === 'dark' ? oneDark : [],
        updateListener,
        saveKeymap,
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        highlightActiveLine(),
        autocompletion({ override: [aiAutocompleteSource] }),
        EditorView.lineWrapping,
        // Make the editor take full height of its wrapper
        EditorView.theme({
          "&": { height: "100%", width: "100%", backgroundColor: "transparent" },
          ".cm-scroller": { fontFamily: "'Fira Code', 'Courier New', Courier, monospace" },
          ".cm-activeLine": { backgroundColor: theme === 'dark' ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)" },
          ".cm-content": { caretColor: "var(--text-primary)" }
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
  // Re-initialize editor when activeFile or theme changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, theme]);

  // Sync external state changes into the editor (e.g. from file loading or AI edits)
  useEffect(() => {
    const view = viewRef.current;
    // Only overwrite the editor content if it doesn't have focus.
    // This prevents debounced state cycles from resetting the user's cursor while typing.
    if (view && !view.hasFocus) {
      const currentDoc = view.state.doc.toString();
      if (code !== currentDoc) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: code }
        });
      }
    }
  }, [code]);
  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3 bg-[var(--bg-panel)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <span className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">{activeFile ? activeFile.split('/').pop() : 'Editor'}</span>
        </div>

      </div>
      <div 
        ref={editorContainerRef}
        className="flex-1 overflow-hidden bg-[var(--bg-surface)] flex flex-col"
        id="editor-container"
      />
    </div>
  );
}

