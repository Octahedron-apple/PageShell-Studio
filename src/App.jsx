import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { Group, Panel, Separator } from 'react-resizable-panels';
import Sidebar from './components/Sidebar.jsx';
import AIPage from './pages/AIPage.jsx';
import FileManager from './components/FileManager.jsx';
import Editor from './components/Editor.jsx';
import Terminal from './components/Terminal.jsx';
import PreviewPage from './pages/PreviewPage.jsx';

function Workspace() {
  const {
    code, setCode, activeFile, loading,
    files, logs, setLogs,
    handleRun, handleUpload, handleOpenFile, handleSaveFile,
    selectedFiles, handleToggleFileSelect,
  } = useApp();

  return (
    <div style={styles.workspace}>
      <Group direction="horizontal">
        {/* Left Column: File Manager + Editor */}
        <Panel defaultSize={50} minSize={20} style={styles.panelColumn}>
          <Group direction="vertical">
            <Panel defaultSize={30} minSize={15}>
              <FileManager
                files={files}
                onUpload={handleUpload}
                selectedFiles={selectedFiles}
                onToggleSelect={handleToggleFileSelect}
                onOpenFile={handleOpenFile}
                mode="editor"
              />
            </Panel>
            <Separator className="resize-handle" />
            <Panel defaultSize={70} minSize={20}>
              <Editor
                code={code}
                activeFile={activeFile}
                onChange={setCode}
                onRun={handleRun}
                onSave={handleSaveFile}
                loading={loading}
              />
            </Panel>
          </Group>
        </Panel>

        <Separator className="resize-handle" />

        {/* Right Column: Preview + Console */}
        <Panel defaultSize={50} minSize={20} style={styles.panelColumn}>
          <Group direction="vertical">
            <Panel defaultSize={65} minSize={20}>
              <PreviewPage />
            </Panel>
            <Separator className="resize-handle" />
            <Panel defaultSize={35} minSize={15}>
              <Terminal logs={logs} onClear={() => setLogs([])} />
            </Panel>
          </Group>
        </Panel>
      </Group>
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
              <Route path="/editor" element={<Workspace />} />
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
