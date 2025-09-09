import React, { useEffect, useMemo, useState } from 'react';
import { Loader, CheckCircle } from 'lucide-react';

export type TaskSource =
  | { kind: 'critical' }
  | { kind: 'section'; section: string }
  | { kind: 'ats' }
  | { kind: 'industry' };

export interface TaskItem {
  id: string;
  text: string;
  source: TaskSource;
}

interface TaskPanelProps {
  open: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  initialTransform?: boolean;
}

function sourceLabel(src: TaskSource): string {
  switch (src.kind) {
    case 'critical':
      return 'Critical Improvements';
    case 'ats':
      return 'System Fit';
    case 'industry':
      return 'Industry-Specific';
    case 'section':
      return `Section: ${src.section}`;
  }
}

export const TaskPanel: React.FC<TaskPanelProps> = ({ open, onClose, tasks, initialTransform = true }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [transforming, setTransforming] = useState(false);
  const [step, setStep] = useState(0);
  const simSteps = [
    'Reading analysis data...',
    'Aggregating section suggestions...',
    'Merging critical improvements...',
    'Applying system-fit guidance...',
    'Preparing actionable tasks...'
  ];

  useEffect(() => {
    if (open) {
      const init: Record<string, boolean> = {};
      tasks.forEach((t) => (init[t.id] = false));
      setChecked(init);
      if (initialTransform) {
        setTransforming(true);
        setStep(0);
      }
    }
  }, [open, tasks]);

  useEffect(() => {
    if (!transforming) return;
    let i = 0;
    setStep(0);
    const id = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= simSteps.length) {
        clearInterval(id);
        setTimeout(() => setTransforming(false), 200);
      }
    }, 800); // ~4.0s total
    return () => clearInterval(id);
  }, [transforming]);

  const grouped = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    tasks.forEach((t) => {
      const key = sourceLabel(t.source);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries());
  }, [tasks]);

  const allSelected = Object.values(checked).every(Boolean) && Object.keys(checked).length > 0;
  const toggleAll = (val?: boolean) => {
    const next: Record<string, boolean> = {};
    const v = val ?? !allSelected;
    tasks.forEach((t) => (next[t.id] = v));
    setChecked(next);
  };

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

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`absolute top-0 right-0 h-full w-full max-w-xl transform transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Tasks from analysis"
      >
        <div className="h-full p-3 sm:p-5">
          <div className="rounded-l-3xl h-full flex flex-col overflow-hidden bg-white shadow-xl border border-slate-200">
            {/* Header */}
            <div className="sticky top-0 z-10 p-5 flex items-center justify-between bg-transparent">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-800">Turn Into Tasks</h3>
                <p className="text-sm text-slate-500">{transforming ? 'Transforming suggestions into tasks...' : 'Aggregated suggestions from your analysis'}</p>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl neo-pressed text-slate-800 hover:opacity-90"
              >
                Close
              </button>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Actions */}
            <div className={`p-4 flex items-center gap-3 ${transforming ? 'opacity-50 pointer-events-none' : ''}` }>
              <button
                onClick={() => toggleAll()}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800"
              >
                {allSelected ? 'Unselect All' : 'Select All'}
              </button>
              <button
                onClick={copy}
                className="px-4 py-2 rounded-xl btn-gradient text-white shadow-md hover:opacity-95"
              >
                Copy as Markdown
              </button>
              <button
                onClick={download}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800"
              >
                Download .md
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-6 overflow-y-auto pretty-scrollbar">
              {transforming ? (
                <div className="rounded-2xl p-6 sm:p-8 text-center mb-6 bg-slate-50 border border-slate-200">
                  <div className="w-14 h-14 mx-auto mb-4 relative">
                    <Loader className="w-14 h-14 text-v-turquoise animate-spin" />
                  </div>
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
                        {idx < step ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <span className={`inline-block w-2 h-2 rounded-full ${idx === step ? 'bg-v-turquoise animate-pulse' : 'bg-slate-300'}`} />
                        )}
                        <span className={`${idx <= step ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <></>
              )}
              {!transforming && grouped.map(([label, items]) => (
                <div key={label} className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-600">{label}</h4>
                    <div className="h-1 w-24 rounded-full bg-v-turquoise opacity-60" />
                  </div>
                  <ul className="space-y-3">
                    {items.map((t) => (
                      <li key={t.id} className="rounded-2xl p-3 sm:p-4 flex items-start gap-3 neo-card border border-slate-200">
                        <div className="rounded-md p-1 bg-slate-100">
                          <input
                            id={t.id}
                            type="checkbox"
                            className="block h-4 w-4 rounded-sm text-v-turquoise focus:ring-v-turquoise"
                            checked={!!checked[t.id]}
                            onChange={(e) => setChecked((c) => ({ ...c, [t.id]: e.target.checked }))}
                          />
                        </div>
                        <label htmlFor={t.id} className="text-slate-800 leading-relaxed">
                          {t.text}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
