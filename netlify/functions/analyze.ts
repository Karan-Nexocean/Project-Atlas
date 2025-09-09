// Netlify Function: Analyze resume
// Mirrors the Vite dev middleware implementation, with optional domain gating and Slack logging.
import type { Handler } from '@netlify/functions';
import { Groq } from 'groq-sdk';
import { getStore } from '@netlify/blobs';
import { neon } from '@neondatabase/serverless';

// Fallback JSON extractor (should be rare in JSON mode)
function tryExtractJSONObject(text: string): any | null {
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

function normalizeAnalysis(raw: any) {
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
      'keyStrengths',
      'key_strengths',
      'insights.keyStrengths',
      'insights.key_strengths',
      'strengths',
      'topStrengths',
      'insights.strengths',
    ])),
    criticalImprovements: arr(pick(raw, [
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
    ])),
    atsOptimization: arr(pick(raw, [
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
    ])),
    industrySpecific: arr(pick(raw, [
      'industrySpecific',
      'industry_specific',
      'industrySpecificTips',
      'tips.industrySpecific',
      'industryTips',
      'tips.industry',
      'sectorSpecific',
    ])),
  };
}

function deriveCandidateNameFromFilename(filename?: string): string {
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

function getRecruiterEmail(event: any, context: any): string | null {
  // Prefer Identity if present
  const idEmail = (context?.clientContext?.user as any)?.email as string | undefined;
  if (idEmail) return idEmail;
  // Fallback to headers
  const headers = event.headers || {};
  const h = (k: string) => (headers[k] ?? headers[k.toLowerCase()] ?? '') as string;
  const x = (h('x-recruiter-email') || h('x-user-email') || '').trim();
  if (x) return x;
  const cf = (h('cf-access-authenticated-user-email') || '').trim();
  if (cf) return cf;
  return null;
}

function checkDomain(email: string | null, allowDomain: string | null): { ok: boolean; error?: string } {
  const d = (allowDomain || '').trim().toLowerCase();
  if (!d) return { ok: true };
  if (!email) return { ok: false, error: 'Unauthorized: missing recruiter identity' };
  if (!email.toLowerCase().endsWith(`@${d}`)) return { ok: false, error: `Forbidden: email must end with @${d}` };
  return { ok: true };
}

async function logToSlack(text: string) {
  const hook = process.env.SLACK_WEBHOOK_URL || '';
  if (!hook) return;
  try { await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }); } catch {}
}

async function logToBlobs(event: Record<string, any>) {
  try {
    const store = getStore({ name: 'varuna-usage' });
    const ts = new Date().toISOString();
    const day = ts.slice(0, 10); // YYYY-MM-DD
    const id = `${ts}-${Math.random().toString(36).slice(2, 10)}`;
    await store.setJSON(`${day}/${id}.json`, event);
  } catch {}
}

