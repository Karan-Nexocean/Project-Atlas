# Varuna — Knowledge Base (Wingman · Nexocean)

Last updated: 2025‑09‑08

## Purpose & Positioning
- Varuna is Wingman’s AI resume quality guardian. It analyzes resumes for completeness, clarity, ATS compatibility, and impact, then returns concrete improvements. The goal is consistent, client‑ready resumes and a faster path from screening to shortlist.
- Audience: candidates (self‑improvement), recruiters (quality control), hiring managers (signal extraction), and internal teams (enablement, support).

## Core Capabilities
- Resume analysis (PDF or text) → normalized JSON with scores and suggestions.
- ATS optimization and industry‑specific tips.
- Interview Guide (structured preparation content inside the app).
- Chat assistant (“Wingman Chat”) for quick questions and phrasing help.
- Turn improvements into actionable tasks; estimate effort with AI or heuristics.
- Export: PDF report (rich multi‑page) and Markdown list of tasks.

## Non‑Goals
- Not a background checker or verification system.
- Not a plagiarism detector.
- Does not guarantee interview outcomes; acts as a quality advisor.

## Architecture Overview
- Frontend: React + Vite + TypeScript + Tailwind.
  - Key components: `InterviewGuide`, `FileUpload`, `AnalysisResults`, `TasksView`, `ChatAssistant`, `DashboardLayout`.
  - Design tokens: CSS variables (turquoise‑forward palette) defined in `src/index.css`.
- Dev server middleware (Vite `configureServer`):
  - `POST /api/analyze` — parses PDF or accepts text; calls Groq LLM with strict JSON response format; normalizes result.
  - `POST /api/chat` — Wingman assistant and task planning; general Q&A.
- LLM: Groq Chat Completions (model `openai/gpt-oss-120b`).
- PDF parsing: `pdf-parse` (server side). For large inputs, analysis truncates resume text to ~12k chars to stay within token limits.
- Normalization: both server and client coerce the model output to the expected shape to avoid UI blanks.

## Data Flow (Happy Path)
1) User uploads a resume (PDF or TXT) in the Upload view.
2) Client converts PDF to base64 or forwards raw text → `POST /api/analyze`.
3) Server extracts text (PDF), builds a system prompt, calls Groq in JSON mode, parses/normalizes output.
4) Client renders Overall + Section scores, strengths, improvements, ATS/industry tips.
5) User generates tasks from suggestions, optionally asks Varuna to plan effort (via `/api/chat`).
6) User exports a PDF report or copies a Markdown task list.

## Analysis Schema (Normalized)
```
{
  "overallScore": number 0–100,
  "sections": {
    "contact":   { "score": 0–100, "suggestions": string[] },
    "summary":   { "score": 0–100, "suggestions": string[] },
    "experience":{ "score": 0–100, "suggestions": string[] },
    "skills":    { "score": 0–100, "suggestions": string[] },
    "education": { "score": 0–100, "suggestions": string[] },
    "formatting":{ "score": 0–100, "suggestions": string[] }
  },
  "keyStrengths": string[],
  "criticalImprovements": string[],
  "atsOptimization": string[],
  "industrySpecific": string[]
}
```

Notes:
- Scores are integers. Suggestion arrays target 3–7 actionable bullets each.
- Missing/empty fields are normalized to safe defaults (0 or []).

## Prompts (Dev Server)
- Analyze (JSON‑only): enforces a strict JSON object with the schema above; forbids code fences and prose; requires concise, specific suggestions; keeps total output under model token budget.
- Wingman Chat: identity and style prompt configured for upbeat, concise guidance; knows the app’s views and brand tokens; does not claim to read local files or external links not provided.

## API Endpoints (Dev Only)
- `POST /api/analyze`
  - Request body: `{ text?: string; pdfBase64?: string; filename?: string }`
  - Errors: `400` (no text/extraction failed), `500` (missing `GROQ_API_KEY`), `502` (model returned non‑JSON)
  - Response: normalized schema (above)
- `POST /api/chat`
  - Request body: `{ messages: { role: 'user'|'assistant'; content: string }[] }`
  - Response: `{ role: 'assistant', content: string }`

Production note: these routes exist only under Vite dev. For production, deploy equivalents (Express/serverless) and point the frontend to them.

## Environment & Setup
- Node: 18+ (recommend 20 LTS). See `.nvmrc`.
- Install: `npm ci`
- Dev: `npm run dev` (Vite; serves UI and the two API routes above)
- Build: `npm run build` → static assets
- Preview static: `npm run preview` (no dev APIs)
- Secrets: `.env.local` must include `GROQ_API_KEY` (do not commit). The server checks this before accepting analysis/chat requests.

## UI & Design System
- Brand tokens (CSS variables):
  - `--v-offblack`, `--v-paper`, `--v-turquoise`, `--ocean-*` plus legacy `--brand-*` mapped to the new palette.
- Components emphasize readability and actionable guidance; gradients are turquoise‑forward; base font is Satoshi (Fontshare CDN), with in‑PDF embedding fallback.
- Export: `src/utils/report.ts` supports rich multi‑page PDF, safe page cuts, and a two‑page export variant that highlights suggestions first.

## Privacy & Security
- Inputs may include PII. In dev mode, resume text is sent to Groq for analysis. Recommendations:
  - Obtain consent and avoid uploading sensitive identifiers if not needed.
  - Mask phone/email if testing; avoid secret data.
  - Rotate API keys if exposure is suspected; never commit real keys.
- The app does not persist resumes or analyses server‑side by default; tasks are stored in `localStorage` (`varuna:tasks`).

## Quality & Interpretation
- Scores are rubric‑guided but LLM‑based; expect small variance. Use them to prioritize edits rather than as absolute truth.
- Suggestions aim for measurable impact (%, time saved, revenue, latency, cost) and ATS friendliness (keywords, structure, clarity).

## Troubleshooting
- “Missing GROQ_API_KEY”: set it in `.env.local` and restart dev.
- “PDF text extraction failed”: try a text‑based PDF (not scanned) or upload TXT.
- “Model returned non‑JSON”: retry; the server attempts extraction, then normalizes.
- Blank sections: normalization guards against empties, but very short resumes may yield sparse output.
- Large resumes: input text is truncated to ~12k chars to respect token limits.

## Roadmap Ideas
- Streaming UI for analysis/chat, resumable uploads for large PDFs.
- Role‑specific rubrics and weights.
- Server deployment templates (Express/serverless) and telemetry.
- Red‑team rules for sensitive data detection/masking.

## Glossary
- ATS: Applicant Tracking System (parsing and keyword matching for resumes).
- JSON mode: LLM setting that forces well‑formed JSON output.
- Heuristic plan: local estimate when AI planning fails or is unavailable.

