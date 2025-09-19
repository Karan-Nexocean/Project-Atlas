import React, { useState } from 'react';
import { InterviewGuide } from './components/InterviewGuide';
import { FileUpload } from './components/FileUpload';
import { AnalysisResults } from './components/AnalysisResults';
// Side panel chat replaced by standalone view
import { ChatPage } from './components/ChatPage';
import { DashboardLayout } from './components/DashboardLayout';
import { TasksView } from './components/TasksView';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { TaskItem } from './types/tasks';
import { useToast } from './components/toast';

export interface ResumeAnalysis {
  overallScore: number;
  sections: {
    contact: { score: number; suggestions: string[] };
    summary: { score: number; suggestions: string[] };
    experience: { score: number; suggestions: string[] };
    skills: { score: number; suggestions: string[] };
    education: { score: number; suggestions: string[] };
    formatting: { score: number; suggestions: string[] };
    stability: { score: number; suggestions: string[] };
  };
  keyStrengths: string[];
  criticalImprovements: string[];
  atsOptimization: string[];
  industrySpecific: string[];
}

function App() {
  const [currentView, setCurrentView] = useState<'guide' | 'upload' | 'analysis' | 'tasks' | 'chat'>('guide');
  const [analysisData, setAnalysisData] = useState<ResumeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Removed side-panel chat state; using dedicated view instead
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksTransformToken, setTasksTransformToken] = useState<string | null>(null);
  const [tasksPlanToken, setTasksPlanToken] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState<string>('');
  const toast = useToast();

  // Persist tasks in localStorage (migrate Wingman -> Varuna -> Atlas)
  React.useEffect(() => {
    try {
      // Prefer Atlas key; migrate from older keys if present
      const savedAtlas = localStorage.getItem('atlas:tasks');
      const savedVaruna = localStorage.getItem('varuna:tasks');
      const savedWingman = localStorage.getItem('wingman:tasks');
      const saved = savedAtlas || savedVaruna || savedWingman;
      if (saved) {
        const parsed = JSON.parse(saved) as TaskItem[];
        if (Array.isArray(parsed)) setTasks(parsed);
        // Migrate forward to Atlas
        if (!savedAtlas) localStorage.setItem('atlas:tasks', saved);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('atlas:tasks', JSON.stringify(tasks));
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
    // When a new resume is added/analyzed, clear previous tasks/state
    try {
      setTasks([]);
      setTasksTransformToken(null);
      setTasksPlanToken(null);
      try { localStorage.removeItem('atlas:tasks'); localStorage.removeItem('varuna:tasks'); } catch {}
    } catch {}
    setIsAnalyzing(true);
    try {
      // Best-effort candidate name from file name (exclude designations)
      const nameFromFile = file ? deriveCandidateName(file) : '';
      setCandidateName(nameFromFile);
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
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, candidateName: nameFromFile })
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
      toast.error(`AI analysis failed: ${message}`);
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
        stability: section(sections.stability),
      },
      keyStrengths: arr(
        pick(raw, [
          'keyStrengths',
          'key_strengths',
          'insights.keyStrengths',
          'insights.key_strengths',
          'strengths',
          'topStrengths',
          'insights.strengths',
        ])
      ),
      criticalImprovements: arr(
        pick(raw, [
          'criticalImprovements',
          'critical_improvements',
          'insights.criticalImprovements',
          'insights.critical_improvements',
          'improvements',
          'majorImprovements',
          'criticalFixes',
          'insights.improvements',
          'gaps',
          'weaknesses',
        ])
      ),
      atsOptimization: arr(
        pick(raw, [
          'atsOptimization',
          'ats_optimization',
          'atsOptimizationTips',
          'tips.atsOptimization',
          'atsOptimisation',
          'ats_optimisation',
          'tips.atsOptimisation',
          'ats',
          'atsTips',
          'tips.ats',
        ])
      ),
      industrySpecific: arr(
        pick(raw, [
          'industrySpecific',
          'industry_specific',
          'industrySpecificTips',
          'tips.industrySpecific',
          'industryTips',
          'tips.industry',
          'sectorSpecific',
        ])
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
    const pushIf = (obj: Partial<TaskItem>) => {
      const id = String(obj.id || '').trim();
      const text = String(obj.text || '').trim();
      if (!id || !text) return;
      const source = (obj as any).source || { kind: 'critical' };
      items.push({ id, text, source } as TaskItem);
    };
    Object.entries(analysis.sections).forEach(([section, data]) => {
      (data.suggestions || [])
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .forEach((text, idx) => {
          pushIf({ id: `section-${section}-${idx}`, text, source: { kind: 'section', section } });
        });
    });
    (analysis.criticalImprovements || [])
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean)
      .forEach((text, idx) => {
        pushIf({ id: `critical-${idx}`, text, source: { kind: 'critical' } });
      });
    (analysis.atsOptimization || [])
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean)
      .forEach((text, idx) => {
        pushIf({ id: `ats-${idx}`, text, source: { kind: 'ats' } });
      });
    (analysis.industrySpecific || [])
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean)
      .forEach((text, idx) => {
        pushIf({ id: `industry-${idx}`, text, source: { kind: 'industry' } });
      });
    return items;
  };

  const pageTitle =
    currentView === 'chat'
      ? 'Atlas Assistant'
      : currentView === 'guide'
      ? 'Interview Guide'
      : currentView === 'upload'
      ? 'Upload & Analyze'
      : currentView === 'analysis'
      ? 'Analysis Results'
      : 'Tasks';

  const pageSubtitle =
    currentView === 'chat'
      ? 'Context-aware help across uploads, scores, suggestions, and tasks.'
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
      onOpenChat={() => setCurrentView('chat')}
    >
      <ErrorBoundary>
      {/* Page header (hidden on Interview Guide) */}
      {currentView !== 'guide' && (
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
            <p className="text-sm text-slate-600">{pageSubtitle}</p>
          </div>
        </section>
      )}

      {/* Main content panels */}
      {/* Removed legacy Ask view; use Atlas Assistant instead */}

      {currentView === 'guide' && (
        <section className="card p-4 sm:p-6">
          <InterviewGuide onStartAnalysis={handleStartAnalysis} />
        </section>
      )}

      {currentView === 'upload' && (
        <section className="card p-4 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Upload your resume</h2>
            <p className="text-sm text-slate-600">PDF recommended. We’ll extract text locally for analysis.</p>
          </div>
          <FileUpload onFileUpload={handleFileUpload} isAnalyzing={isAnalyzing} />
        </section>
      )}

      {currentView === 'analysis' && analysisData && (
        <section className="card p-2 sm:p-3 md:p-4">
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
        <section className="card p-2 sm:p-3 md:p-4">
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

      {currentView === 'chat' && (
        <ChatPage analysis={analysisData} tasks={tasks} candidateName={candidateName} />
      )}

      {/* No side panel in the new flow */}
      </ErrorBoundary>
    </DashboardLayout>
  );
}

export default App;
