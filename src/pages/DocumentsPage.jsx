import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { fileSystemAPI } from '../services/fs/fileSystem.js';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';

export default function DocumentsPage() {
  const { activeFile, setLogs, refreshFiles } = useApp();
  const [content, setContent] = useState(null);
  const [fileType, setFileType] = useState(null); // 'text', 'sheet', 'docx', 'unsupported'
  const [loading, setLoading] = useState(false);
  const viewerRef = useRef(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    if (!activeFile) {
      setContent(null);
      setFileType(null);
      return;
    }
    loadDocument(activeFile);

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [activeFile]);

  const loadDocument = async (filePath) => {
    setLoading(true);
    try {
      const ext = filePath.split('.').pop().toLowerCase();
      
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const buffer = await fileSystemAPI.readFileBinary(filePath);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setContent(json);
        setFileType('sheet');
      } 
      else if (ext === 'docx') {
        const buffer = await fileSystemAPI.readFileBinary(filePath);
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer.buffer });
        setContent(result.value);
        setFileType('docx');
      } 
      else if (ext === 'pdf') {
        const buffer = await fileSystemAPI.readFileBinary(filePath);
        const blob = new Blob([buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = url;
        setContent(url);
        setFileType('pdf');
      }
      else if (['png', 'jpg', 'jpeg', 'gif', 'wasm', 'mp4', 'webp', 'whl'].includes(ext)) {
        setContent('Binary media files cannot be viewed in the Documents tab.');
        setFileType('unsupported');
      } 
      else {
        // Fallback to text
        const text = await fileSystemAPI.readFile(filePath);
        setContent(text);
        setFileType('text');
      }
    } catch (err) {
      console.error(err);
      setContent(`Error loading document: ${err.message}`);
      setFileType('unsupported');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!activeFile || fileType === 'unsupported' || !content) return;
    try {
      const doc = new jsPDF();
      if (fileType === 'sheet') {
        let y = 10;
        content.forEach((row, i) => {
          doc.text(row.join(' | '), 10, y);
          y += 10;
          if (y > 280) {
            doc.addPage();
            y = 10;
          }
        });
      } else if (fileType === 'docx' && viewerRef.current) {
        doc.text(viewerRef.current.innerText.substring(0, 3000), 10, 10); // simplified PDF generation
      } else if (fileType === 'text') {
        const splitText = doc.splitTextToSize(content.substring(0, 5000), 180);
        doc.text(splitText, 10, 10);
      }
      
      const pdfBuffer = doc.output('arraybuffer');
      const filename = activeFile.split('/').pop().split('.')[0] + '_export.pdf';
      await fileSystemAPI.writeFile(`workspace/${filename}`, new Uint8Array(pdfBuffer));
      setLogs(prev => [...prev, { type: 'success', text: `Exported to ${filename} in OPFS.` }]);
      await refreshFiles();
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `PDF export failed: ${err.message}` }]);
    }
  };

  const exportToDocx = async () => {
    if (!activeFile || fileType === 'unsupported' || !content) return;
    try {
      let textContent = '';
      if (fileType === 'sheet') {
        textContent = content.map(row => row.join('\t')).join('\n');
      } else if (fileType === 'docx' && viewerRef.current) {
        textContent = viewerRef.current.innerText;
      } else if (fileType === 'text') {
        textContent = content;
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: textContent.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] })),
        }],
      });

      const blob = await Packer.toBlob(doc);
      const arrayBuffer = await blob.arrayBuffer();
      
      const filename = activeFile.split('/').pop().split('.')[0] + '_export.docx';
      await fileSystemAPI.writeFile(`workspace/${filename}`, new Uint8Array(arrayBuffer));
      setLogs(prev => [...prev, { type: 'success', text: `Exported to ${filename} in OPFS.` }]);
      await refreshFiles();
    } catch (err) {
      setLogs(prev => [...prev, { type: 'stderr', text: `DOCX export failed: ${err.message}` }]);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3 bg-[var(--bg-panel)] border-b border-[var(--border-color)] shrink-0">
        <div className="text-sm font-semibold">
          📄 {activeFile ? activeFile.split('/').pop() : 'No file selected'}
        </div>
        {activeFile && fileType !== 'unsupported' && (
          <div className="flex gap-2">
            <button className="bg-[var(--accent-primary)] text-[var(--accent-text)] border-none px-3 py-1.5 rounded cursor-pointer text-xs font-semibold" onClick={exportToPDF}>Export PDF</button>
            <button className="bg-[var(--accent-primary)] text-[var(--accent-text)] border-none px-3 py-1.5 rounded cursor-pointer text-xs font-semibold" onClick={exportToDocx}>Export DOCX</button>
          </div>
        )}
      </div>

      <div className={`flex-1 overflow-auto ${fileType === 'pdf' ? 'p-0 flex flex-col w-full h-full' : 'p-5'}`} ref={viewerRef}>
        {loading ? (
          <div className="text-center text-[var(--text-muted)] mt-10 italic">Loading document...</div>
        ) : !activeFile ? (
          <div className="text-center text-[var(--text-muted)] mt-10 italic">Select a file from the FS tab to view it here.</div>
        ) : fileType === 'sheet' ? (
          <table className="w-full border-collapse bg-[var(--bg-panel)] text-[var(--text-primary)]">
            <tbody>
              {content.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className={rIdx === 0 ? "border border-[var(--border-color)] p-2 bg-[var(--bg-surface-hover)] font-bold" : "border border-[var(--border-color)] p-2"}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : fileType === 'docx' ? (
          <div 
            className="bg-[var(--bg-panel)] text-[var(--text-primary)] p-8 rounded min-h-full" 
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        ) : fileType === 'pdf' ? (
          <iframe 
            src={content} 
            title="PDF Viewer"
            className="flex-1 w-full h-full min-h-[800px] border-none block" 
          />
        ) : fileType === 'text' ? (
          <pre className="m-0 whitespace-pre-wrap font-mono text-[13px]">{content}</pre>
        ) : (
          <div className="text-center text-[var(--text-muted)] mt-10 italic">{content}</div>
        )}
      </div>
    </div>
  );
}

