import React, { useMemo, useState } from 'react';
import { InterviewGuide } from './components/InterviewGuide';
import { FileUpload } from './components/FileUpload';
import { AnalysisResults } from './components/AnalysisResults';
import { ChatAssistant } from './components/ChatAssistant';
import { AskView } from './components/AskView';
import { DashboardLayout } from './components/DashboardLayout';
import { TasksView } from './components/TasksView';
import type { TaskItem } from './components/TaskPanel';

export interface ResumeAnalysis {
  overallScore: number;
  sections: {
    contact: { score: number; suggestions: string[] };
    summary: { score: number; suggestions: string[] };
    experience: { score: number; suggestions: string[] };
    skills: { score: number; suggestions: string[] };
    education: { score: number; suggestions: string[] };
    formatting: { score: number; suggestions: string[] };
  };
  keyStrengths: string[];
  criticalImprovements: string[];
  atsOptimization: string[];
  industrySpecific: string[];
}

function App() {
  const [currentView, setCurrentView] = useState<'ask' | 'guide' | 'upload' | 'analysis' | 'tasks'>('guide');
  const [analysisData, setAnalysisData] = useState<ResumeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksTransformToken, setTasksTransformToken] = useState<string | null>(null);
  const [tasksPlanToken, setTasksPlanToken] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState<string>('');

  // Persist tasks in localStorage
  React.useEffect(() => {
    try {
      // Prefer Varuna key; migrate from old Wingman key if present
      const savedVaruna = localStorage.getItem('varuna:tasks');
      const savedWingman = localStorage.getItem('wingman:tasks');
      const saved = savedVaruna || savedWingman;
      if (saved) {
        const parsed = JSON.parse(saved) as TaskItem[];
        if (Array.isArray(parsed)) setTasks(parsed);
        if (!savedVaruna && savedWingman) {
          localStorage.setItem('varuna:tasks', savedWingman);
        }
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('varuna:tasks', JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  function deriveCandidateName(file: File): string {
    try {
      let base = file.name.replace(/\.[^.]+$/, '');
      // Split on common separators and take the first segment
      const first = base.split(/[\-–—|•·]+/)[0];
      // Clean common suffix words
      let cleaned = first
        .replace(/[_\.]+/g, ' ')
        .replace(/\b(resume|cv|profile|updated|final|draft|copy|v\d+)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      // Title-case words (keep original casing for all-caps initials)
      cleaned = cleaned
        .split(' ')
        .filter(Boolean)
        .map((w) => (w.length <= 3 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join(' ');
      return cleaned;
    } catch {
      return '';
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsAnalyzing(true);
    try {
      // Best-effort candidate name from file name (exclude designations)
      const nameFromFile = file ? deriveCandidateName(file) : '';
      if (nameFromFile) setCandidateName(nameFromFile);
      let payload: any = {};
      if (file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        // Convert ArrayBuffer to base64
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)) as number[]);
        }
        const base64 = btoa(binary);
        payload = { pdfBase64: base64, filename: file.name };
      } else {
        const text = await file.text();
        payload = { text, filename: file.name };
      }
      const recruiter = (() => {
        try { return localStorage.getItem('varuna:recruiterEmail') || ''; } catch { return ''; }
      })();
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(recruiter ? { 'X-Recruiter-Email': recruiter } : {}) },
        body: JSON.stringify({ ...payload, candidateName })
      });
      if (!resp.ok) {
        let detail = '';
        try {
          const err = await resp.json();
          detail = err?.error || JSON.stringify(err);
        } catch {
          detail = await resp.text();
        }
        throw new Error(`Analysis failed: ${resp.status} ${detail}`);
      }
      const result = await resp.json();
      const normalized = normalizeAnalysis(result);
      setAnalysisData(normalized);
      setCurrentView('analysis');
    } catch (err) {
      console.error('AI analysis error', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(`AI analysis failed: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Ensure incoming AI output always matches the expected shape
  function normalizeAnalysis(raw: any): ResumeAnalysis {
    const clamp = (n: any) => {
      const x = Math.round(Number(n));
      if (Number.isFinite(x)) return Math.max(0, Math.min(100, x));
      return 0;
    };
    const arr = (v: any): string[] => {
      if (Array.isArray(v)) return v.map((s) => String(s)).filter(Boolean);
      if (typeof v === 'string') return v.split(/\r?\n|\u2022|\-|\•/).map((s) => s.trim()).filter(Boolean);
      return [];
    };
    const pick = (obj: any, paths: string[]): any => {
      for (const p of paths) {
        const val = p.split('.').reduce((o: any, k: string) => (o ? o[k] : undefined), obj);
        if (val !== undefined && val !== null && (Array.isArray(val) ? val.length : String(val).length)) return val;
      }
      return undefined;
    };
    const section = (s: any) => ({
      score: clamp(s?.score),
      suggestions: arr(s?.suggestions),
    });

    const sections = raw?.sections || {};
    const normalized: ResumeAnalysis = {
      overallScore: clamp(raw?.overallScore),
      sections: {
        contact: section(sections.contact),
        summary: section(sections.summary),
        experience: section(sections.experience),
        skills: section(sections.skills),
        education: section(sections.education),
        formatting: section(sections.formatting),
      },
      keyStrengths: arr(
        pick(raw, ['keyStrengths', 'key_strengths', 'insights.keyStrengths', 'insights.key_strengths'])
      ),
      criticalImprovements: arr(
        pick(raw, ['criticalImprovements', 'critical_improvements', 'insights.criticalImprovements', 'insights.critical_improvements'])
      ),
      atsOptimization: arr(
        pick(raw, ['atsOptimization', 'ats_optimization', 'atsOptimizationTips', 'tips.atsOptimization'])
      ),
      industrySpecific: arr(
        pick(raw, ['industrySpecific', 'industry_specific', 'industrySpecificTips', 'tips.industrySpecific'])
      ),
    };
    return normalized;
  }

  const handleReset = () => {
    setCurrentView('guide');
    setAnalysisData(null);
    setIsAnalyzing(false);
  };

  const handleStartAnalysis = () => {
    setCurrentView('upload');
  };

  const generateTasksFromAnalysis = (analysis: ResumeAnalysis): TaskItem[] => {
    const items: TaskItem[] = [];
    Object.entries(analysis.sections).forEach(([section, data]) => {
      (data.suggestions || []).forEach((text, idx) => {
        items.push({ id: `section-${section}-${idx}`, text, source: { kind: 'section', section } });
      });
    });
    (analysis.criticalImprovements || []).forEach((text, idx) => {
      items.push({ id: `critical-${idx}`, text, source: { kind: 'critical' } });
    });
    (analysis.atsOptimization || []).forEach((text, idx) => {
      items.push({ id: `ats-${idx}`, text, source: { kind: 'ats' } });
    });
    (analysis.industrySpecific || []).forEach((text, idx) => {
      items.push({ id: `industry-${idx}`, text, source: { kind: 'industry' } });
    });
    return items;
  };

  const pageTitle =
    currentView === 'ask'
      ? 'Ask Varuna'
      : currentView === 'guide'
      ? 'Interview Guide'
      : currentView === 'upload'
      ? 'Upload & Analyze'
      : currentView === 'analysis'
      ? 'Analysis Results'
      : 'Tasks';

  const pageSubtitle =
    currentView === 'ask'
      ? 'Quick answers with inline sources and follow-ups.'
      : currentView === 'guide'
      ? "Prep with structured guidance and examples."
      : currentView === 'upload'
      ? "Upload a resume PDF or paste text; we'll analyze it."
      : currentView === 'analysis'
      ? 'Scores, strengths, and actionable improvements.'
      : 'Track actionable items derived from your analysis.';

  return (
    <DashboardLayout
      current={currentView}
      analysisAvailable={!!analysisData}
      tasksAvailable={tasks.length > 0}
      tasksCount={tasks.length}
      onNavigate={(v) => {
        if (v === 'analysis' && !analysisData) return;
        setCurrentView(v);
      }}
      onOpenChat={() => setChatOpen(true)}
    >
      {/* Page header */}
      <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
          <p className="text-sm text-slate-600">{pageSubtitle}</p>
        </div>
      </section>

      {/* Main content panels */}
      {currentView === 'ask' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <AskView />
        </section>
      )}

      {currentView === 'guide' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm neo-card">
          <InterviewGuide onStartAnalysis={handleStartAnalysis} />
        </section>
      )}

      {currentView === 'upload' && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm neo-card">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Upload your resume</h2>
            <p className="text-sm text-slate-600">PDF recommended. We’ll extract text locally for analysis.</p>
          </div>
          <FileUpload onFileUpload={handleFileUpload} isAnalyzing={isAnalyzing} />
        </section>
      )}

      {currentView === 'analysis' && analysisData && (
        <section className="rounded-xl border border-slate-200 bg-white p-2 sm:p-3 md:p-4 shadow-sm neo-card">
          <AnalysisResults
            analysis={analysisData}
            candidateName={candidateName}
            onReset={handleReset}
            onCreateTasks={(ts) => {
              setTasks(ts);
              setCurrentView('tasks');
              setTasksTransformToken(String(Date.now()));
            }}
            onPlanTasks={() => {
              if (analysisData) {
                const ts = generateTasksFromAnalysis(analysisData);
                setTasks(ts);
                setCurrentView('tasks');
                const now = String(Date.now());
                setTasksTransformToken(now);
                setTasksPlanToken(now);
              }
            }}
        />
      </section>
    )}

    {currentView === 'tasks' && (
      <section className="rounded-xl border border-slate-200 bg-white p-2 sm:p-3 md:p-4 shadow-sm neo-card">
        <TasksView
          tasks={tasks}
          onGenerateFromAnalysis={() => {
            if (analysisData) {
                setTasks(generateTasksFromAnalysis(analysisData));
                setTasksTransformToken(String(Date.now()));
            } else {
              setCurrentView('upload');
            }
          }}
          transformToken={tasksTransformToken}
          planToken={tasksPlanToken}
        />
      </section>
    )}

      {/* Chat Assistant */}
      <ChatAssistant open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* No side panel in the new flow */}
    </DashboardLayout>
  );
}

export default App;
