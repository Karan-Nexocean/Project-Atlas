import React, { useMemo, useState } from 'react';
import { ResumeAnalysis } from '../App';
import { generateReportPDF, exportElementAsPDF, exportAnalysisAsPDFTwoPage } from '../utils/report';
import { ScoreCard } from './ScoreCard';
import { SuggestionCard } from './SuggestionCard';
import { ArrowLeft, Download, ShipWheel, Anchor, Waves, Sailboat } from 'lucide-react';
import type { TaskItem } from './TaskPanel';
import { estimatePlanFromTasks } from '../utils/plan';

interface AnalysisResultsProps {
  analysis: ResumeAnalysis;
  candidateName?: string;
  onReset: () => void;
  onCreateTasks?: (tasks: TaskItem[]) => void;
  onPlanTasks?: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysis, candidateName, onReset, onCreateTasks, onPlanTasks }) => {
  const exportRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [reportName, setReportName] = useState<string>(candidateName || '');
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const tasks: TaskItem[] = useMemo(() => {
    const items: TaskItem[] = [];
    // Section suggestions
    Object.entries(analysis.sections).forEach(([section, data]) => {
      (data.suggestions || []).forEach((text, idx) => {
        items.push({ id: `section-${section}-${idx}`, text, source: { kind: 'section', section } });
      });
    });
    // Critical improvements
    (analysis.criticalImprovements || []).forEach((text, idx) => {
      items.push({ id: `critical-${idx}`, text, source: { kind: 'critical' } });
    });
    // ATS optimization
    (analysis.atsOptimization || []).forEach((text, idx) => {
      items.push({ id: `ats-${idx}`, text, source: { kind: 'ats' } });
    });
    // Industry specific
    (analysis.industrySpecific || []).forEach((text, idx) => {
      items.push({ id: `industry-${idx}`, text, source: { kind: 'industry' } });
    });
    return items;
  }, [analysis]);

  return (
    <>
    <div className="container mx-auto px-4 py-8" ref={exportRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8" data-html2canvas-ignore>
        <button
          data-html2canvas-ignore="true"
          onClick={onReset}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Upload New Resume</span>
        </button>
        
        <button
          data-html2canvas-ignore="true"
          onClick={() => setNameModalOpen(true)}
          className="flex items-center space-x-2 btn-gradient text-white px-6 py-3 rounded-lg hover:opacity-95 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download Report</span>
        </button>
      </div>

      {/* Overall Score */}
      <div className="export-block neo-card rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Resume Analysis Complete</h2>
          <div className="flex items-center justify-center space-x-4">
            <div className={`text-6xl font-bold ${getScoreColor(analysis.overallScore)}`}>
              {analysis.overallScore}
            </div>
            <div className="text-left">
              <p className="text-lg font-semibold text-slate-700">Overall Score</p>
              <p className="text-slate-500">Out of 100</p>
            </div>
          </div>
          
          <div className="mt-6 w-full ocean-progress h-3">
            <div className="ocean-progress-bar rounded-full" style={{ width: `${analysis.overallScore}%` }} />
          </div>
        </div>
      </div>

      {/* Section Scores */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {Object.entries(analysis.sections).map(([section, data]) => (
          <ScoreCard
            key={section}
            title={section.charAt(0).toUpperCase() + section.slice(1)}
            score={data.score}
            suggestions={data.suggestions}
            forceExpanded={exporting}
          />
        ))}
      </div>

      {/* Key Insights + Detailed Recommendations (wrapped for first-page export) */}
      <div ref={suggestionsRef} className="space-y-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <SuggestionCard
            title="Key Strengths"
            icon={<ShipWheel className="w-6 h-6" />}
            items={analysis.keyStrengths}
            variant="success"
          />
          
          <SuggestionCard
            title="Critical Improvements"
            icon={<Anchor className="w-6 h-6" />}
            items={analysis.criticalImprovements}
            variant="warning"
          />
        </div>

        {/* Detailed Recommendations */}
        <div className="grid lg:grid-cols-2 gap-8">
          <SuggestionCard
            title="System Fit"
            icon={<Waves className="w-6 h-6" />}
            items={analysis.atsOptimization}
            variant="info"
          />
          
          <SuggestionCard
            title="Industry-Specific Tips"
            icon={<Sailboat className="w-6 h-6" />}
            items={analysis.industrySpecific}
            variant="secondary"
          />
        </div>
      </div>

      {/* Action Items */}
      <div className="btn-gradient rounded-2xl p-8 mt-12 text-white text-center" data-html2canvas-ignore>
        <h3 className="text-2xl font-bold mb-4">Ask Varuna to plan your tasks?</h3>
        <p className="mb-6 opacity-90">
          Varuna can help you to implement these suggestions and increase your chance of landing you interviews
        </p>
        <div className="flex justify-center">
          <button
            onClick={() => { onPlanTasks?.(); }}
            className="bg-white/10 border-2 border-white/60 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-v-turquoise transition-colors"
            data-html2canvas-ignore="true"
          >
            Ask Varuna to Plan Tasks
          </button>
        </div>
      </div>
      {/* TaskPanel removed here; it only appears within the Tasks section now. */}
    </div>
    {/* Report name modal */}
    {nameModalOpen && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center" data-html2canvas-ignore>
        <div className="absolute inset-0 bg-black/40" onClick={() => setNameModalOpen(false)} />
        <div className="relative w-[92vw] max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
          <h4 className="text-lg font-semibold text-slate-800 mb-2">Name your report</h4>
          <p className="text-sm text-slate-600 mb-4">This name will appear at the top of page 1 and be used as the file name.</p>
          <input
            type="text"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder={candidateName || 'Candidate Name'}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-v-turquoise/40"
          />
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setNameModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800">Cancel</button>
            <button
              onClick={async () => {
                const headerName = (reportName || candidateName || '').trim();
                const baseFile = headerName ? `${headerName} - Varuna Resume Analysis.pdf` : 'varuna-resume-analysis.pdf';
                setNameModalOpen(false);
                if (exportRef.current) {
              try {
                setExporting(true);
                await new Promise((r) => requestAnimationFrame(() => r(null)));
                if (suggestionsRef.current) {
                  const eta = estimatePlanFromTasks(tasks);
                  await exportAnalysisAsPDFTwoPage(
                    exportRef.current,
                    suggestionsRef.current,
                    baseFile,
                    0.9,
                    {
                      candidateName: headerName || undefined,
                      overallScore: analysis.overallScore,
                      etaMinutesMin: eta.minMinutes,
                      etaMinutesMax: eta.maxMinutes,
                    }
                  );
                } else {
                  const eta = estimatePlanFromTasks(tasks);
                  await exportElementAsPDF(
                    exportRef.current,
                    baseFile,
                    {
                      candidateName: headerName || undefined,
                      overallScore: analysis.overallScore,
                      etaMinutesMin: eta.minMinutes,
                      etaMinutesMax: eta.maxMinutes,
                    }
                  );
                }
                setExporting(false);
                return;
              } catch (e) {
                    console.warn('UI export failed, using structured PDF', e);
                    setExporting(false);
                  }
                }
                await generateReportPDF(analysis, { candidateName: headerName || undefined });
              }}
              className="px-4 py-2 rounded-xl btn-gradient text-white"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
