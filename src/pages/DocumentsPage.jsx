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

  useEffect(() => {
    if (!activeFile) {
      setContent(null);
      setFileType(null);
      return;
    }
    loadDocument(activeFile);
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
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          📄 {activeFile ? activeFile.split('/').pop() : 'No file selected'}
        </div>
        {activeFile && fileType !== 'unsupported' && (
          <div style={styles.toolbar}>
            <button style={styles.btn} onClick={exportToPDF}>Export PDF</button>
            <button style={styles.btn} onClick={exportToDocx}>Export DOCX</button>
          </div>
        )}
      </div>

      <div style={styles.viewerContainer} ref={viewerRef}>
        {loading ? (
          <div style={styles.message}>Loading document...</div>
        ) : !activeFile ? (
          <div style={styles.message}>Select a file from the FS tab to view it here.</div>
        ) : fileType === 'sheet' ? (
          <table style={styles.table}>
            <tbody>
              {content.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={rIdx === 0 ? styles.th : styles.td}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : fileType === 'docx' ? (
          <div 
            style={styles.richText} 
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        ) : fileType === 'text' ? (
          <pre style={styles.preText}>{content}</pre>
        ) : (
          <div style={styles.message}>{content}</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1a1a24',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#121215',
    borderBottom: '1px solid #2d3748',
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
  },
  toolbar: {
    display: 'flex',
    gap: '8px',
  },
  btn: {
    backgroundColor: '#4facfe',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  viewerContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  message: {
    textAlign: 'center',
    color: '#718096',
    marginTop: '40px',
    fontStyle: 'italic',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    color: '#333',
  },
  th: {
    border: '1px solid #cbd5e0',
    padding: '8px',
    backgroundColor: '#e2e8f0',
    fontWeight: 'bold',
  },
  td: {
    border: '1px solid #cbd5e0',
    padding: '8px',
  },
  richText: {
    backgroundColor: 'white',
    color: 'black',
    padding: '2rem',
    borderRadius: '4px',
    minHeight: '100%',
  },
  preText: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '13px',
  }
};
