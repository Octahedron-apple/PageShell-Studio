import React from 'react';
import { useApp } from '../context/AppContext.jsx';
import AIAssistant from '../components/AIAssistant.jsx';


export default function AIPage() {
  const {
    files, selectedFiles, aiLogs, setAiLogs,
    aiStreaming, ragStatus, ragIndices,
    chatSessions, currentSessionId, handleStartNewChat, handleLoadChat, handleDeleteChat,
    customSystemPrompt, setCustomSystemPrompt,
    handleQuery, confirmTool
  } = useApp();

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Right: Full-width AI chat */}
      <main className="flex-1 overflow-hidden flex flex-col">
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
          customSystemPrompt={customSystemPrompt}
          setCustomSystemPrompt={setCustomSystemPrompt}
          confirmTool={confirmTool}
        />
      </main>
    </div>
  );
}

