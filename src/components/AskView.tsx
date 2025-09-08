import React from 'react';

interface AskViewProps {}

type Msg = { role: 'user' | 'assistant'; content: string };

export const AskView: React.FC<AskViewProps> = () => {
  const [query, setQuery] = React.useState('');
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
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
        body: JSON.stringify({ messages: [{ role: 'user', content: text } satisfies Msg] }),
      });
      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(`Ask failed: ${resp.status} ${detail}`);
      }
      const data = (await resp.json()) as { role: 'assistant'; content: string };
      setAnswer(data.content || '');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Very light URL extraction and inline citation mapping
  const urls = React.useMemo(() => {
    if (!answer) return [] as string[];
    const found = Array.from(answer.matchAll(/https?:\/\/[^\s)]+/g)).map((m) => m[0]);
    // Deduplicate by origin+path
    const uniq: string[] = [];
    const seen = new Set<string>();
    for (const u of found) {
      try {
        const { origin, pathname } = new URL(u);
        const key = origin + pathname;
        if (!seen.has(key)) {
          seen.add(key);
          uniq.push(u);
        }
      } catch {
        if (!seen.has(u)) {
          seen.add(u);
          uniq.push(u);
        }
      }
    }
    return uniq;
  }, [answer]);

  const annotated = React.useMemo(() => {
    if (!answer || urls.length === 0) return answer;
    let text = answer;
    urls.forEach((u, idx) => {
      try {
        const safe = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(safe, 'g');
        text = text.replace(re, `[${idx + 1}]`);
      } catch {}
    });
    return text;
  }, [answer, urls]);

  const suggestions = React.useMemo(
    () => [
      'Suggest ATS keywords for my role',
      'Rewrite my summary with metrics',
      'Top 3 fixes to boost impact',
    ],
    []
  );

  const askSuggestion = (s: string) => {
    setQuery(s);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Centered search bar */}
      <form onSubmit={onSubmit} className="mx-auto">
        <div className="rounded-2xl neo-card p-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-base md:text-lg px-2 py-2 text-slate-800 placeholder-slate-400"
            placeholder="Ask anything..."
            aria-label="Ask Varuna"
          />
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="text-xs text-slate-500">Varuna keeps it concise and practical.</div>
            <button
              type="submit"
              disabled={loading || query.trim().length === 0}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm shadow-sm ${
                loading ? 'bg-slate-400 cursor-not-allowed' : 'btn-gradient'
              }`}
            >
              {loading ? 'Thinking…' : 'Ask'}
            </button>
          </div>
        </div>
      </form>

      {/* Result */}
      {(error || annotated) && (
        <div className="mt-6 rounded-xl neo-card p-5">
          {error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <>
              {/* Sources panel */}
              {urls.length > 0 && (
                <div className="mb-4 rounded-lg neo-pressed p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Sources</div>
                  <ul className="text-sm list-decimal pl-5 space-y-1 break-words">
                    {urls.map((u, i) => (
                      <li key={i}>
                        <a href={u} target="_blank" rel="noreferrer" className="text-v-turquoise hover:underline">
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Answer (single comprehensive) */}
              {annotated && (
                <div className="whitespace-pre-wrap text-slate-800 leading-relaxed">{annotated}</div>
              )}

              {/* Follow-up (progressive disclosure) */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Follow-up questions</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => askSuggestion(s)}
                      className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm hover:bg-slate-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
