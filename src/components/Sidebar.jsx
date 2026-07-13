import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const BASE = import.meta.env.BASE_URL;

const navItems = [
  { id: 'home', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, label: 'Home' },
  { id: 'editor', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>, label: 'Code' },
  { id: 'documents', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, label: 'Docs' },
  { id: 'run', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: 'Run' },
  { id: 'preview', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>, label: 'Web' },
  { id: 'chat', icon: <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, label: 'AI' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.pathname.split('/')[1] || 'home';
  const { theme, setTheme } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside 
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`absolute inset-y-0 left-0 z-50 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border-color)] transition-all duration-300 ease-in-out ${isExpanded ? 'w-[200px]' : 'w-[64px]'}`}
    >
      {/* Logo */}
      <div className="h-[64px] flex items-center shrink-0 px-4">
        <img src={`${BASE}assets/logo.png`} alt="Logo" className="w-[32px] h-[32px] object-contain shrink-0" />
        <span className={`ml-3 font-semibold text-white tracking-wide transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 overflow-hidden w-0'}`}>
          PageShell
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col gap-2 mt-4 flex-1">
        {navItems.map(({ id, icon, label }) => {
          const isActive = currentPage === id || (currentPage === 'files' && id === 'fs');
          return (
            <button
              key={id}
              onClick={() => navigate(`/${id === 'fs' ? 'files/fs' : id}`)}
              className={`relative flex items-center h-12 w-full px-4 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] group transition-colors ${
                isActive 
                  ? 'text-white' 
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface-hover)]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" />
              )}
              <div className="shrink-0 flex items-center justify-center">
                {icon}
              </div>
              <span className={`ml-4 text-sm font-medium transition-opacity duration-200 whitespace-nowrap ${isExpanded ? 'opacity-100' : 'opacity-0 overflow-hidden w-0'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto mb-4 px-4 flex flex-col gap-4">
        <button 
          onClick={toggleTheme}
          className="flex items-center h-10 w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-[var(--text-muted)] hover:text-white transition-colors"
          title="Toggle Theme"
        >
          <div className="shrink-0 flex items-center justify-center w-6">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <span className={`ml-4 text-sm transition-opacity duration-200 whitespace-nowrap ${isExpanded ? 'opacity-100' : 'opacity-0 overflow-hidden w-0'}`}>
            Theme
          </span>
        </button>
      </div>
    </aside>
  );
}
