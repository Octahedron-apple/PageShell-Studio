import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const BASE = import.meta.env.BASE_URL;

const navItems = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'fs', icon: '📁', label: 'FS' },
  { id: 'editor', icon: '💻', label: 'Code' },
  { id: 'documents', icon: '📄', label: 'Docs' },
  { id: 'run', icon: '▶️', label: 'Run' },
  { id: 'preview', icon: '🌐', label: 'Web' },
  { id: 'ai', icon: '✨', label: 'AI' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.pathname.substring(1) || 'home';
  const { theme, setTheme } = useApp();

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="w-[72px] h-screen bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 flex flex-col items-center pt-3 pb-4 shrink-0 z-50">
      {/* Logo */}
      <div className="mb-5">
        <img src={`${BASE}assets/logo.png`} alt="Logo" className="w-[38px] h-[38px] rounded-lg object-contain" />
      </div>

      {/* Nav Links */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {navItems.map(({ id, icon, label }) => {
          const isActive = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => navigate(`/${id}`)}
              className={`flex flex-col items-center justify-center gap-1 w-[52px] h-[52px] rounded-xl cursor-pointer transition-colors ${
                isActive 
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[9px] font-bold tracking-wider uppercase">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-4 mt-auto">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Bottom Badge */}
        <div className="flex flex-col items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Offline</span>
        </div>
      </div>
    </aside>
  );
}
