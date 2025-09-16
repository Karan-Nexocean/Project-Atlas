import { Groq, getHeader } from './_shared';

function sendJson(res: any, status: number, payload: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendText(res: any, status: number, text: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain');
  res.end(text);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  try {
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const body = rawBody as { messages: { role: 'user' | 'assistant'; content: string }[]; context?: { candidateName?: string; analysis?: any; tasks?: any[] } };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    const headerKey = getHeader(req.headers as any, 'X-Groq-Key');
    const apiKey = process.env.GROQ_API_KEY || headerKey;
    if (!apiKey) {
      sendJson(res, 500, { error: 'GROQ_API_KEY is not set on server' });
      return;
    }
    const groq = new Groq({ apiKey });

    const systemPrompt = `You are Atlas Assistant — Nexocean’s in‑app assistant for Atlas, our resume analysis tool (React + Vite + Tailwind).\n\nContext you know about this project:\n- Name: Atlas — Resume Analyzer (company: Nexocean). Includes Interview Guide + AI Resume Analysis views.\n- Design: Tailwind CSS, brand tokens via CSS variables ( --brand-blue, --brand-coral, --brand-butter, --brand-lavender, --brand-cream ). Base font is Satoshi.\n- Resume analysis schema with sections: contact, summary, experience, skills, education, formatting, stability; overallScore 0–100; concrete, actionable suggestions.\n- Users can upload text or PDF resumes; PDFs are parsed server-side. The app normalizes analysis into a strict shape before rendering.\n\nPersonality and style:\n- Be upbeat, clear, and helpful. Default to 2–6 concise sentences.\n- Prefer concrete guidance: strong verbs, quantified impact, ATS-friendly keywords, succinct bullet structure (STAR/XYZ style).\n- When suggesting UI/code changes here, use Tailwind-appropriate classes and the brand tokens above.\n- If a user asks for analysis, you can advise generally, but only claim detailed analysis after they upload a resume to the app. No fabrications.\n- Offer a brief follow-up question when useful.\n\nOperating rules:\n- Do not claim to read local files or external links you were not given in the chat.\n- Keep examples short and copy-pastable.\n- American English. No sensitive personal data.`;

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
        ...messages.map((m) => ({ role: m.role, content: m.content } as any)),
      ],
      temperature: 0.4,
      top_p: 1,
      max_completion_tokens: 800,
      stream: false,
      reasoning_effort: 'low',
    } as any);

    const content = (completion as any).choices?.[0]?.message?.content ?? '';
    sendJson(res, 200, { role: 'assistant', content });
  } catch (err: any) {
    sendJson(res, 500, { error: err?.message || 'Internal error' });
  }
}
