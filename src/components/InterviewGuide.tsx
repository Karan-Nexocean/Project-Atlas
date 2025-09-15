import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Target, BookOpen, Users, TrendingUp, CheckCircle, ArrowRight, Rocket } from 'lucide-react';
import { Hero } from './Hero';

interface InterviewGuideProps {
  onStartAnalysis: () => void;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: {
    subtitle?: string;
    points: string[];
    subSections?: {
      title: string;
      points: string[];
    }[];
  };
}

export const InterviewGuide: React.FC<InterviewGuideProps> = ({ onStartAnalysis }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  const guideSections: GuideSection[] = [
    {
      id: 'preparation',
      title: 'Preparation is Key',
      icon: <Target className="w-6 h-6 text-blue-600" />,
      content: {
        subtitle: 'Foundation for success starts with thorough preparation',
        points: [],
        subSections: [
          {
            title: 'Know the Role',
            points: [
              'Review the JD; map it to a Nexocean track (GTM / Product / Engineering) and stage (Explorer→Leader)',
              'List 3 bullets you\'ll lead with that match the track & stage',
              'Understand the specific requirements and expectations'
            ]
          },
          {
            title: 'Map to Nexocean Process',
            points: [
              'Bring quantified outcomes (%, #, ₹, time) for each recent role',
              'Highlight India context where relevant (Tier-2/3 adoption, UPI/ONDC, RBI/consent flows)',
              'Prepare 1–2 0→1 stories (from discovery to shipped impact)'
            ]
          },
          {
            title: 'Research Nexocean',
            points: [
              'Understand our founder-first, India-first lens',
              'Learn how we translate talent signals into outcomes',
              'Skim recent work, open roles, and expectations per track'
            ]
          },
          {
            title: 'Understand the Structure',
            points: [
              'Typical flow: Phone Screen → Skills Deep-Dive → Work Sample/Case → Behavioral & Values → Founder-Fit → Debrief',
              'Timeboxes: 30–60 minutes each; we prefer whiteboards/docs over slides'
            ]
          },
          {
            title: 'Bring Artifacts',
            points: [
              'Resume with metrics; portfolio/links',
              'Code/PRDs/Dashboards; GTM plans or experiments',
              'References (optional but valuable)'
            ]
          }
        ]
      }
    },
    {
      id: 'practice',
      title: 'Practice Makes Perfect',
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      content: {
        subtitle: 'Sharpen your skills with targeted practice',
        points: [],
        subSections: [
          {
            title: 'By Track',
            points: [
              'Startup GTM: pipeline math, CAC/LTV, activation/retention levers, basic cohort analysis',
              'Product: discovery→delivery loop, north-star metrics, A/B framing, PRD slicing, rollout/guardrails',
              'Engineering: systems you shipped, latency/throughput/SLA trade-offs, debugging approach, cost/perf optimizations'
            ]
          },
          {
            title: 'Mock Interviews',
            points: [
              'Use timeboxed prompts; narrate choices and trade-offs',
              'Record and review: are your metrics and business effects clear?',
              'Practice with peers or mentors in your field'
            ]
          },
          {
            title: 'Behavioral (STAR + Metrics)',
            points: [
              'Situation, Task, Action, Result — with numbers (%, #, ₹, time-to-value)',
              'Prepare 5 stories: impact, conflict, learning, leadership, failure',
              'Focus on quantifiable outcomes and learnings'
            ]
          }
        ]
      }
    },
    {
      id: 'during',
      title: 'During the Interview',
      icon: <Users className="w-6 h-6 text-blue-600" />,
      content: {
        subtitle: 'Execute with confidence and clarity',
        points: [
          'Communicate clearly: state assumptions, ask 1–2 clarifiers, outline your plan before diving in',
          'Collaborate: take feedback, show how you adapt; think out loud on trade-offs',
          'Show your work: code/diagram/SQL/PRD bullets; write as you think',
          'Quantify: tie steps to activation, retention, revenue, latency, cost, or risk reduction',
          'India lens: note infra/payments/data realities when applicable; don\'t over-index if not relevant',
          'Close strong: summarize decision, risks, next steps; ask 1–2 genuine questions'
        ]
      }
    },
    {
      id: 'lookingfor',
      title: 'What We Look For',
      icon: <CheckCircle className="w-6 h-6 text-indigo-600" />,
      content: {
        subtitle: 'Key qualities that make candidates successful at Nexocean',
        points: [],
        subSections: [
          {
            title: 'Technical / Role Mastery',
            points: [
              'Fundamentals for your function',
              'Judgment under constraints',
              'Shipped outcomes with measurable impact'
            ]
          },
          {
            title: 'Problem-Solving',
            points: [
              'Structured, creative approaches',
              'Trade-off awareness and decision-making',
              'Ability to land the plane and deliver results'
            ]
          },
          {
            title: 'Behavioral & Values',
            points: [
              'Ownership and accountability',
              'Candor and transparent communication',
              'Bias to action and respect in collaboration'
            ]
          },
          {
            title: 'Growth Mindset',
            points: [
              'Learning velocity and adaptability',
              'Reflection and self-awareness',
              'Ability to turn feedback into next-week changes'
            ]
          }
        ]
      }
    },
    {
      id: 'signals',
      title: 'Track Signals (Checklists)',
      icon: <BookOpen className="w-6 h-6 text-amber-600" />,
      content: {
        subtitle: 'Specific competencies we evaluate by track',
        points: [],
        subSections: [
          {
            title: 'GTM Track',
            points: [
              'Clear ICP (Ideal Customer Profile)',
              'Pipeline math and conversion metrics',
              'Experiment design and hypothesis testing',
              'Retention playbooks and customer success',
              'India GTM nuances and market understanding'
            ]
          },
          {
            title: 'Product Track',
            points: [
              'Problem framing and user research',
              'PRD slicing and feature prioritization',
              'Experiment/telemetry and data-driven decisions',
              'Launch/rollback strategies and risk management',
              'India user insights and localization'
            ]
          },
          {
            title: 'Engineering Track',
            points: [
              'Design clarity and system architecture',
              'Performance/latency math and optimization',
              'Reliability & cost considerations',
              'Code health and maintainability',
              'Pragmatic 0→1 shipping and delivery'
            ]
          }
        ]
      }
    },
    {
      id: 'after',
      title: 'After the Interview',
      icon: <ArrowRight className="w-6 h-6 text-emerald-600" />,
      content: {
        subtitle: 'Follow-up and continuous improvement',
        points: [
          'Reflect: what went well; what you\'d change next time',
          'Verify facts: follow up with any corrected numbers or links (brief)',
          'Thank you note: 4–6 lines: gratitude, 1–2 takeaways, crisp next-step fit',
          'Mutual fit: ask open questions about scope, success metrics, and constraints'
        ]
      }
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.3 }
    );

    guideSections.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16 py-12">
        <div className="mb-4 flex items-center justify-center">
          <img
            src="/logo/atlas-logo.png"
            alt="Atlas logo"
            className="h-16 w-16 md:h-20 md:w-20 object-contain"
          />
        </div>
        <div className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent mb-6">
          The Guardian of Resume Quality
        </div>
        <div className="max-w-3xl mx-auto">
          <p className="text-xl text-slate-600 leading-relaxed mb-6">
            Atlas is WINGMAN AI-powered tool designed to score and evaluate the quality of candidate resumes with precision.
          </p>
          <ul className="text-left max-w-2xl md:max-w-3xl mx-auto space-y-3 mb-6">
            <li className="flex items-start gap-3 text-slate-700">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              <span>Deliver client‑ready resumes with confidence</span>
            </li>
            <li className="flex items-start gap-3 text-slate-700">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              <span>Save time on manual screening</span>
            </li>
            <li className="flex items-start gap-3 text-slate-700">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
              <span>Improve candidate‑to‑hire conversion rates</span>
            </li>
          </ul>
          <p className="text-slate-600 text-lg mb-8">
            With Atlas, every resume becomes a reflection of excellence, truth, and readiness — helping Wingman maintain consistency and ensuring clients receive only the best.
          </p>
        </div>
        <div className="rounded-xl p-6 border border-slate-200 bg-white shadow-none max-w-2xl mx-auto">
          <p className="text-slate-700 font-medium">
            Follow this guide step-by-step, then use Atlas to optimize your resume for maximum impact
          </p>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="max-w-4xl mx-auto space-y-8 mb-16">
        {guideSections.map((section, index) => (
          <div
            key={section.id}
            id={section.id}
            className={`transform transform-gpu will-change-transform-opacity cv-auto transition-all duration-700 ${
              visibleSections.has(section.id)
                ? 'translate-y-0 opacity-100'
                : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="rounded-2xl border border-slate-200 bg-white shadow-none overflow-hidden hover:shadow-md transition-shadow duration-200">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-6 text-left hover:bg-slate-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                      {section.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
                        <span>{section.title}</span>
                      </h2>
                      {section.content.subtitle && (
                        <p className="text-slate-600 mt-1">{section.content.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500 font-medium">
                      Step {index + 1}
                    </span>
                    {expandedSection === section.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>
              
              {expandedSection === section.id && (
                <div className="border-t border-slate-200 p-6 bg-slate-50/50 animate-in slide-in-from-top duration-300">
                  {section.content.points.length > 0 && (
                    <ul className="space-y-3 mb-6">
                      {section.content.points.map((point, pointIndex) => (
                        <li key={pointIndex} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-slate-700 leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {section.content.subSections && (
                    <div className="space-y-6">
                      {section.content.subSections.map((subSection, subIndex) => (
                        <div key={subIndex} className="rounded-lg p-4 border border-slate-200 bg-white shadow-sm">
                          <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                            {subSection.title}
                          </h4>
                          <ul className="space-y-2">
                            {subSection.points.map((point, pointIndex) => (
                              <li key={pointIndex} className="flex items-start space-x-3">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-slate-600 text-sm leading-relaxed">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl p-8 text-white text-center shadow-2xl" style={{ backgroundImage: 'linear-gradient(135deg, rgb(37,99,235), rgb(14,165,233))' }}>
          <div className="flex items-center justify-center mb-4">
            <Rocket className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-3xl font-bold mb-4">Ready to Optimize Your Resume?</h3>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Now that you understand what Nexocean looks for, let Atlas analyze your resume 
            and provide specific, actionable improvements to help you succeed.
          </p>
          <button
            onClick={onStartAnalysis}
            className="btn btn-secondary !rounded-xl px-8 py-4 font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 mx-auto"
          >
            <span>Start Resume Analysis with Atlas</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Additional Resources */}
      <div className="max-w-4xl mx-auto mt-12">
        <div className="rounded-xl p-6 card">
          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            Additional Resources
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div>
              <p className="font-medium mb-2">Quick Links:</p>
              <ul className="space-y-1">
                <li>• Careers / Roles</li>
                <li>• Interview Process FAQ</li>
                <li>• Resume & Metrics Guide (Atlas)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">India Market Primers:</p>
              <ul className="space-y-1">
                <li>• UPI/ONDC/RBI/DPDP Act</li>
                <li>• STAR worksheet</li>
                <li>• Metrics & Verb bank</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 neo-pressed rounded-lg">
            <p className="text-sm text-blue-600">
              <strong>Pro Tip:</strong> We emphasize mutual fit. Ask questions about scope, success metrics, 
              and constraints to ensure alignment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
