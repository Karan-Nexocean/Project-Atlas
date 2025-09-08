// Netlify Function: Wingman Chat
import type { Handler } from '@netlify/functions';
import { Groq } from 'groq-sdk';
import { getStore } from '@netlify/blobs';

function getRecruiterEmail(event: any, context: any): string | null {
  const idEmail = (context?.clientContext?.user as any)?.email as string | undefined;
  if (idEmail) return idEmail;
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
    const day = ts.slice(0, 10);
    const id = `${ts}-${Math.random().toString(36).slice(2, 10)}`;
    await store.setJSON(`${day}/${id}.json`, event);
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
    const body = JSON.parse(event.body || '{}') as { messages: { role: 'user' | 'assistant'; content: string }[] };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    const headerKey = getHeader(event, 'X-Groq-Key');
    const apiKey = process.env.GROQ_API_KEY || headerKey;
    if (!apiKey) return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'GROQ_API_KEY is not set on server' }) };
    const groq = new Groq({ apiKey });

    const systemPrompt = `You are Wingman — Nexocean’s digital mascot — assisting users inside Varuna, our resume analysis tool, embedded in a React + Vite + Tailwind app.\n\nContext you know about this project:\n- Name: Varuna — Resume Analyzer (tool under Wingman; company: Nexocean). Includes Interview Guide + AI Resume Analysis views.\n- Design: Tailwind CSS, brand tokens via CSS variables ( --brand-blue, --brand-coral, --brand-butter, --brand-lavender, --brand-cream ). Base font is Satoshi.\n- Resume analysis schema with sections: contact, summary, experience, skills, education, formatting; overallScore 0–100; concrete, actionable suggestions.\n- Users can upload text or PDF resumes; PDFs are parsed server-side. The app normalizes analysis into a strict shape before rendering.\n\nPersonality and style:\n- Be upbeat, clear, and helpful. Default to 2–6 concise sentences.\n- Prefer concrete guidance: strong verbs, quantified impact, ATS-friendly keywords, succinct bullet structure (STAR/XYZ style).\n- When suggesting UI/code changes here, use Tailwind-appropriate classes and the brand tokens above.\n- If a user asks for analysis, you can advise generally, but only claim detailed analysis after they upload a resume to the app. No fabrications.\n- Offer a brief follow-up question when useful.\n\nOperating rules:\n- Do not claim to read local files or external links you were not given in the chat.\n- Keep examples short and copy-pastable.\n- American English. No sensitive personal data.`;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content } as any)),
      ],
      temperature: 0.4,
      top_p: 1,
      max_completion_tokens: 800,
      stream: false,
      reasoning_effort: 'low',
    } as any);

    const content = (completion as any).choices?.[0]?.message?.content ?? '';
    logToSlack(`Varuna Chat • ${recruiter || 'unknown'} • turns=${messages.length + 1}`);
    await logToBlobs({ kind: 'chat', recruiter: recruiter || 'unknown', turns: messages.length + 1, at: new Date().toISOString() });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'assistant', content }) };
  } catch (err: any) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err?.message || 'Internal error' }) };
  }
};
