import React from 'react';
import { Brain, Target, Waves, MessageSquare } from 'lucide-react';
import { IconBadge } from './IconBadge';

export const Header: React.FC<{ onOpenChat?: () => void }> = ({ onOpenChat }) => {
  return (
    <header className="bg-white/85 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <IconBadge>
                <Waves className="w-7 h-7" />
              </IconBadge>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Varuna</h1>
              <p className="text-sm text-slate-600">Resume Analysis by Wingman · Nexocean</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-slate-600">
              <Target className="w-4 h-4" />
              <span className="text-sm">Interview Guide</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-600">
              <Brain className="w-4 h-4" />
              <span className="text-sm">AI Resume Analysis</span>
            </div>
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center gap-2 rounded-lg btn-gradient text-white px-3 py-2 text-sm shadow-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
          </div>
          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              aria-label="Open chat"
              onClick={onOpenChat}
              className="p-2 rounded-lg btn-gradient text-white shadow-sm"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
