import { Groq } from 'groq-sdk';
import { getHeader } from './_shared.js';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain');
  res.end(text);
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  try {
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const body = rawBody;
    const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      sendJson(res, 500, { error: 'GROQ_API_KEY is not set on server' });
      return;
    }
    const groq = new Groq({ apiKey });

    const systemPrompt = `You are Atlas Assistant — Nexocean's in‑app assistant for Atlas, our resume analysis tool (React + Vite + Tailwind).

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
- American English. No sensitive personal data.`;

    const ctx = body?.context || {};
    const contextJSON = (() => {
      try { return JSON.stringify({ candidateName: ctx.candidateName || null, analysis: ctx.analysis || null, tasks: Array.isArray(ctx.tasks) ? ctx.tasks.slice(0, 200) : [] }, null, 2).slice(0, 6000); } catch { return ''; }
    })();
    const systemWithContext = contextJSON
      ? systemPrompt + `\n\nApp Context (JSON):\n${contextJSON}\n\nUse this context to ground your answers. If context is missing a detail, ask a brief clarifying question.`
      : systemPrompt;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemWithContext },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.4,
      top_p: 1,
      max_completion_tokens: 800,
      stream: false,
      reasoning_effort: 'low',
    });

    const content = completion.choices?.[0]?.message?.content ?? '';
    sendJson(res, 200, { role: 'assistant', content });
  } catch (err) {
    sendJson(res, 500, { error: err?.message || 'Internal error' });
  }
};

export default handler;