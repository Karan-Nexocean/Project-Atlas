import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, Waves } from 'lucide-react';
import { IconBadge } from './IconBadge';

type Msg = { role: 'user' | 'assistant'; content: string };

interface ChatAssistantProps {
  open: boolean;
  onClose: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ open, onClose }) => {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        "Hey! I’m Wingman — your co‑pilot inside Varuna (by Nexocean). Ask me anything about ATS optimization, bullet phrasing, or how this app evaluates resumes.",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text } as Msg];
    setMessages(next);
    setSending(true);
    try {
      const recruiter = (() => {
        try { return localStorage.getItem('varuna:recruiterEmail') || ''; } catch { return ''; }
      })();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (recruiter) headers['X-Recruiter-Email'] = recruiter;
      try {
        const { getAuthHeaders } = await import('../utils/identity');
        Object.assign(headers, await getAuthHeaders());
      } catch {}
      try {
        const g = localStorage.getItem('varuna:groqKey') || '';
        if (g) headers['X-Groq-Key'] = g;
      } catch {}
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(`Chat failed: ${resp.status} ${detail}`);
      }
      const data = (await resp.json()) as { role: 'assistant'; content: string };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry — I hit an error: ${e?.message || e}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSend();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[28rem] md:w-[32rem] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconBadge size={32}>
              <Waves className="w-4 h-4" />
            </IconBadge>
            <div>
              <div className="text-slate-800 font-semibold">Wingman Chat</div>
              <div className="text-xs text-slate-500">ATS, resume tips, interview prep</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-100 text-slate-600" aria-label="Close chat">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pretty-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl px-3 py-2 bubble-user-gradient text-white shadow'
                    : 'max-w-[85%] rounded-2xl px-3 py-2 bg-slate-100 text-slate-800 shadow'
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask about ATS, phrasing bullets, or this app..."
              className="flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-v-turquoise/40 text-slate-800"
            />
            <button
              disabled={!canSend}
              onClick={handleSend}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white shadow-sm transition-colors ${
                canSend ? 'btn-gradient' : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span className="text-sm">Send</span>
            </button>
          </div>
          {sending && (
            <div className="mt-2 text-xs text-slate-500">Wingman is thinking…</div>
          )}
        </div>
      </div>
    </div>
  );
};
