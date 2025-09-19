import { Groq } from 'groq-sdk';
import { getHeader, tryExtractJSONObject, normalizeAnalysis } from './_shared.js';

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
    let resumeText = String(body.text || '');
    if (!resumeText && body.pdfBase64) {
      try {
        const mod = await import('pdf-parse/lib/pdf-parse.js');
        const pdfParse = mod.default;
        const pdfBuf = Buffer.from(body.pdfBase64, 'base64');
        const parsed = await pdfParse(pdfBuf);
        resumeText = String(parsed?.text || '');
      } catch (e) {
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
    const systemPrompt = `You are a resume analysis engine for Atlas. Output ONLY a single valid JSON object (no markdown, no backticks, no prose before or after). The JSON must strictly match this schema:

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
- Compute job stability: count distinct full-time roles in the last ~10 years...`;

    let completion;
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
      });
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
      });
    }

    const content = completion.choices?.[0]?.message?.content ?? '';
    let json;
    try { json = JSON.parse(content); } catch { json = tryExtractJSONObject(content); }
    if (!json) {
      sendJson(res, 502, { error: 'Model returned non-JSON', raw: content.slice(0, 2000) });
      return;
    }
    const normalized = normalizeAnalysis(json);

    sendJson(res, 200, normalized);
  } catch (err) {
    sendJson(res, 500, { error: err?.message || 'Internal error' });
  }
};

export default handler;