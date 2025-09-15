import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Waves } from 'lucide-react';
import { IconBadge } from './IconBadge';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { TaskItem } from '../types/tasks';

type Msg = { role: 'user' | 'assistant'; content: string };

export const ChatPage: React.FC<{
  analysis: any | null;
  tasks: TaskItem[];
  candidateName: string;
}> = ({ analysis, tasks, candidateName }) => {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        "Hi! I’m Atlas Assistant — here to help with ATS fit, strong bullet phrasing, interview prep, and anything inside this app.",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        try { return localStorage.getItem('atlas:recruiterEmail') || localStorage.getItem('varuna:recruiterEmail') || ''; } catch { return ''; }
      })();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (recruiter) headers['X-Recruiter-Email'] = recruiter;
      try {
        const { getAuthHeaders } = await import('../utils/identity');
        Object.assign(headers, await getAuthHeaders());
      } catch {}
      try {
        const g = localStorage.getItem('atlas:groqKey') || localStorage.getItem('varuna:groqKey') || '';
        if (g) headers['X-Groq-Key'] = g;
      } catch {}
      try {
        const db = localStorage.getItem('atlas:dbUrl') || localStorage.getItem('varuna:dbUrl') || '';
        if (db) headers['X-Db-Url'] = db;
      } catch {}
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          context: {
            candidateName: candidateName || null,
            analysis: analysis || null,
            tasks: Array.isArray(tasks) ? tasks.slice(0, 100) : [],
          },
        }),
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

  return (
    <div className="card p-4 sm:p-6 flex flex-col h-[70vh]">
      <div className="flex items-center gap-2 mb-3">
        <IconBadge size={32}>
          <Waves className="w-4 h-4" />
        </IconBadge>
        <div>
          <div className="text-slate-800 font-semibold">Atlas Assistant</div>
          <div className="text-xs text-slate-500">ATS, resume tips, interview prep</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3 pretty-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl px-3 py-2 bubble-user-gradient text-white shadow'
                  : 'max-w-[85%] rounded-2xl px-3 py-2 bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 shadow'
                }
              >
                {m.role === 'assistant' ? (
                  <MarkdownRenderer content={m.content} />
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-200 pt-3 mt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about ATS, phrasing bullets, or this app..."
            className="flex-1 textarea text-slate-800 dark:text-slate-200"
          />
          <button
            disabled={!canSend}
            onClick={handleSend}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white shadow-sm transition-colors ${
              canSend ? 'btn btn-primary !rounded-xl' : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span className="text-sm">Send</span>
          </button>
        </div>
        {sending && (
          <div className="mt-2 text-xs text-slate-500">Atlas Assistant is thinking…</div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
