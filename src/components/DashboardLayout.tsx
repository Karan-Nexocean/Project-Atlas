import React, { useEffect, useState } from 'react';
import { Target, UploadCloud, BarChart3, MessageSquare, Waves, ListTodo, Search, User, KeyRound, Sun, Moon } from 'lucide-react';
import { IconBadge } from './IconBadge';
import netlifyIdentity, { initIdentity, currentIdentityEmail } from '../utils/identity';
import { useToast } from './toast';
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
  const [identityOpen, setIdentityOpen] = useState(false);
  const [email, setEmail] = useState<string>(() => {
    try { return localStorage.getItem('atlas:recruiterEmail') || localStorage.getItem('varuna:recruiterEmail') || ''; } catch { return ''; }
  });
  const [groqKeyOpen, setGroqKeyOpen] = useState(false);
  const [groqKey, setGroqKey] = useState<string>(() => { try { return localStorage.getItem('atlas:groqKey') || localStorage.getItem('varuna:groqKey') || ''; } catch { return ''; } });
  const [dbUrl, setDbUrl] = useState<string>(() => { try { return localStorage.getItem('atlas:dbUrl') || localStorage.getItem('varuna:dbUrl') || ''; } catch { return ''; } });
  const allowedDomain = (import.meta as any)?.env?.VITE_ALLOW_EMAIL_DOMAIN || '';
  const toast = useToast();
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
    initIdentity();
    initHoverGlow();
    const onLogin = () => {
      const e = currentIdentityEmail();
      if (e) saveEmail(e);
    };
    netlifyIdentity.on('login', onLogin);
    netlifyIdentity.on('logout', () => {
      // keep manual email fallback, but you may clear it if you want stricter flows
    });
    return () => {
      try {
        netlifyIdentity.off('login', onLogin);
      } catch {}
    };
  }, []);

  function saveEmail(next: string) {
    const v = next.trim();
    if (allowedDomain && v && !v.toLowerCase().endsWith(`@${String(allowedDomain).toLowerCase()}`)) {
      toast.error(`Email must end with @${allowedDomain}`);
      return;
    }
    try { localStorage.setItem('atlas:recruiterEmail', v); } catch {}
    setEmail(v);
    setIdentityOpen(false);
  }
  function saveGroqKey(next: string) {
    const v = next.trim();
    try { localStorage.setItem('atlas:groqKey', v); } catch {}
    setGroqKey(v);
    setGroqKeyOpen(false);
  }
  function saveDbUrl(next: string) {
    const v = next.trim();
    try { localStorage.setItem('atlas:dbUrl', v); } catch {}
    setDbUrl(v);
    setGroqKeyOpen(false);
  }

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

      {/* Floating controls (headless; no header box) */}
      <div className="fixed top-3 right-3 z-40 flex items-center gap-2">
        <button
          onClick={() => setIdentityOpen(true)}
          className="ray-btn"
          title={email ? `Signed in as ${email}` : 'Set your work email'}
        >
          <User className="w-4 h-4" />
          <span className="hidden sm:inline">{email ? email : 'Identify'}</span>
        </button>
        <button onClick={() => setGroqKeyOpen(true)} className="ray-btn" title={groqKey ? 'API key set' : 'Set GROQ API key'}>
          <KeyRound className="w-4 h-4" />
          <span className="hidden sm:inline">{groqKey ? 'Key' : 'Set Key'}</span>
        </button>
        {/* Chat button removed; use main nav 'Atlas Assistant' */}
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
      {/* Identity modal */}
      {identityOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIdentityOpen(false)} />
          <div className="relative w-[92vw] max-w-md card shadow-2xl">
            <h4 className="text-lg font-semibold text-slate-800 mb-2">Your Work Email</h4>
            <p className="text-sm text-slate-600 mb-4">
              {allowedDomain
                ? `Only ${allowedDomain} emails are allowed.`
                : 'Used to identify who is using Atlas (logged with each analysis).'}
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`you@${allowedDomain || 'company.com'}`}
              className="input"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setIdentityOpen(false)} className="btn btn-secondary !rounded-xl">Cancel</button>
              <button onClick={() => saveEmail(email)} className="btn btn-primary !rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}
      {groqKeyOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGroqKeyOpen(false)} />
          <div className="relative w-[92vw] max-w-md card shadow-2xl">
            <h4 className="text-lg font-semibold text-slate-800 mb-2">Server Credentials</h4>
            <p className="text-sm text-slate-600 mb-4">These are stored in your browser and sent to your Netlify Functions with each request (for internal testing without Netlify env vars).</p>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="input"
            />
            <input
              type="text"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="postgresql://…?sslmode=require"
              className="input mt-3"
            />
            <div className="mt-5 flex justify-between gap-3">
              <button onClick={() => { setGroqKey(''); setDbUrl(''); saveGroqKey(''); saveDbUrl(''); }} className="btn btn-secondary !rounded-xl">Clear</button>
              <div className="flex gap-3">
                <button onClick={() => setGroqKeyOpen(false)} className="btn btn-secondary !rounded-xl">Cancel</button>
                <button onClick={() => { saveGroqKey(groqKey); saveDbUrl(dbUrl); }} className="btn btn-primary !rounded-xl">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline identity modal
export default DashboardLayout;
