import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import AIAssistant from '../components/AIAssistant.jsx';
import FileManager from '../components/FileManager.jsx';

export default function AIPage() {
  const {
    files, selectedFiles, aiLogs, setAiLogs,
    statusMessage, handleQuery, handleUpload,
    handleToggleFileSelect, handleOpenFile,
  } = useApp();

  return (
    <div style={styles.page}>
      {/* Left: File context picker */}
      <aside style={styles.filePane}>
        <FileManager
          files={files}
          onUpload={handleUpload}
          selectedFiles={selectedFiles}
          onToggleSelect={handleToggleFileSelect}
          onOpenFile={handleOpenFile}
          mode="ai"
        />
      </aside>

      {/* Right: Full-width AI chat */}
      <main style={styles.aiPane}>
        <AIAssistant
          selectedFiles={selectedFiles}
          onQuery={handleQuery}
          aiLogs={aiLogs}
          onClearLogs={() => setAiLogs([])}
          statusMessage={statusMessage}
        />
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
    width: '280px',
    flexShrink: 0,
    borderRight: '1px solid #222228',
    backgroundColor: '#121215',
    overflowY: 'auto',
  },
  aiPane: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};
