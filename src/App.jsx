import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { Group, Panel, Separator } from 'react-resizable-panels';
import Sidebar from './components/Sidebar.jsx';
import AIPage from './pages/AIPage.jsx';
import FSPage from './pages/FSPage.jsx';
import RunPage from './pages/RunPage.jsx';
import PreviewPage from './pages/PreviewPage.jsx';

import Editor from './components/Editor.jsx';

function EditorPageWrapper() {
  const { code, setCode, activeFile, loading, handleRun, handleSaveFile } = useApp();
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Editor
        code={code}
        activeFile={activeFile}
        onChange={setCode}
        onRun={handleRun}
        onSave={handleSaveFile}
        loading={loading}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <div style={styles.shell}>
          <Sidebar />
          <div style={styles.content}>
            <Routes>
              <Route path="/" element={<Navigate to="/editor" replace />} />
              <Route path="/fs" element={<FSPage />} />
              <Route path="/editor" element={<EditorPageWrapper />} />
              <Route path="/run" element={<RunPage />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/ai" element={<AIPage />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
    </AppProvider>
  );
}

const styles = {
  shell: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#0f0f11',
    color: '#e2e8f0',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  workspace: {
    width: '100%',
    height: '100%',
    display: 'flex',
  },
  panelColumn: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
};
