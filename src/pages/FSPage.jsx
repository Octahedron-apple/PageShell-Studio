import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import FileManager from '../components/FileManager.jsx';
import SmartSorterPage from './SmartSorterPage.jsx';
import { fileSystemAPI } from '../services/fs/fileSystem.js';
import { generateBulk } from '../services/ai/models.js';
import { extractDocxText, extractPdfText } from '../services/ai/rag.js';

export default function FSPage() {
  const { files, handleUpload, handleCreateFile, selectedFiles, handleToggleFileSelect, handleOpenFile, activeFile, handleExportZip, handleDeleteFile, refreshFiles } = useApp();
  const [viewMode, setViewMode] = useState('fs'); // 'fs' | 'sort'
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInstruction, setBulkInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '' });

  const CHUNK_LIMIT = 1000;
  const CHUNK_OVERLAP = 150;

  const handleBulkActionClick = () => {
    if (selectedFiles.length > 0) {
      setShowBulkModal(true);
    }
  };

  const startBulkAction = async () => {
    if (!bulkInstruction.trim() || selectedFiles.length === 0) return;
    
    setIsProcessing(true);
    setBulkProgress({ current: 0, total: selectedFiles.length, status: 'Starting...' });
    setShowBulkModal(false);

    for (let i = 0; i < selectedFiles.length; i++) {
      const path = selectedFiles[i];
      const filename = path.split('/').pop();
      setBulkProgress({ current: i + 1, total: selectedFiles.length, status: `Reading ${filename}...` });

      try {
        const ext = filename.split('.').pop().toLowerCase();
        let extractedText = '';

        if (ext === 'pdf') {
          const bytes = await fileSystemAPI.readFileBinary(path);
          extractedText = await extractPdfText(bytes);
        } else if (ext === 'docx') {
          const bytes = await fileSystemAPI.readFileBinary(path);
          extractedText = await extractDocxText(bytes);
        } else {
          extractedText = await fileSystemAPI.readFile(path);
        }

        if (!extractedText || extractedText.trim() === '') continue;

        setBulkProgress({ current: i + 1, total: selectedFiles.length, status: `Processing ${filename}...` });

        // Chunking
        const chunks = [];
        let j = 0;
        while (j < extractedText.length) {
          chunks.push(extractedText.slice(j, j + CHUNK_LIMIT));
          if (j + CHUNK_LIMIT >= extractedText.length) break;
          j += (CHUNK_LIMIT - CHUNK_OVERLAP);
        }

        let processedText = '';
        for (let j = 0; j < chunks.length; j++) {
           const prompt = `You are a bulk processing assistant. Apply the user's instruction to the provided text. Output ONLY the resulting text, no conversational filler.
Instruction: ${bulkInstruction}
Text Part ${j+1}/${chunks.length}:
${chunks[j]}`;
           
           const result = await generateBulk(prompt);
           processedText += result + '\n';
        }

        // Save
        const nameParts = filename.split('.');
        const newFilename = `${nameParts.slice(0, -1).join('.')}_processed.${nameParts.pop()}`;
        const newPath = path.substring(0, path.lastIndexOf('/')) + '/' + newFilename;
        
        await fileSystemAPI.writeFile(newPath, processedText);

      } catch (err) {
        console.error(`Error processing ${filename}:`, err);
      }
    }

    setBulkProgress({ current: selectedFiles.length, total: selectedFiles.length, status: 'Done!' });
    await refreshFiles();
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="w-full h-full bg-[var(--bg-app)] overflow-hidden flex flex-col">
      <div className="flex border-b border-zinc-800 bg-zinc-900 shrink-0">
        <button 
          onClick={() => setViewMode('fs')} 
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'fs' ? 'border-emerald-500 text-emerald-400 bg-zinc-800' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
        >
          File Explorer
        </button>
        <button 
          onClick={() => setViewMode('sort')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'sort' ? 'border-emerald-500 text-emerald-400 bg-zinc-800' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
        >
          Smart Sort
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'fs' ? (
          <FileManager
            files={files}
            activeFile={activeFile}
            onUpload={handleUpload}
            onCreateFile={handleCreateFile}
            onExportProject={handleExportZip}
            selectedFiles={selectedFiles}
            onToggleSelect={handleToggleFileSelect}
            onOpenFile={handleOpenFile}
            onDeleteFile={handleDeleteFile}
            onBulkActionClick={handleBulkActionClick}
            mode="editor"
          />
        ) : (
          <SmartSorterPage />
        )}

        {/* Modals and Overlays */}
        {showBulkModal && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-zinc-100 mb-2">Bulk AI Action</h3>
              <p className="text-sm text-zinc-400 mb-4">Run an AI instruction across {selectedFiles.length} selected files.</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {['Translate to Spanish', 'Fix Grammar', 'Summarize', 'Make it rhyme'].map(preset => (
                  <button 
                    key={preset}
                    onClick={() => setBulkInstruction(preset)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea 
                value={bulkInstruction}
                onChange={e => setBulkInstruction(e.target.value)}
                placeholder="Custom instruction... (e.g. 'Rewrite this to sound like a pirate')"
                className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-sm focus:outline-none focus:border-indigo-500 mb-4 resize-none"
              />

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
                <button onClick={startBulkAction} disabled={!bulkInstruction.trim()} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium">Start</button>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-full px-6 py-3 flex flex-col items-center gap-1 z-50 min-w-[300px]">
            <div className="flex justify-between w-full text-xs font-medium text-zinc-300">
              <span>{bulkProgress.status}</span>
              <span>{bulkProgress.current} / {bulkProgress.total}</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
