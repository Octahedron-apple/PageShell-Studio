import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import AIAssistant from '../components/AIAssistant.jsx';


export default function AIPage() {
  const {
    files, selectedFiles, aiLogs, setAiLogs,
    statusMessage, handleQuery, handleUpload,
    handleToggleFileSelect, handleOpenFile,
    aiStreaming,
  } = useApp();

  return (
    <div style={styles.page}>
      {/* Right: Full-width AI chat */}
      <main style={styles.aiPane}>
        <AIAssistant
          selectedFiles={selectedFiles}
          onQuery={handleQuery}
          aiLogs={aiLogs}
          onClearLogs={() => setAiLogs([])}
          statusMessage={statusMessage}
          aiStreaming={aiStreaming}
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

  aiPane: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};
