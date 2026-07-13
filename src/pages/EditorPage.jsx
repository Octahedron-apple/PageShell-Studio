import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import FileManager from '../components/FileManager.jsx';
import Editor from '../components/Editor.jsx';
import Terminal from '../components/Terminal.jsx';
import MediaViewer from '../components/MediaViewer.jsx';
import AIAssistant from '../components/AIAssistant.jsx';
import GlobalSearch from '../components/GlobalSearch.jsx';

export default function EditorPage() {
  const {
    code, setCode, activeFile, loading,
    files, logs, setLogs,
    currentPage, activeMediaUrl,
    isSearchOpen, setIsSearchOpen,
    handleRun, handleUpload, handleCreateFile, handleOpenFile, handleSaveFile,
    handleExportZip, handleImportZip,
    selectedFiles, handleToggleFileSelect,
    aiLogs, handleQuery, aiStreaming, ragStatus, ragIndices,
    chatSessions, currentSessionId, handleStartNewChat, handleLoadChat, handleDeleteChat
  } = useApp();

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Left: File Manager */}
      <aside className="w-[260px] shrink-0 border-r border-[#222228] bg-[#121215] overflow-y-auto">
        <FileManager
          files={files}
          activeFile={activeFile}
          onUpload={handleUpload}
          onCreateFile={handleCreateFile}
          onExportProject={handleExportZip}
          onImportProject={handleImportZip}
          selectedFiles={selectedFiles}
          onToggleSelect={handleToggleFileSelect}
          onOpenFile={handleOpenFile}
          onDeleteFile={handleDeleteFile}
          mode="editor"
        />
      </aside>

      {/* Center: Editor + Terminal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {currentPage === 'media' ? (
            <MediaViewer activeFile={activeFile} activeMediaUrl={activeMediaUrl} />
          ) : (
            <Editor
              code={code}
              activeFile={activeFile}
              onChange={setCode}
              onRun={handleRun}
              onSave={handleSaveFile}
              loading={loading}
            />
          )}
        </div>
        <div className="h-[260px] shrink-0 border-t border-[#222228] overflow-hidden">
          <Terminal logs={logs} onClear={() => setLogs([])} />
        </div>
      </main>

      {/* Right Sidebar: AI Assistant */}
      <aside className="w-[300px] shrink-0 border-l border-[#222228] bg-[#121215] overflow-hidden">
        <AIAssistant 
          selectedFiles={selectedFiles}
          onQuery={handleQuery}
          aiLogs={aiLogs}
          onClearLogs={handleStartNewChat}
          aiStreaming={aiStreaming}
          ragStatus={ragStatus}
          ragIndices={ragIndices}
          chatSessions={chatSessions}
          currentSessionId={currentSessionId}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          onNewChat={handleStartNewChat}
        />
      </aside>
      
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onSelect={handleOpenFile} 
      />
    </div>
  );
}

