import React, { useMemo, useState } from 'react';
import { TaskItem } from './TaskPanel';
import { ClipboardCopy, Download, Inbox, LayoutGrid, ListChecks, Wand2, Loader } from 'lucide-react';
import { useTaskPlanner } from '../hooks/useTaskPlanner';

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
      switch (t.source.kind) {
        case 'critical':
          return 'Critical Improvements';
        case 'ats':
          return 'System Fit';
        case 'industry':
          return 'Industry-Specific';
        case 'section':
          return `Section: ${t.source.section}`;
      }
    };
    tasks.forEach((t) => {
      const key = label(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries());
  }, [tasks]);

  const toMarkdown = () => {
    const lines: string[] = ['# Varuna Tasks'];
    grouped.forEach(([label, items]) => {
      lines.push(`\n## ${label}`);
      items.forEach((t) => {
        const mark = checked[t.id] ? 'x' : ' ';
        lines.push(`- [${mark}] ${t.text}`);
      });
    });
    return lines.join('\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toMarkdown());
      alert('Copied tasks to clipboard');
    } catch (e) {
      console.error('copy failed', e);
    }
  };

  const download = () => {
    const blob = new Blob([toMarkdown()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'varuna-tasks.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-lg bg-slate-100 grid place-items-center mb-3">
          <Inbox className="w-6 h-6 text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">No tasks yet</h3>
        <p className="text-sm text-slate-600 mb-4">Generate tasks from your latest analysis.</p>
        <button
          onClick={onGenerateFromAnalysis}
          className="inline-flex items-center gap-2 rounded-lg btn-gradient text-white px-4 py-2 text-sm shadow-sm"
        >
          Generate from analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={copy} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm">
          <ClipboardCopy className="w-4 h-4" /> Copy as Markdown
        </button>
        <button onClick={download} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm">
          <Download className="w-4 h-4" /> Download .md
        </button>
        <div className="mx-2 h-6 w-px bg-slate-200" />
        <button
          onClick={() => planTasks(tasks)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg btn-gradient text-white text-sm shadow-sm"
        >
          {planning ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Plan with Varuna
        </button>
        <div className="ml-auto inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
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
      {plan && (
        <div className="rounded-xl p-4 sm:p-5 neo-card border border-slate-200">
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
                  <strong>{b.label}</strong>: {b.estHours.toFixed(1)}h
                </span>
              ))}
            </div>
          </div>
          {error && <div className="mt-2 text-xs text-amber-600">Used heuristic fallback: {error}</div>}
        </div>
      )}

      {/* Transforming animation (in-page) */}
      {transforming && tasks.length > 0 && (
        <div className="rounded-2xl p-6 sm:p-8 text-center neo-card border border-slate-200">
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

      {!transforming && view === 'list' && grouped.map(([label, items]) => (
        <div key={label} className="rounded-xl neo-card border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-600">{label}</h4>
            <div className="h-1 w-24 rounded-full bg-v-turquoise opacity-60" />
          </div>
          <ul className="space-y-3">
            {items.map((t) => (
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
        </div>
      ))}

      {!transforming && view === 'grid' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grouped.map(([label, items]) => (
            <div key={label} className="border rounded-xl p-6 bg-white hover:shadow-lg transition-shadow duration-300">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-bold text-slate-800">{label}</h4>
                <div className="w-20 h-1 rounded-full bg-v-turquoise/70" />
              </div>
              <ul className="space-y-3">
                {items.map((t) => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