async function logToNeon(event: Record<string, any>, dbUrl?: string) {
  const url = dbUrl || process.env.NEON_DATABASE_URL || '';
  if (!url) return;
  try {
    const sql = neon(url);
    await sql`create table if not exists varuna_usage (
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
    await sql`insert into varuna_usage (id, kind, recruiter, filename, candidate, overall_score, input_type, input_length, turns)
              values (${id}, ${event.kind}, ${event.recruiter || null}, ${event.filename || null}, ${event.candidate || null}, ${event.overallScore || null}, ${event.input?.type || null}, ${event.input?.length || null}, ${event.turns || null})`;
  } catch {}
}

function getHeader(event: any, name: string): string {
  const h = event.headers || {};
  return (h[name] || h[name.toLowerCase()] || '').toString();
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const allowDomain = process.env.ALLOW_EMAIL_DOMAIN || '';
  const recruiter = getRecruiterEmail(event, context);
  const dom = checkDomain(recruiter, allowDomain);
  if (!dom.ok) return { statusCode: dom.error?.startsWith('Forbidden') ? 403 : 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: dom.error }) };

  try {
    const body = JSON.parse(event.body || '{}') as { text?: string; pdfBase64?: string; filename?: string; candidateName?: string };
    let resumeText = String(body.text || '');
    if (!resumeText && body.pdfBase64) {
      try {
        // Use the core parser implementation to avoid test/debug paths
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as any;
        const pdfBuf = Buffer.from(body.pdfBase64, 'base64');
        const parsed = await pdfParse(pdfBuf);
        resumeText = String(parsed?.text || '');
      } catch (e: any) {
        return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: `PDF text extraction failed: ${e?.message || e}` }) };
      }
    }

    resumeText = resumeText.slice(0, 12_000);
    if (!resumeText) return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'No resume text provided or extracted' }) };

    const headerKey = getHeader(event, 'X-Groq-Key');
    const headerDb = getHeader(event, 'X-Db-Url');
    const apiKey = process.env.GROQ_API_KEY || headerKey;
    if (!apiKey) return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'GROQ_API_KEY is not set on server' }) };

    const groq = new Groq({ apiKey });
    const systemPrompt = `You are a resume analysis engine. Output ONLY a single valid JSON object (no markdown, no backticks, no prose before or after). The JSON must strictly match this schema:\n\n{\n  "overallScore": number (0–100 integer),\n  "sections": {\n    "contact": { "score": 0–100 integer, "suggestions": string[] },\n    "summary": { "score": 0–100 integer, "suggestions": string[] },\n    "experience": { "score": 0–100 integer, "suggestions": string[] },\n    "skills": { "score": 0–100 integer, "suggestions": string[] },\n    "education": { "score": 0–100 integer, "suggestions": string[] },\n    "formatting": { "score": 0–100 integer, "suggestions": string[] },\n    "stability": { "score": 0–100 integer, "suggestions": string[] }\n  },\n  "keyStrengths": string[],\n  "criticalImprovements": string[],\n  "atsOptimization": string[],\n  "industrySpecific": string[]\n}\n\nRules:\n- Emit ONLY a JSON object. No code fences, no comments, no extra text.\n- All scores are integers 0–100.\n- Each suggestions array should contain 3–7 concise, actionable items.\n- Populate keyStrengths, criticalImprovements, atsOptimization, and industrySpecific with 3–7 concise bullets each when possible. Do not leave them empty if there is relevant evidence in the resume; if evidence is thin, generalize from the provided text without inventing facts.\n- Be specific and factual from the provided resume text; do not invent details.\n- If information is missing, lower the relevant score and add clear suggestions.\n- Avoid null/undefined; use empty arrays if needed.\n- Do not include trailing commas or non-JSON values (e.g., NaN, Infinity).\n- Formatting should assess spelling, grammar, punctuation, capitalization; consistent bullet style and tense/person; layout/whitespace, alignment, margins, section headings, fonts, page length; date formats and contact/link correctness. Flag typos explicitly.\n- Compute job stability: count distinct full-time roles in the last ~10 years (ignore internships, roles < 6 months, and internal promotions at the same employer). If only \u2264 3 years of history is visible, set a neutral stability score (~60) and suggest adding timeline details.\n- Map jobs-per-10-years to a stability score using these bins: 1 job \u2192 100 (Excellent), 2 \u2192 90 (Very Good), 3 \u2192 75 (Good), 4 \u2192 55 (OK), 5 \u2192 35 (Bad), 6+ \u2192 10 (Worst). If resume covers Y years < 10, scale jobs to a decade (jobs10 = jobs * 10 / Y) before binning.\n- Reflect stability in the overallScore as a meaningful factor (e.g., ~15% weight), alongside other quality dimensions.\n- Keep total output under the token limit.`;

    let completion: any;
    try {
      completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Resume:\n\n${resumeText}` },
        ],
        temperature: 0,
        top_p: 1,
        max_completion_tokens: 2048,
        stream: false,
        reasoning_effort: 'medium',
        response_format: { type: 'json_object' },
      } as any);
    } catch {
      completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Resume:\n\n${resumeText}` },
        ],
        temperature: 0,
        top_p: 1,
        max_completion_tokens: 3000,
        stream: false,
        reasoning_effort: 'medium',
        response_format: { type: 'json_object' },
      } as any);
    }

    const content = (completion as any).choices?.[0]?.message?.content ?? '';
    let json: any;
    try { json = JSON.parse(content); } catch { json = tryExtractJSONObject(content); }
    if (!json) return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Model returned non-JSON', raw: content.slice(0, 2000) }) };
    const normalized = normalizeAnalysis(json);

    // Logging (no resume content)
    const rawBody = JSON.parse(event.body || '{}');
    const candidate = (rawBody?.candidateName as string) || deriveCandidateNameFromFilename(rawBody?.filename);
    const msg = `Varuna Analyze • ${recruiter || 'unknown'} → ${candidate || rawBody?.filename || 'unknown'} • score=${normalized.overallScore ?? 'n/a'} • len=${resumeText.length}`;
    logToSlack(msg);
    const toRecord = {
      kind: 'analyze',
      recruiter: recruiter || 'unknown',
      filename: rawBody?.filename || null,
      candidate: candidate || null,
      overallScore: normalized.overallScore,
      input: { type: rawBody?.pdfBase64 ? 'pdf' : (rawBody?.text ? 'text' : 'unknown'), length: resumeText.length },
      at: new Date().toISOString(),
    } as any;
    await logToBlobs(toRecord);
    await logToNeon(toRecord, headerDb || process.env.NEON_DATABASE_URL);

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalized) };
  } catch (err: any) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
  }
};
