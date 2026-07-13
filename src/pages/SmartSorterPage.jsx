import React, { useState, useCallback, useRef } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { fileSystemAPI } from '../services/fs/fileSystem.js';
import { exportFolderToZip } from '../utils/zipUtils.js';
import { useApp } from '../context/AppContext.jsx';
import { generateCode } from '../services/ai/models.js';
import { extractDocxText, extractPdfText } from '../services/ai/rag.js';

export default function SmartSorterPage() {
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [categories, setCategories] = useState(['Taxes', 'Invoices', 'Personal', 'School']);
  const [newCategory, setNewCategory] = useState('');
  const [isSorting, setIsSorting] = useState(false);
  const [sortProgress, setSortProgress] = useState(0);
  const [sortLogs, setSortLogs] = useState([]);

  const addLog = (msg) => setSortLogs(prev => [...prev, msg]);

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    // Save them to .tmp_staging/
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const content = new Uint8Array(buffer);
      await fileSystemAPI.writeFile(`.tmp_staging/${file.name}`, content);
      setDroppedFiles(prev => [...prev, { name: file.name, status: 'staged' }]);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (cat) => {
    setCategories(categories.filter(c => c !== cat));
  };

  const startSorting = async () => {
    if (droppedFiles.length === 0) return;
    setIsSorting(true);
    setSortProgress(0);
    setSortLogs([]);
    addLog("Starting AI Smart Sort...");

    // Helper to categorize a single file
    const categorizeFile = (text, categoriesList) => {
      return new Promise((resolve) => {
        const prompt = `You are a smart file sorting assistant.
You are given the extracted text from a file and a list of possible folders.
Your task is to choose the most appropriate folder for this file based on its content.
If none fit, choose the best one.
Possible folders: ${JSON.stringify(categoriesList)}

Output ONLY the exact folder name from the list above wrapped in <folder> tags, e.g., <folder>${categoriesList[0]}</folder>.
Do not output anything else.

Text:
${text.substring(0, 1500)} // First 1500 chars is enough for classification
`;
        generateCode(prompt, () => {}, (output) => {
          const match = output.match(/<folder>(.*?)<\/folder>/i);
          if (match && match[1]) {
            resolve(match[1].trim());
          } else {
            // Fallback: search for category name in text
            for (const cat of categoriesList) {
              if (output.toLowerCase().includes(cat.toLowerCase())) {
                return resolve(cat);
              }
            }
            resolve(categoriesList[0]); // fallback to first
          }
        });
      });
    };

    let processed = 0;
    const newFiles = [...droppedFiles];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (file.status !== 'staged') {
        processed++;
        continue;
      }

      try {
        addLog(`Processing ${file.name}...`);
        
        // Extract text
        const path = `.tmp_staging/${file.name}`;
        const ext = file.name.split('.').pop().toLowerCase();
        let extractedText = '';

        if (ext === 'pdf') {
          const bytes = await fileSystemAPI.readFileBinary(path);
          extractedText = await extractPdfText(bytes);
        } else if (ext === 'docx') {
          const bytes = await fileSystemAPI.readFileBinary(path);
          extractedText = await extractDocxText(bytes);
        } else if (ext === 'txt') {
          extractedText = await fileSystemAPI.readFile(path);
        } else {
          // Fallback to reading as text if unknown
          extractedText = await fileSystemAPI.readFile(path);
        }

        if (!extractedText || extractedText.trim() === '') {
           addLog(`No text extracted for ${file.name}, defaulting...`);
           extractedText = "Empty file or binary.";
        }

        // Categorize
        let category = await categorizeFile(extractedText, categories);
        // Ensure category is valid
        if (!categories.includes(category)) category = categories[0];

        addLog(`=> Classified as [${category}]`);

        // Move file
        const targetPath = `.tmp_staging_out/${category}/${file.name}`;
        await fileSystemAPI.moveEntry(path, targetPath);

        // Update state
        newFiles[i].status = `Sorted: ${category}`;
        setDroppedFiles([...newFiles]);

      } catch (err) {
        addLog(`Error sorting ${file.name}: ${err.message}`);
        newFiles[i].status = 'error';
        setDroppedFiles([...newFiles]);
      }
      processed++;
      setSortProgress(Math.round((processed / droppedFiles.length) * 100));
    }

    setIsSorting(false);
    addLog("Sorting complete!");
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-app)]">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold text-zinc-100">Smart Sort</h2>
        <div className="flex gap-2">
          <button 
            onClick={startSorting}
            disabled={isSorting || droppedFiles.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 font-medium"
          >
            {isSorting ? 'Sorting...' : 'Start Sorting'}
          </button>
          <button 
            onClick={() => exportFolderToZip('.tmp_staging_out', 'smart-sorted-files.zip')}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium"
          >
            Export ZIP
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Group direction="horizontal">
          <Panel defaultSize={60} minSize={30}>
            <div 
              onDrop={handleDrop} 
              onDragOver={handleDragOver}
              className="h-full p-6 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 m-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
            >
              {droppedFiles.length === 0 ? (
                <div className="text-center text-zinc-500">
                  <div className="text-5xl mb-4">📥</div>
                  <p className="text-lg font-medium">Drag & Drop chaotic files here</p>
                  <p className="text-sm mt-2">PDF, DOCX, TXT</p>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col">
                  <h3 className="text-lg font-semibold text-zinc-300 mb-4">Staged Files ({droppedFiles.length})</h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {droppedFiles.map((f, i) => (
                      <div key={i} className="bg-zinc-800 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-zinc-200">{f.name}</span>
                        <span className="text-xs px-2 py-1 bg-zinc-700 rounded text-zinc-400 uppercase tracking-wider">{f.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <Separator className="w-1 bg-zinc-800 hover:bg-emerald-500/50 transition-colors cursor-col-resize" />

          <Panel defaultSize={40} minSize={20}>
            <div className="h-full p-4 flex flex-col border-l border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">Smart Folders</h3>
              
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  placeholder="New Category..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
                <button 
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg"
                >
                  Add
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat, i) => (
                    <div key={i} className="bg-zinc-800/80 border border-zinc-700 rounded-xl p-4 flex flex-col justify-between group">
                      <div className="flex justify-between items-start">
                        <span className="text-2xl mb-2">📁</span>
                        <button 
                          onClick={() => handleRemoveCategory(cat)}
                          className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="font-semibold text-zinc-200">{cat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {sortLogs.length > 0 && (
                <div className="mt-4 h-32 bg-zinc-950 rounded-lg p-3 overflow-y-auto border border-zinc-800 font-mono text-xs">
                  {sortLogs.map((log, i) => (
                    <div key={i} className="text-emerald-400 mb-1">{log}</div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
          </Group>
      </div>
    </div>
  );
}
