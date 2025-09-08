import React, { useEffect, useState } from 'react';
import { Menu, X, Target, UploadCloud, BarChart3, MessageSquare, Waves, ListTodo, Search, User, KeyRound } from 'lucide-react';
import { IconBadge } from './IconBadge';
import netlifyIdentity, { initIdentity, currentIdentityEmail } from '../utils/identity';

type View = 'ask' | 'guide' | 'upload' | 'analysis' | 'tasks';

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
    try { return localStorage.getItem('varuna:recruiterEmail') || ''; } catch { return ''; }
  });
  const [groqKeyOpen, setGroqKeyOpen] = useState(false);
  const [groqKey, setGroqKey] = useState<string>(() => { try { return localStorage.getItem('varuna:groqKey') || ''; } catch { return ''; } });
  const allowedDomain = (import.meta as any)?.env?.VITE_ALLOW_EMAIL_DOMAIN || '';

  useEffect(() => {
    initIdentity();
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
      alert(`Email must end with @${allowedDomain}`);
      return;
    }
    try { localStorage.setItem('varuna:recruiterEmail', v); } catch {}
    setEmail(v);
    setIdentityOpen(false);
  }
  function saveGroqKey(next: string) {
    const v = next.trim();
    try { localStorage.setItem('varuna:groqKey', v); } catch {}
    setGroqKey(v);
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
          'w-full inline-flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          active ? 'nav-active-gradient text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span className="shrink-0 inline-flex items-center gap-3">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        {badge ? (
          <span className="ml-2 inline-flex items-center justify-center text-[10px] leading-none font-semibold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 min-w-[1.25rem]">
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-200">
        <IconBadge size={32}>
          <Waves className="w-4 h-4" />
        </IconBadge>
        <div className="text-base font-semibold text-slate-800">Varuna</div>
      </div>
        <div className="p-3 space-y-1">
          <div className="px-2 text-xs uppercase tracking-wide text-slate-500">Workspace</div>
        <NavItem id="guide" label="Interview Guide" icon={<Target className="w-4 h-4" />} />
        <NavItem id="upload" label="Upload Resume" icon={<UploadCloud className="w-4 h-4" />} />
        <NavItem
          id="analysis"
          label="Analysis Results"
          icon={<BarChart3 className="w-4 h-4" />}
          disabled={!analysisAvailable}
        />
        <NavItem
          id="tasks"
          label="Tasks"
          icon={<ListTodo className="w-4 h-4" />}
          badge={tasksCount > 0 ? (tasksCount > 99 ? '99+' : tasksCount) : undefined}
        />
        <NavItem id="ask" label="Ask Varuna" icon={<Search className="w-4 h-4" />} />
      </div>
      <div className="mt-auto p-3">
        <button
          onClick={onOpenChat}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg btn-gradient text-white px-3 py-2 text-sm shadow-sm transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      {/* Fixed background layer for smooth scrolling */}
      <div className="fixed inset-0 -z-10 ocean-bg gpu-layer" />
      <div className="ocean-orb gpu-layer -z-10" style={{ left: '-120px', top: '10vh' }} />
      <div className="ocean-orb gpu-layer -z-10" style={{ right: '-160px', bottom: '8vh' }} />
      <div className="ocean-arc gpu-layer -z-10" style={{ right: '-20vw', top: '20vh' }} />
      {/* Top bar */}
      <div className="sticky top-0 z-40 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 bg-white/85 border-b border-slate-200 gpu-layer">
        <div className="h-14 flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-700 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle sidebar"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden lg:flex items-center gap-3">
              <IconBadge size={32}>
                <Waves className="w-4 h-4" />
              </IconBadge>
              <div className="text-sm font-semibold text-slate-800">Wingman</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenChat}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg btn-gradient text-white px-3 py-2 text-sm shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setIdentityOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 text-slate-700 px-3 py-2 text-sm shadow-sm"
              title={email ? `Signed in as ${email}` : 'Set your work email'}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{email ? email : 'Identify'}</span>
            </button>
            <button
              onClick={() => setGroqKeyOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 text-slate-700 px-3 py-2 text-sm shadow-sm"
              title={groqKey ? 'API key set' : 'Set GROQ API key'}
            >
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">{groqKey ? 'Key set' : 'Set API Key'}</span>
            </button>
            <button
              onClick={() => netlifyIdentity.open()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-3 py-2 text-sm shadow-sm"
              title="Sign in with Netlify Identity"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>

      {/* Shell */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
          {/* Sidebar - desktop */}
          <aside className="hidden lg:block h-[calc(100vh-56px)] sticky top-14 border-r border-slate-200 bg-white">
            {sidebar}
          </aside>

          {/* Sidebar - mobile overlay */}
          {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-30">
              <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-14 bottom-0 w-[85%] max-w-[280px] bg-white border-r border-slate-200 shadow-xl">
              {sidebar}
            </div>
          </div>
          )}

          {/* Main content */}
          <main className="min-h-[calc(100vh-56px)] p-4 lg:p-8">
            <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
          </main>
        </div>
      {/* Identity modal */}
      {identityOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIdentityOpen(false)} />
          <div className="relative w-[92vw] max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-2">Your Work Email</h4>
            <p className="text-sm text-slate-600 mb-4">
              {allowedDomain
                ? `Only ${allowedDomain} emails are allowed.`
                : 'Used to identify who is using Varuna (logged with each analysis).'}
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`you@${allowedDomain || 'company.com'}`}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-v-turquoise/40"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setIdentityOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800">Cancel</button>
              <button onClick={() => saveEmail(email)} className="px-4 py-2 rounded-xl btn-gradient text-white">Save</button>
            </div>
          </div>
        </div>
      )}
      {groqKeyOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGroqKeyOpen(false)} />
          <div className="relative w-[92vw] max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-2">GROQ API Key</h4>
            <p className="text-sm text-slate-600 mb-4">Enter a server key. It will be sent with requests to your Netlify Functions and stored only in your browser.</p>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-v-turquoise/40"
            />
            <div className="mt-5 flex justify-between gap-3">
              <button onClick={() => { setGroqKey(''); saveGroqKey(''); }} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800">Clear</button>
              <div className="flex gap-3">
                <button onClick={() => setGroqKeyOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800">Cancel</button>
                <button onClick={() => saveGroqKey(groqKey)} className="px-4 py-2 rounded-xl btn-gradient text-white">Save</button>
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
