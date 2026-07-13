import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.jsx';
import AIPage from './pages/AIPage.jsx';
import FSPage from './pages/FSPage.jsx';
import RunPage from './pages/RunPage.jsx';
import PreviewPage from './pages/PreviewPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import Editor from './components/Editor.jsx';
import ActivityCardOverlay from './components/ActivityCardOverlay.jsx';

function EditorPageWrapper() {
  const { code, setCode, activeFile, loading, handleRun, handleSaveFile } = useApp();
  
  return (
    <div className="w-full h-full bg-[var(--bg-app)] rounded-lg border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col">
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

function Workspace({ isMobile, mobileMenuOpen }) {
  // Routes everything other than chat and home here. The right panel displays the active viewer.
  const location = useLocation();
  const subRoute = location.pathname.split('/').pop();

  return (
    <div className="flex w-full h-full p-2 gap-2 bg-[var(--bg-app)] relative">
      <aside className={`w-[280px] bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] shadow-sm flex flex-col shrink-0 ${isMobile ? (mobileMenuOpen ? 'absolute inset-y-2 left-2 z-40 shadow-2xl h-[calc(100%-16px)]' : 'hidden') : 'block'}`}>
         <FSPage />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
         {subRoute === 'documents' ? <DocumentsPage /> :
          subRoute === 'preview' ? <PreviewPage /> :
          <EditorPageWrapper />}
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isChat = location.pathname.startsWith('/chat') || location.pathname.startsWith('/ai');
  const isFiles = location.pathname.startsWith('/files') || location.pathname.startsWith('/editor') || location.pathname.startsWith('/fs') || location.pathname.startsWith('/documents') || location.pathname.startsWith('/preview');
  
  // Close mobile menu on route change
  useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Global Top Nav (Mode Switcher) */}
      <header className="flex items-center justify-between px-4 py-2 bg-[var(--bg-panel)] border-b border-[var(--border-color)] shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          {isMobile && isFiles && (
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 bg-transparent text-[var(--text-primary)] border border-[var(--border-color)] rounded cursor-pointer outline-none hover:bg-[var(--bg-surface)]">
              ☰
            </button>
          )}
          <span 
            className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 cursor-pointer"
            onClick={() => navigate('/')}
          >
            PageShell
          </span>
        </div>
        
        {location.pathname !== '/' && (
          <div className="flex bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-color)]">
            <button 
              onClick={() => navigate('/chat')}
              className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all ${isChat ? 'bg-[var(--bg-panel)] text-white shadow-sm border border-[var(--border-color)]' : 'bg-transparent text-[var(--text-muted)] hover:text-white border border-transparent'}`}
            >
              Chat
            </button>
            <button 
              onClick={() => navigate('/files/editor')}
              className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all ${isFiles ? 'bg-[var(--bg-panel)] text-white shadow-sm border border-[var(--border-color)]' : 'bg-transparent text-[var(--text-muted)] hover:text-white border border-transparent'}`}
            >
              Files
            </button>
          </div>
        )}
        <div className="w-8" /> {/* Spacer for centering */}
      </header>
      
      <main className="flex-1 flex overflow-hidden relative">
        <Routes>
          <Route path="/chat" element={<div className="w-full h-full p-2"><div className="w-full h-full bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] shadow-sm flex overflow-hidden"><AIPage /></div></div>} />
          <Route path="/ai" element={<div className="w-full h-full p-2"><div className="w-full h-full bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] shadow-sm flex overflow-hidden"><AIPage /></div></div>} />
          <Route path="/files/*" element={<Workspace isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} />} />
          <Route path="/editor" element={<Workspace isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} />} />
          <Route path="/fs" element={<Workspace isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} />} />
          <Route path="/documents" element={<Workspace isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} />} />
          <Route path="/preview" element={<Workspace isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} />} />
          <Route path="/run" element={<div className="w-full h-full p-2"><div className="w-full h-full bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] shadow-sm flex overflow-hidden"><RunPage /></div></div>} />
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      <ActivityCardOverlay />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </HashRouter>
  );
}
