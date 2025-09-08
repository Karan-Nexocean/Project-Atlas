import React from 'react';
import { TrendingUp, Anchor, ShipWheel } from 'lucide-react';
import { IconBadge } from './IconBadge';

export const Hero: React.FC = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6">
            Your AI Resume
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-v-turquoise to-v-turquoise">
              {' '}Varuna
            </span>
          </h2>
          
          <p className="text-xl text-slate-600 mb-12 leading-relaxed">
            Get instant, actionable feedback on your resume. Varuna analyzes your resume 
            against industry standards and provides specific improvements to help you land your dream job.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="mb-4 mx-auto w-12">
                <IconBadge size={48}>
                  <TrendingUp className="w-6 h-6" />
                </IconBadge>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Instant Analysis</h3>
              <p className="text-slate-600">Advanced AI scans your resume in seconds and identifies improvement opportunities</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="mb-4 mx-auto w-12">
                <IconBadge size={48}>
                  <Anchor className="w-6 h-6" />
                </IconBadge>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Actionable Feedback</h3>
              <p className="text-slate-600">Get specific, actionable suggestions with examples to implement immediately</p>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="mb-4 mx-auto w-12">
                <IconBadge size={48}>
                  <ShipWheel className="w-6 h-6" />
                </IconBadge>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">ATS Optimized</h3>
              <p className="text-slate-600">Ensure your resume passes Applicant Tracking Systems and reaches human recruiters</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
