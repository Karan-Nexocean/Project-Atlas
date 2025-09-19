import React, { useEffect, useState } from 'react';
import { Target, UploadCloud, BarChart3, MessageSquare, ListTodo, Sun, Moon } from 'lucide-react';
import { initHoverGlow } from '../utils/hoverGlow';

type View = 'guide' | 'upload' | 'analysis' | 'tasks' | 'chat';

interface DashboardLayoutProps {
  current: View;
  analysisAvailable?: boolean;
  tasksAvailable?: boolean;
  tasksCount?: number;
  onNavigate: (v: View) => void;
  onOpenChat: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  current,
  analysisAvailable = false,
  tasksAvailable = false,
  tasksCount = 0,
  onNavigate,
  onOpenChat,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    try {
      const saved = localStorage.getItem('atlas:theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    // fallback to system preference
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('atlas:theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  useEffect(() => {
    initHoverGlow();
  }, []);

  const NavItem: React.FC<{
    id: View;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
    badge?: React.ReactNode;
  }> = ({ id, label, icon, disabled, badge }) => {
    const active = current === id;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          onNavigate(id);
          setMobileOpen(false);
        }}
        className={[
          'w-full inline-flex items-center justify-between gap-3 rounded-full px-3 py-2 text-sm transition-all border',
          active
            ? 'bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500 text-white border-transparent shadow-sm'
            : 'text-slate-700 dark:text-slate-200 bg-white/60 dark:bg-white/5 backdrop-blur border-slate-200/70 dark:border-white/10 hover:shadow',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span className="shrink-0 inline-flex items-center gap-3">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        {badge ? (
          <span className="ml-2 inline-flex items-center justify-center text-[10px] leading-none font-semibold px-1.5 py-0.5 rounded-full bg-white/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 min-w-[1.25rem]">
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  const navSeg = (
    <div className="ray-seg">
      <button className={current==='guide'? 'active':''} onClick={() => onNavigate('guide')}><Target className="w-4 h-4 inline mr-1"/>Guide</button>
      <button className={current==='upload'? 'active':''} onClick={() => onNavigate('upload')}><UploadCloud className="w-4 h-4 inline mr-1"/>Upload</button>
      <button className={current==='analysis'? 'active':''} onClick={() => onNavigate('analysis')} disabled={!analysisAvailable}><BarChart3 className="w-4 h-4 inline mr-1"/>Analysis</button>
      <button className={current==='tasks'? 'active':''} onClick={() => onNavigate('tasks')}><ListTodo className="w-4 h-4 inline mr-1"/>Tasks {tasksCount>0?`(${tasksCount>99?'99+':tasksCount})`:''}</button>
      <button
        className={(current==='chat'? 'active ':'') + 'atlas-assistant-pill'}
        onClick={() => onNavigate('chat')}
        title="Atlas Assistant"
      >
        <MessageSquare className="w-4 h-4 inline mr-1"/>
        Atlas Assistant
      </button>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10 ray-bg gpu-layer" />
      {/* Ambient UI blobs + cursor glow */}
      <div className="ui-blobs">
        <div className="ui-blob ui-blob--1" />
        <div className="ui-blob ui-blob--2" />
        <div className="ui-blob ui-blob--3" />
        <div className="ui-blob ui-blob--4" />
      </div>
      <div className="cursor-glow" />

      {/* Floating controls (headless; no header box) */}
      <div className="fixed top-3 right-3 z-40 flex items-center gap-2">
        <button onClick={toggleTheme} className="ray-btn" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Shell */}
      <main className="min-h-screen p-4 lg:p-8">
        <div className="mx-auto w-full max-w-6xl space-y-6 ray-window p-4 sm:p-6">
          <div className="flex justify-center">{navSeg}</div>
          {children}
        </div>
      </main>
    </div>
  );
};

// Inline identity modal
export default DashboardLayout;
