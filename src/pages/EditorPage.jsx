import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import FileManager from '../components/FileManager.jsx';
import Editor from '../components/Editor.jsx';
import Terminal from '../components/Terminal.jsx';

export default function EditorPage() {
  const {
    code, setCode, activeFile, loading,
    files, logs, setLogs,
    handleRun, handleUpload, handleOpenFile, handleSaveFile,
    selectedFiles, handleToggleFileSelect,
  } = useApp();

  return (
    <div style={styles.page}>
      {/* Left: File Manager */}
      <aside style={styles.filePane}>
        <FileManager
          files={files}
          onUpload={handleUpload}
          selectedFiles={selectedFiles}
          onToggleSelect={handleToggleFileSelect}
          onOpenFile={handleOpenFile}
        />
      </aside>

      {/* Center: Editor + Terminal */}
      <main style={styles.center}>
        <div style={styles.editorArea}>
          <Editor
            code={code}
            activeFile={activeFile}
            onChange={setCode}
            onRun={handleRun}
            onSave={handleSaveFile}
            loading={loading}
          />
        </div>
        <div style={styles.terminalArea}>
          <Terminal logs={logs} onClear={() => setLogs([])} />
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  filePane: {
    width: '260px',
    flexShrink: 0,
    borderRight: '1px solid #222228',
    backgroundColor: '#121215',
    overflowY: 'auto',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  editorArea: {
    flex: 1,
    overflow: 'hidden',
  },
  terminalArea: {
    height: '260px',
    flexShrink: 0,
    borderTop: '1px solid #222228',
    overflow: 'hidden',
  },
};
