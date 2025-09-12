import React from 'react';

interface ScoreCardProps {
  title: string;
  score: number;
  suggestions: string[];
  forceExpanded?: boolean; // kept for compatibility; content is always expanded now
}

export const ScoreCard: React.FC<ScoreCardProps> = ({ title, score, suggestions }) => {
  const allItems = Array.isArray(suggestions) ? suggestions : [];
  const items = allItems.slice(0, 5);

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

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <div className="export-block bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <div
            className={`inline-flex h-6 min-w-[64px] items-center justify-center rounded-full px-2 text-[12px] font-semibold leading-none ${getScoreBgColor(score)} ${getScoreColor(score)}`}
          >
            {score}/100
          </div>
        </div>
        
        <div className="mb-4">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 bg-gradient-to-r ${getProgressColor(score)}`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between w-full text-left text-blue-600 select-none">
          <span className="font-medium">suggestions</span>
        </div>
      </div>
      
      <div className="border-t border-slate-200 p-6 bg-slate-50 dark:bg-white/[0.04]">
        <ul className="space-y-3">
          {items.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-slate-700 text-sm leading-relaxed">{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
