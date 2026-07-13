import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import AIPage from './pages/AIPage.jsx';
import FSPage from './pages/FSPage.jsx';
import RunPage from './pages/RunPage.jsx';
import PreviewPage from './pages/PreviewPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ActivityCardOverlay from './components/ActivityCardOverlay.jsx';
import Sidebar from './components/Sidebar.jsx';

function AppContent() {
  return (
    <div className="flex h-screen w-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex overflow-hidden relative ml-[64px]">
        <div className="w-full h-full p-2">
          <Routes>
            <Route path="/home" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><FSPage /></div>} />
            <Route path="/fs" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><FSPage /></div>} />
            {/* Kept editor mapped to fs for now, since FSPage handles both */}
            <Route path="/editor" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><FSPage /></div>} />
            <Route path="/documents" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><DocumentsPage /></div>} />
            <Route path="/preview" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><PreviewPage /></div>} />
            <Route path="/run" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><RunPage /></div>} />
            <Route path="/chat" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><AIPage /></div>} />
            <Route path="/ai" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><AIPage /></div>} />
            <Route path="/" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><FSPage /></div>} />
            <Route path="*" element={<div className="w-full h-full bg-[var(--bg-panel)] border border-[var(--border-color)] overflow-hidden flex"><FSPage /></div>} />
          </Routes>
        </div>
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
