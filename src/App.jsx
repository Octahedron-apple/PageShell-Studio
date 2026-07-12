import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import AIPage from './pages/AIPage.jsx';
import FSPage from './pages/FSPage.jsx';
import RunPage from './pages/RunPage.jsx';
import PreviewPage from './pages/PreviewPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';

import Editor from './components/Editor.jsx';

function EditorPageWrapper() {
  const { code, setCode, activeFile, loading, handleRun, handleSaveFile } = useApp();
  
  return (
    <div className="w-full h-full">
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

function TopHeader({ currentPage }) {
  const titles = {
    editor: 'Code Editor',
    fs: 'File Manager',
    documents: 'Documents Viewer',
    run: 'Terminal Logs',
    preview: 'Browser Preview',
    ai: 'AI Assistant',
  };
  return (
    <header className="flex items-center justify-center py-3 bg-zinc-900 border-b border-zinc-800 text-zinc-100 font-semibold shadow-sm">
      {titles[currentPage] || 'PageShell Studio'}
    </header>
  );
}

function BottomNav({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: 'fs', label: 'Files', icon: '📁' },
    { id: 'editor', label: 'Code', icon: '💻' },
    { id: 'documents', label: 'Docs', icon: '📄' },
    { id: 'run', label: 'Run', icon: '▶️' },
    { id: 'preview', label: 'Web', icon: '🌐' },
    { id: 'ai', label: 'AI', icon: '✨' },
  ];

  return (
    <nav className="flex justify-around items-center bg-zinc-900 border-t border-zinc-800 p-2 pb-safe">
      {navItems.map(item => {
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
              isActive ? 'text-zinc-100 bg-zinc-800' : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function AppContent() {
  const { currentPage, setCurrentPage } = useApp();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderPage = () => {
    switch(currentPage) {
      case 'editor': return <EditorPageWrapper />;
      case 'fs': return <FSPage />;
      case 'run': return <RunPage />;
      case 'preview': return <PreviewPage />;
      case 'documents': return <DocumentsPage />;
      case 'ai': return <AIPage />;
      default: return <EditorPageWrapper />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {!isMobile && <Sidebar />}
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isMobile && <TopHeader currentPage={currentPage} />}
        
        <main className="flex-1 overflow-hidden relative">
          {renderPage()}
        </main>
        
        {isMobile && <BottomNav currentPage={currentPage} setCurrentPage={setCurrentPage} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
