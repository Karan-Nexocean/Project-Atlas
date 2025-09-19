import { Groq, getHeader, tryExtractJSONObject, normalizeAnalysis } from './_shared';

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
    const body = rawBody as { text?: string; pdfBase64?: string; filename?: string; candidateName?: string };
    let resumeText = String(body.text || '');
    if (!resumeText && body.pdfBase64) {
      try {
        const mod = await import('pdf-parse/lib/pdf-parse.js');
        const pdfParse = (mod as any).default as any;
        const pdfBuf = Buffer.from(body.pdfBase64, 'base64');
        const parsed = await pdfParse(pdfBuf);
        resumeText = String(parsed?.text || '');
      } catch (e: any) {
        sendJson(res, 400, { error: `PDF text extraction failed: ${e?.message || e}` });
        return;
      }
    }

    resumeText = resumeText.slice(0, 12_000);
    if (!resumeText) {
      sendJson(res, 400, { error: 'No resume text provided or extracted' });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      sendJson(res, 500, { error: 'GROQ_API_KEY is not set on server' });
      return;
    }

    const groq = new Groq({ apiKey });
    const systemPrompt = `You are a resume analysis engine for Atlas. Output ONLY a single valid JSON object (no markdown, no backticks, no prose before or after). The JSON must strictly match this schema:\n\n{\n  "overallScore": number (0–100 integer),\n  "sections": {\n    "contact": { "score": 0–100 integer, "suggestions": string[] },\n    "summary": { "score": 0–100 integer, "suggestions": string[] },\n    "experience": { "score": 0–100 integer, "suggestions": string[] },\n    "skills": { "score": 0–100 integer, "suggestions": string[] },\n    "education": { "score": 0–100 integer, "suggestions": string[] },\n    "formatting": { "score": 0–100 integer, "suggestions": string[] },\n    "stability": { "score": 0–100 integer, "suggestions": string[] }\n  },\n  "keyStrengths": string[],\n  "criticalImprovements": string[],\n  "atsOptimization": string[],\n  "industrySpecific": string[]\n}\n\nRules:\n- Emit ONLY a JSON object. No code fences, no comments, no extra text.\n- All scores are integers 0–100.\n- Each suggestions array should contain 3–7 concise, actionable items.\n- Populate keyStrengths, criticalImprovements, atsOptimization, and industrySpecific with 3–7 concise bullets each when possible. Do not leave them empty if there is relevant evidence in the resume; if evidence is thin, generalize from the provided text without inventing facts.\n- Be specific and factual from the provided resume text; do not invent details.\n- If information is missing, lower the relevant score and add clear suggestions.\n- Avoid null/undefined; use empty arrays if needed.\n- Do not include trailing commas or non-JSON values (e.g., NaN, Infinity).\n- Formatting should assess spelling, grammar, punctuation, capitalization; consistent bullet style and tense/person; layout/whitespace, alignment, margins, section headings, fonts, page length; date formats and contact/link correctness. Flag typos explicitly.\n- Compute job stability: count distinct full-time roles in the last ~10 years (ignore internships, roles < 6 months, and internal promotions at the same employer). If only ≤ 3 years of history is visible, set a neutral stability score (~60) and suggest adding timeline details.\n- Map jobs-per-10-years to a stability score using these bins: 1 job → 100 (Excellent), 2 → 90 (Very Good), 3 → 75 (Good), 4 → 55 (OK), 5 → 35 (Bad), 6+ → 10 (Worst). If resume covers Y years < 10, scale jobs to a decade (jobs10 = jobs * 10 / Y) before binning.\n- Reflect stability in the overallScore as a meaningful factor (e.g., ~15% weight), alongside other quality dimensions.\n- Keep total output under the token limit.`;

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
    if (!json) {
      sendJson(res, 502, { error: 'Model returned non-JSON', raw: content.slice(0, 2000) });
      return;
    }
    const normalized = normalizeAnalysis(json);

    sendJson(res, 200, normalized);
  } catch (err: any) {
    sendJson(res, 500, { error: err?.message || 'Internal error' });
  }
}
