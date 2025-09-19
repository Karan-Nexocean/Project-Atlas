import { Groq } from 'groq-sdk';

export { Groq };

export function getHeader(headers, name) {
  const h = headers || {};
  return (h[name] || h[name.toLowerCase()] || '').toString();
}

export function tryExtractJSONObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    const prev = text[i - 1];
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (ch === '"' || ch === '\'' || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { const cand = text.slice(start, i + 1); try { return JSON.parse(cand); } catch {} } }
  }
  return null;
}

export function normalizeAnalysis(raw) {
  const clamp = (n) => { const x = Math.round(Number(n)); return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 0; };
  const arr = (v) => {
    if (Array.isArray(v)) return v.map((s) => String(s)).filter(Boolean).slice(0, 10);
    if (typeof v === 'string') return v.split(/\r?\n|\u2022|\-|\•/).map((s) => s.trim()).filter(Boolean).slice(0, 10);
    return [];
  };
  const pick = (obj, paths) => {
    for (const p of paths) {
      const val = p.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
      if (val !== undefined && val !== null && (Array.isArray(val) ? val.length : String(val).length)) return val;
    }
    return undefined;
  };
  const section = (s) => ({ score: clamp(s?.score), suggestions: arr(s?.suggestions) });
  const sections = raw?.sections || {};
  return {
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
    keyStrengths: arr(pick(raw, [
      'keyStrengths','key_strengths','insights.keyStrengths','insights.key_strengths','strengths','topStrengths','insights.strengths',
    ])),
    criticalImprovements: arr(pick(raw, [
      'criticalImprovements','critical_improvements','insights.criticalImprovements','insights.critical_improvements','improvements','majorImprovements','criticalFixes','insights.improvements','gaps','weaknesses',
    ])),
    atsOptimization: arr(pick(raw, [
      'atsOptimization','ats_optimization','atsOptimizationTips','tips.atsOptimization','atsOptimisation','ats_optimisation','tips.atsOptimisation','ats','atsTips','tips.ats',
    ])),
    industrySpecific: arr(pick(raw, [
      'industrySpecific','industry_specific','industrySpecificTips','tips.industrySpecific','industryTips','tips.industry','sectorSpecific',
    ])),
  };
}