import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import EditorPage from './pages/EditorPage.jsx';
import PreviewPage from './pages/PreviewPage.jsx';
import AIPage from './pages/AIPage.jsx';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <div style={styles.shell}>
          {/* Persistent icon nav */}
          <Sidebar />

          {/* Page content area */}
          <div style={styles.content}>
            <Routes>
              <Route path="/" element={<Navigate to="/editor" replace />} />
              <Route path="/editor"  element={<EditorPage />} />
              <Route path="/preview" element={<PreviewPage />} />
              <Route path="/ai"      element={<AIPage />} />
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
};
