import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables from .env.local and .env so server middleware has access
dotenv.config({ path: '.env.local' });
dotenv.config();

function devApiPlugin() {
  return {
    name: 'dev-api-analyze',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res) => {
        try {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve) => {
            req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            req.on('end', () => resolve());
          });
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { text?: string; pdfBase64?: string; filename?: string };
          let resumeText = (body.text || '').toString();

          if (!resumeText && body.pdfBase64) {
            try {
              // Lazy-load pdf-parse core (avoid index.js debug path)
              const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as any;
              const pdfBuf = Buffer.from(body.pdfBase64, 'base64');
              const parsed = await pdfParse(pdfBuf);
              resumeText = String(parsed?.text || '');
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `PDF text extraction failed: ${e?.message || e}` }));
              return;
            }
          }

          // Keep prompt within a safe bound
          // Keep prompt within a safe bound (~12k chars)
          resumeText = resumeText.slice(0, 12_000);
          if (!resumeText) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'No resume text provided or extracted' }));
            return;
          }

          const apiKey = process.env.GROQ_API_KEY;
          if (!apiKey) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'GROQ_API_KEY is not set on server. Add it to .env.local or export it before npm run dev.' }));
            return;
          }

          const groq = new Groq({ apiKey });

          const systemPrompt = `You are a resume analysis engine. Output ONLY a single valid JSON object (no markdown, no backticks, no prose before or after). The JSON must strictly match this schema:

{
  "overallScore": number (0–100 integer),
  "sections": {
    "contact": { "score": 0–100 integer, "suggestions": string[] },
    "summary": { "score": 0–100 integer, "suggestions": string[] },
    "experience": { "score": 0–100 integer, "suggestions": string[] },
    "skills": { "score": 0–100 integer, "suggestions": string[] },
    "education": { "score": 0–100 integer, "suggestions": string[] },
    "formatting": { "score": 0–100 integer, "suggestions": string[] },
    "stability": { "score": 0–100 integer, "suggestions": string[] }
  },
  "keyStrengths": string[],
  "criticalImprovements": string[],
  "atsOptimization": string[],
  "industrySpecific": string[]
}

Rules:
- Emit ONLY a JSON object. No code fences, no comments, no extra text.
- All scores are integers 0–100.
- Each suggestions array should contain 3–7 concise, actionable items.
- Populate keyStrengths, criticalImprovements, atsOptimization, and industrySpecific with 3–7 concise bullets each when possible. Do not leave them empty if there is relevant evidence in the resume; if evidence is thin, generalize from the provided text without inventing facts.
- Be specific and factual from the provided resume text; do not invent details.
- If information is missing, lower the relevant score and add clear suggestions.
- Avoid null/undefined; use empty arrays if needed.
- Do not include trailing commas or non-JSON values (e.g., NaN, Infinity).
- Formatting should assess spelling, grammar, punctuation, capitalization; consistent bullet style and tense/person; layout/whitespace, alignment, margins, section headings, fonts, page length; date formats and contact/link correctness. Flag typos explicitly.
- Compute job stability: count distinct full-time roles in the last ~10 years (ignore internships, roles < 6 months, and internal promotions at the same employer). If only \u2264 3 years of history is visible, set a neutral stability score (~60) and suggest adding timeline details.
- Map jobs-per-10-years to a stability score using these bins: 1 job \u2192 100 (Excellent), 2 \u2192 90 (Very Good), 3 \u2192 75 (Good), 4 \u2192 55 (OK), 5 \u2192 35 (Bad), 6+ \u2192 10 (Worst). If resume covers Y years < 10, scale jobs to a decade (jobs10 = jobs * 10 / Y) before binning.
- Reflect stability in the overallScore as a meaningful factor (e.g., ~15% weight), alongside other quality dimensions.
- Keep total output under the token limit.`;

          // JSON Mode: request structured JSON directly (non-streaming)
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
              stop: null,
            } as any);
          } catch (e: any) {
            // Retry once with a slightly larger budget
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
              stop: null,
            } as any);
          }

          const content = (completion as any).choices?.[0]?.message?.content ?? '';

          let json: any;
          try {
            json = JSON.parse(content);
          } catch (e) {
            // As a fallback, attempt to extract JSON (should be rare in JSON mode)
            const extracted = tryExtractJSONObject(content);
            if (!extracted) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: 'Model returned non-JSON', raw: content.slice(0, 2000) }));
              return;
            }
            json = extracted;
          }

          // Normalize to the expected schema to avoid UI blanks
          const normalized = normalizeAnalysis(json);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(normalized));

          // Fire-and-forget usage log (no resume content)
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
      // Simple chat endpoint for the Atlas Assistant (inside Atlas)
      server.middlewares.use('/api/chat', async (req, res) => {
        try {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve) => {
            req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
            req.on('end', () => resolve());
          });
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
            messages: { role: 'user' | 'assistant'; content: string }[];
            context?: { candidateName?: string; analysis?: any; tasks?: any[] };
          };
          const apiKey = process.env.GROQ_API_KEY;
          if (!apiKey) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'GROQ_API_KEY is not set on server. Add it to .env.local or export it before npm run dev.' }));
            return;
          }
          const groq = new Groq({ apiKey });

          const systemPrompt = `You are Atlas Assistant — Nexocean’s in‑app assistant for Atlas, our resume analysis tool (React + Vite + Tailwind).

Context you know about this project:
- Name: Atlas — Resume Analyzer (company: Nexocean). Includes Interview Guide + AI Resume Analysis views.
- Design: Tailwind CSS, brand tokens via CSS variables ( --brand-blue, --brand-coral, --brand-butter, --brand-lavender, --brand-cream ). Base font is Satoshi.
- Resume analysis schema with sections: contact, summary, experience, skills, education, formatting, stability; overallScore 0–100; concrete, actionable suggestions.
- Users can upload text or PDF resumes; PDFs are parsed server-side. The app normalizes analysis into a strict shape before rendering.

Personality and style:
- Be upbeat, clear, and helpful. Default to 2–6 concise sentences.
- Prefer concrete guidance: strong verbs, quantified impact, ATS-friendly keywords, succinct bullet structure (STAR/XYZ style).
- When suggesting UI/code changes here, use Tailwind-appropriate classes and the brand tokens above.
- If a user asks for analysis, you can advise generally, but only claim detailed analysis after they upload a resume to the app. No fabrications.
- Offer a brief follow-up question when useful.

Operating rules:
- Do not claim to read local files or external links you were not given in the chat.
- Keep examples short and copy-pastable.
- American English. No sensitive personal data.
`;

          // Attach optional app-side context (latest analysis, tasks, candidate)
          const ctx = body?.context || {};
          const contextJSON = (() => {
            try {
              return JSON.stringify({
                candidateName: ctx.candidateName || null,
                analysis: ctx.analysis || null,
                tasks: Array.isArray(ctx.tasks) ? ctx.tasks.slice(0, 200) : [],
              }, null, 2).slice(0, 6000);
            } catch { return ''; }
          })();
          const systemWithContext = contextJSON
            ? systemPrompt + `\n\nApp Context (JSON):\n${contextJSON}\n\nUse this context to ground your answers. If context is missing a detail, ask a brief clarifying question.`
            : systemPrompt;

          const history = (body.messages || []).slice(-16); // cap context
          const completion = await groq.chat.completions.create({
            model: 'openai/gpt-oss-120b',
            messages: [
              { role: 'system', content: systemWithContext },
              // forward prior turns
              ...history.map((m) => ({ role: m.role, content: m.content } as any)),
            ],
            temperature: 0.4,
            top_p: 1,
            max_completion_tokens: 800,
            stream: false,
            reasoning_effort: 'low',
          } as any);

          const content = (completion as any).choices?.[0]?.message?.content ?? '';
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ role: 'assistant', content }));

          // Lightweight chat usage log (no message content to Slack)
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
        }
      });
    },
  } as const;
}

// Attempt to extract the first balanced JSON object from a string.
function tryExtractJSONObject(text: string): any | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr: string | null = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    const prev = text[i - 1];
    if (inStr) {
      if (ch === inStr && prev !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === '\'' || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          // continue searching for another closing brace
        }
      }
    }
  }
  return null;
}

// Server-side normalization to the expected ResumeAnalysis shape
function normalizeAnalysis(raw: any) {
  const clamp = (n: any) => {
    const x = Math.round(Number(n));
    if (Number.isFinite(x)) return Math.max(0, Math.min(100, x));
    return 0;
  };
  const arr = (v: any): string[] => {
    if (Array.isArray(v)) return v.map((s) => String(s)).filter(Boolean).slice(0, 10);
    if (typeof v === 'string') {
      return v
        .split(/\r?\n|\u2022|\-|\•/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);
    }
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
}
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApiPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
