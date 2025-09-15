import React, { useMemo, useState } from 'react';
import type { TaskItem } from '../types/tasks';
import { ClipboardCopy, Download, Inbox, LayoutGrid, ListChecks, Wand2, Loader } from 'lucide-react';
import { useTaskPlanner } from '../hooks/useTaskPlanner';
import { Motion, MotionCard, Stagger } from './motion';
import { useToast } from './toast';

interface TasksViewProps {
  tasks: TaskItem[];
  onGenerateFromAnalysis?: () => void;
  transformToken?: string | null; // when changed, trigger transforming animation
  planToken?: string | null; // when changed, trigger AI planning
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, onGenerateFromAnalysis, transformToken, planToken }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [transforming, setTransforming] = useState(false);
  const [step, setStep] = useState(0);
  const [view, setView] = useState<'list'|'grid'>('list');
  const { planning, plan, error, planTasks } = useTaskPlanner();
  const toast = useToast();
  const simSteps = [
    'Reading analysis data...',
    'Aggregating section suggestions...',
    'Merging critical improvements...',
    'Applying system-fit guidance...',
    'Preparing actionable tasks...'
  ];

  // Start transforming animation whenever a new token arrives and tasks exist
  React.useEffect(() => {
    if (!transformToken || tasks.length === 0) return;
    setTransforming(true);
    setStep(0);
  }, [transformToken, tasks.length]);

  React.useEffect(() => {
    if (!transforming) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= simSteps.length) {
        clearInterval(id);
        setTimeout(() => setTransforming(false), 200);
      }
    }, 800);
    return () => clearInterval(id);
  }, [transforming]);

  // Trigger planning when asked and tasks exist
  React.useEffect(() => {
    if (!planToken || tasks.length === 0) return;
    planTasks(tasks);
  }, [planToken, tasks, planTasks]);

  const grouped = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    const label = (t: TaskItem) => {
      try {
        if (!t || typeof t !== 'object') return 'Other';
        const src: any = (t as any).source || {};
        const kind = src.kind as string | undefined;
        if (kind === 'critical') return 'Critical Improvements';
        if (kind === 'ats') return 'System Fit';
        if (kind === 'industry') return 'Industry-Specific';
        if (kind === 'section') {
          const name = (src.section || '').toString().trim();
          return name ? `Section: ${name}` : 'Section Suggestions';
        }
      } catch {}
      return 'Other';
    };
    for (const raw of (Array.isArray(tasks) ? tasks : [])) {
      if (!raw || typeof raw !== 'object') continue;
      const t = raw as TaskItem;
      const key = label(t);
      if (!map.has(key)) map.set(key, []);
      const arr = map.get(key)!;
      if ((t as any).id && (t as any).text) arr.push(t);
    }
    return Array.from(map.entries());
  }, [tasks]);

  const toMarkdown = () => {
    const lines: string[] = ['# Atlas Tasks'];
    (Array.isArray(grouped) ? grouped : []).forEach((entry) => {
      if (!Array.isArray(entry)) return;
      const [label, items] = entry as [string, TaskItem[]];
      lines.push(`\n## ${label}`);
      (Array.isArray(items) ? items : []).forEach((t) => {
        if (!t) return;
        const mark = checked[t.id] ? 'x' : ' ';
        lines.push(`- [${mark}] ${t.text}`);
      });
    });
    return lines.join('\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown());
      toast.success('Copied tasks to clipboard');
    } catch (e) {
      console.error('copy failed', e);
      toast.error('Copy failed');
    }
  };

  const download = () => {
    const blob = new Blob([toMarkdown()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlas-tasks.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!tasks.length) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4">
          <svg width="140" height="90" viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="20" width="120" height="60" rx="12" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.25)" />
            <rect x="25" y="35" width="90" height="6" rx="3" fill="rgba(59,130,246,0.35)" />
            <rect x="25" y="47" width="72" height="6" rx="3" fill="rgba(148,163,184,0.6)" />
            <rect x="25" y="59" width="54" height="6" rx="3" fill="rgba(148,163,184,0.4)" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">No tasks yet</h3>
        <p className="text-sm text-slate-600 mb-4">Generate tasks from your latest analysis.</p>
        <button
          onClick={onGenerateFromAnalysis}
          className="btn btn-primary !rounded-lg px-4 py-2 text-sm"
        >
          Generate from analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={copy} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-sm">
          <ClipboardCopy className="w-4 h-4" /> Copy as Markdown
        </button>
        <button onClick={download} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm dark:bg-white/10 dark:text-slate-200">
          <Download className="w-4 h-4" /> Download .md
        </button>
        <div className="mx-2 h-6 w-px bg-slate-200" />
        <button
          onClick={() => {
            const safe = (Array.isArray(tasks) ? tasks : []).filter((t: any) => t && t.id && t.text && t.source && t.source.kind);
            planTasks(safe as TaskItem[]);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg btn btn-primary text-white text-sm shadow-sm"
        >
          {planning ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Plan with Atlas
        </button>
        <div className="ml-auto inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-white/10 p-1">
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${view==='list'?'bg-white shadow':'text-slate-600'}`}
            title="List view"
          >
            <ListChecks className="w-4 h-4" /> List
          </button>
          <button
            onClick={() => setView('grid')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${view==='grid'?'bg-white shadow':'text-slate-600'}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" /> Grid
          </button>
        </div>
      </div>

      {/* Planning summary banner */}
      {plan && Array.isArray(plan.buckets) && (
        <MotionCard className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-500">Estimated completion</div>
              <div className="text-xl font-bold text-slate-800">
                {plan.totalHoursMin}–{plan.totalHoursMax} hours
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {plan.buckets.map((b) => (
                <span key={b.label} className="inline-block mr-3">
                  <strong>{b.label}</strong>: {Number((b as any).estHours).toFixed(1)}h
                </span>
              ))}
            </div>
          </div>
          {error && <div className="mt-2 text-xs text-amber-600">Used heuristic fallback: {error}</div>}
        </MotionCard>
      )}

      {/* Transforming animation (in-page) */}
      {transforming && tasks.length > 0 && (
        <div className="rounded-2xl p-6 sm:p-8 text-center card">
          <h4 className="text-lg font-semibold text-slate-800 mb-2">Transforming</h4>
          <p className="text-sm text-slate-600 mb-6">Generating structured tasks from your analysis</p>
          <div className="relative overflow-hidden rounded-full h-2 ocean-progress mb-6">
            <div
              className="absolute left-0 top-0 h-full ocean-progress-bar"
              style={{ width: `${Math.min((step / simSteps.length) * 100, 100)}%` }}
            />
          </div>
          <div className="text-left max-w-md mx-auto space-y-2">
            {simSteps.map((label, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full ${idx === step ? 'bg-v-turquoise animate-pulse' : idx < step ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className={`${idx <= step ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!transforming && view === 'list' && grouped.map((entry, i) => {
        if (!Array.isArray(entry)) return null;
        const [label, items] = entry as [string, TaskItem[]];
        return (
        <MotionCard key={label} className="p-4" delay={i * 0.05}>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-600">{label}</h4>
            <div className="h-1 w-24 rounded-full bg-v-turquoise opacity-60" />
          </div>
          <ul className="space-y-3">
            {items.filter(Boolean).map((t) => (
              <li key={t.id} className="flex items-start gap-3">
                <input
                  id={t.id}
                  type="checkbox"
                  className="mt-1.5 h-4 w-4 rounded-sm text-v-turquoise focus:ring-v-turquoise"
                  checked={!!checked[t.id]}
                  onChange={(e) => setChecked((c) => ({ ...c, [t.id]: e.target.checked }))}
                />
                <label htmlFor={t.id} className="text-slate-800 leading-relaxed">
                  {t.text}
                </label>
              </li>
            ))}
          </ul>
        </MotionCard>
      );})}

      {!transforming && view === 'grid' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.map((entry, i) => {
            if (!Array.isArray(entry)) return null;
            const [label, items] = entry as [string, TaskItem[]];
            return (
            <MotionCard key={label} className="p-6 hover:shadow-xl transition-shadow duration-300" delay={i * 0.05}>
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-bold text-slate-800">{label}</h4>
                <div className="w-20 h-1 rounded-full bg-v-turquoise/70" />
              </div>
              <ul className="space-y-3">
                {items.filter(Boolean).map((t) => (
                  <li key={t.id} className="flex items-start gap-3">
                    <input
                      id={t.id}
                      type="checkbox"
                      className="mt-1.5 h-4 w-4 rounded-sm text-v-turquoise focus:ring-v-turquoise"
                      checked={!!checked[t.id]}
                      onChange={(e) => setChecked((c) => ({ ...c, [t.id]: e.target.checked }))}
                    />
                    <label htmlFor={t.id} className="text-slate-800 leading-relaxed">
                      {t.text}
                    </label>
                  </li>
                ))}
              </ul>
            </MotionCard>
          );})}
        </div>
      )}
    </div>
  );
};
