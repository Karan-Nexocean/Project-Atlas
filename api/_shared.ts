import { Groq } from 'groq-sdk';
import { neon } from '@neondatabase/serverless';

export function getHeader(headers: Record<string, any>, name: string): string {
  const h = headers || {} as any;
  return (h[name] || h[name.toLowerCase()] || '').toString();
}

export function getRecruiterEmailFromHeaders(headers: Record<string, any>): string | null {
  const h = headers || {} as any;
  const x = (h['x-recruiter-email'] || h['x-user-email'] || '').toString().trim();
  if (x) return x;
  const cf = (h['cf-access-authenticated-user-email'] || '').toString().trim();
  if (cf) return cf;
  return null;
}

export function checkDomain(email: string | null, allowDomain: string | null): { ok: boolean; error?: string } {
  const d = (allowDomain || '').trim().toLowerCase();
  if (!d) return { ok: true };
  if (!email) return { ok: false, error: 'Unauthorized: missing recruiter identity' };
  if (!email.toLowerCase().endsWith(`@${d}`)) return { ok: false, error: `Forbidden: email must end with @${d}` };
  return { ok: true };
}

export async function logToSlack(text: string) {
  const hook = process.env.SLACK_WEBHOOK_URL || '';
  if (!hook) return;
  try { await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }); } catch {}
}

export async function logToNeon(event: Record<string, any>, dbUrl?: string) {
  const url = dbUrl || process.env.NEON_DATABASE_URL || '';
  if (!url) return;
  try {
    const sql = neon(url);
    await sql`create table if not exists atlas_usage (
      id text primary key,
      kind text not null,
      recruiter text,
      filename text,
      candidate text,
      overall_score int,
      input_type text,
      input_length int,
      turns int,
      created_at timestamptz default now()
    )`;
    const id = `${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
    await sql`insert into atlas_usage (id, kind, recruiter, filename, candidate, overall_score, input_type, input_length, turns)
              values (${id}, ${event.kind}, ${event.recruiter || null}, ${event.filename || null}, ${event.candidate || null}, ${event.overallScore || null}, ${event.input?.type || null}, ${event.input?.length || null}, ${event.turns || null})`;
  } catch {}
}

export function tryExtractJSONObject(text: string): any | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr: string | null = null;
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

export function normalizeAnalysis(raw: any) {
  const clamp = (n: any) => { const x = Math.round(Number(n)); return Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 0; };
  const arr = (v: any): string[] => {
    if (Array.isArray(v)) return v.map((s) => String(s)).filter(Boolean).slice(0, 10);
    if (typeof v === 'string') return v.split(/\r?\n|\u2022|\-|\•/).map((s) => s.trim()).filter(Boolean).slice(0, 10);
    return [];
  };
  const pick = (obj: any, paths: string[]): any => {
    for (const p of paths) {
      const val = p.split('.').reduce((o: any, k: string) => (o ? o[k] : undefined), obj);
      if (val !== undefined && val !== null && (Array.isArray(val) ? val.length : String(val).length)) return val;
    }
    return undefined;
  };
  const section = (s: any) => ({ score: clamp(s?.score), suggestions: arr(s?.suggestions) });
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

export function deriveCandidateNameFromFilename(filename?: string): string {
  try {
    if (!filename) return '';
    let base = filename.replace(/\.[^.]+$/, '');
    const first = base.split(/[\-–—|•·]+/)[0];
    let cleaned = first
      .replace(/[_\.]+/g, ' ')
      .replace(/\b(resume|cv|profile|updated|final|draft|copy|v\d+)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    cleaned = cleaned
      .split(' ')
      .filter(Boolean)
      .map((w) => (w.length <= 3 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join(' ');
    return cleaned;
  } catch { return ''; }
}

export { Groq };

