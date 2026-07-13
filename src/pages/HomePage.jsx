import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const { handleQuery, handleUpload, handleToggleFileSelect, setCustomSystemPrompt, selectedFiles } = useApp();
  const fileInputRef = useRef(null);

  const onStartProject = () => {
    navigate('/chat');
    setCustomSystemPrompt("You are an expert web developer. Create a beautiful, responsive mini-website with HTML, CSS, and JS. Use the write_files tool to output the files.");
    handleQuery("I want to build a new project. Please ask me what kind of app or website I want to build, and let's get started!");
  };

  const onFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await handleUpload(file);
    const filePath = `workspace/${file.name}`;
    if (!selectedFiles.includes(filePath)) {
      handleToggleFileSelect(filePath);
    }
    navigate('/chat');
    handleQuery(`I just uploaded ${file.name}. Please analyze it and tell me what you see.`);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleUpload(file);
      const filePath = `workspace/${file.name}`;
      if (!selectedFiles.includes(filePath)) {
        handleToggleFileSelect(filePath);
      }
      navigate('/chat');
      handleQuery(`I just dropped ${file.name}. Please analyze it.`);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center w-full h-full bg-[var(--bg-app)] text-[var(--text-primary)] p-8 box-border"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center max-w-4xl w-full">
        <img src={`${import.meta.env.BASE_URL}assets/logo2.png`} alt="Studio Logo" className="w-20 h-20 mb-6 object-contain animate-[spin_4s_linear_infinite]" />
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-500 mb-6 text-center tracking-tight">
          Your Private AI Studio
        </h1>
        <p className="text-[var(--text-muted)] text-xl mb-16 text-center max-w-2xl leading-relaxed">
          The power of advanced AI right on your device. Fast, secure, and ready to build.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          <button 
            onClick={onStartProject}
            className="flex flex-col items-center justify-center p-10 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl cursor-pointer outline-none hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all group"
          >
            <img src={`${import.meta.env.BASE_URL}assets/new_project_logo.png`} alt="New Project" className="w-24 h-24 mb-4 object-contain group-hover:scale-110 transition-transform" />
            <h3 className="text-2xl font-bold mb-2 text-center text-zinc-100">Start a New Project</h3>
            <p className="text-sm text-[var(--text-muted)] text-center">Chat with the AI to build something from scratch.</p>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-10 bg-[var(--bg-panel)] border border-[var(--border-color)] border-dashed rounded-2xl cursor-pointer outline-none hover:border-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all group relative overflow-hidden"
          >
            <img src={`${import.meta.env.BASE_URL}assets/Drag_and_drop_Logo.png`} alt="Drag and Drop" className="w-24 h-24 mb-4 object-contain group-hover:-translate-y-2 transition-transform relative z-10" />
            <h3 className="text-2xl font-bold mb-2 text-center text-zinc-100 relative z-10">Drag & Drop a File to Analyze</h3>
            <p className="text-sm text-[var(--text-muted)] text-center relative z-10">Upload a PDF, Excel sheet, or any document.</p>
            <input type="file" ref={fileInputRef} className="hidden" onChange={onFileUpload} />
          </button>
        </div>
      </div>
    </div>
  );
}
