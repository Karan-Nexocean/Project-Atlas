import { useCallback, useState } from 'react';
import type { TaskItem } from '../components/TaskPanel';

export interface PlanBucket {
  label: string;
  count: number;
  estHours: number; // estimated hours for this bucket
}

export interface TaskPlan {
  totalHoursMin: number;
  totalHoursMax: number;
  buckets: PlanBucket[];
  notes?: string[];
}

function tryExtractJSONObject(text: string): any | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr: string | null = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    const prev = text[i - 1];
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (ch === '"' || ch === '\'' || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) {
      const candidate = text.slice(start, i + 1);
      try { return JSON.parse(candidate); } catch { /* continue */ }
    } }
  }
  return null;
}

function heuristicPlan(tasks: TaskItem[]): TaskPlan {
  // Simple heuristic: 12–18 minutes per task + 15% overhead; critical and formatting get more.
  const buckets: Record<string, PlanBucket> = {};
  const up = (label: string, weight = 1) => {
    if (!buckets[label]) buckets[label] = { label, count: 0, estHours: 0 };
    buckets[label].count += 1;
    buckets[label].estHours += (0.25 * weight); // base 15 minutes per task
  };
  tasks.forEach((t) => {
    const kind = t.source.kind;
    if (kind === 'section') {
      up(t.source.section, 1);
    } else if (kind === 'critical') {
      up('Critical Improvements', 1.5);
    } else if (kind === 'ats') {
      up('ATS Optimization', 1.2);
    } else if (kind === 'industry') {
      up('Industry-Specific', 1);
    }
  });
  let total = Object.values(buckets).reduce((s, b) => s + b.estHours, 0);
  total *= 1.15; // overhead
  return {
    totalHoursMin: Math.max(1, Math.round(total * 0.8)),
    totalHoursMax: Math.max(1, Math.round(total * 1.2)),
    buckets: Object.values(buckets),
    notes: ['Heuristic estimate based on item count and type. Use AI planning for a refined schedule.'],
  };
}

export function useTaskPlanner() {
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<TaskPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planTasks = useCallback(async (tasks: TaskItem[]) => {
    setPlanning(true);
    setError(null);
    try {
      const userPrompt = {
        role: 'user',
        content:
          'Given these resume-improvement tasks, respond ONLY with JSON: ' +
          '{"totalHoursMin": number, "totalHoursMax": number, "buckets": [{"label": string, "count": number, "estHours": number}], "notes": string[]} ' +
          'Assume focused execution by a single person. Consider writing/editing time, ATS clean-up, content gathering, and review. ' +
          'Tasks:\n' +
          tasks.map((t) => `- [${t.source.kind}${t.source.kind==='section'?'/'+t.source.section:''}] ${t.text}`).join('\n'),
      };
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
      try {
        const db = localStorage.getItem('varuna:dbUrl') || '';
        if (db) headers['X-Db-Url'] = db;
      } catch {}
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: [userPrompt] }),
      });
      if (!resp.ok) throw new Error(`Planner failed: ${resp.status}`);
      const data = await resp.json();
      const raw = typeof data?.content === 'string' ? data.content : String(data);
      const json = tryExtractJSONObject(raw);
      const chosen = json && typeof json.totalHoursMin === 'number' ? json : heuristicPlan(tasks);
      setPlan(chosen);
      return chosen;
    } catch (e: any) {
      const fallback = heuristicPlan(tasks);
      setPlan(fallback);
      setError(e?.message || String(e));
      return fallback;
    } finally {
      setPlanning(false);
    }
  }, []);

  return { planning, plan, error, planTasks } as const;
}

export default useTaskPlanner;
