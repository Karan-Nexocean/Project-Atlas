# Atlas — Knowledge Base (Wingman · Nexocean)

Last updated: 2025‑09‑08

## Purpose & Positioning
- Atlas is Wingman’s AI resume quality guardian. It analyzes resumes for completeness, clarity, system fit (ATS parsing/readiness), and impact, then returns concrete improvements. The goal is consistent, client‑ready resumes and a faster path from screening to shortlist.
- Audience: candidates (self‑improvement), recruiters (quality control), hiring managers (signal extraction), and internal teams (enablement, support).

## Core Capabilities
- Resume analysis (PDF or text) → normalized JSON with scores and suggestions.
- System Fit (JSON: `atsOptimization`) and industry‑specific tips.
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
4) Client renders Overall + Section scores, strengths, improvements, System Fit/industry tips.
5) User generates tasks from suggestions, optionally asks Atlas to plan effort (via `/api/chat`).
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
    "formatting":{ "score": 0–100, "suggestions": string[] },
    "stability": { "score": 0–100, "suggestions": string[] }
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
- UI label mapping: the “System Fit” section in the product corresponds to the `atsOptimization` array in the JSON response.

## Section Rubrics (Scoring Criteria)

### Contact — Criteria
- Required basics: full name, professional email, phone (with country/area code), LinkedIn; portfolio/GitHub for technical roles.
- Link quality: clickable and valid URLs; no broken redirects; use canonical LinkedIn/portfolio URLs.
- Cleanliness: avoid photos, full street addresses, DOB, marital status, and other sensitive personal data.
- Formatting: concise single block (1–3 lines); consistent separators; no icon‑only contact (not ATS‑friendly).
- Consistency: standardized capitalization for names; phone and email formatting; consistent locale (e.g., US phone pattern if US‑focused).
- Suggestions focus: add missing links, fix broken/obfuscated contacts, standardize formats, remove PII.

### Summary — Criteria
- Length and focus: 3–5 crisp lines (or 2–4 bullets) tailored to the target role.
- Signal content: current/target title, years of experience, core domains, standout strengths, relevant industries.
- Impact orientation: quantify outcomes where possible (%, $, time, scale); avoid vague buzzwords and clichés.
- Keywords: include key ATS terms for the role while remaining natural; avoid keyword stuffing.
- Voice: concise, action‑oriented phrasing; keep pronouns minimal and professional tone.
- Suggestions focus: tighten fluff, add measurable outcomes, align to target role/industry, infuse relevant keywords.

### Experience — Criteria
- Structure: reverse‑chronological; each role lists title, company, location (optional), and dates (MM/YYYY–MM/YYYY or Present).
- Achievement bullets: 4–7 bullets for recent roles, 2–4 for older roles; XYZ/STAR pattern with measurable results.
- Scope and context: include scale (team size, revenue, users, latency, budgets) for credibility.
- Relevance: emphasize role‑matching achievements; de‑emphasize unrelated details.
- Clarity: distinguish promotions and internal moves; avoid duplicate bullets across roles; minimize responsibility‑only statements.
- Dates: consistent format; avoid overlapping ambiguity; clarify contract/freelance vs full‑time.
- Tech usage: reference tools/technologies in context (not just a list); ensure skills claimed appear in achievements.
- Suggestions focus: rewrite to outcomes, add metrics, reorder for impact, clarify promotions/tenure, fix date consistency.

### Skills — Criteria
- Organization: group by type (Languages, Frameworks, Cloud, Data/DB, Tools, Methodologies); avoid long, flat lists.
- Relevance: prioritize skills used in the last 3–5 years and pertinent to the target role; prune outdated/irrelevant entries.
- Evidence: ensure important skills are reflected in Experience bullets; avoid claims with no backing.
- Clarity: avoid proficiency bars/stars; keep optional proficiency labels (e.g., Advanced/Intermediate) conservative and consistent.
- Brevity: aim for 10–20 total items across groups (role‑dependent); separate “selected” vs “comprehensive” if necessary.
- Suggestions focus: regroup, remove noise, align with target JD, add missing but evidenced skills.

### Education — Criteria
- Essentials: degree/certification, institution, graduation date (or expected), location optional.
- Seniority‑aware: for senior candidates, keep concise; for juniors, include GPA (if strong), relevant coursework, projects, honors.
- Certifications: list issuer, credential name, and validity/expiry; remove expired or label as “expired” if kept for context.
- Ordering: position appropriately relative to Experience based on seniority and relevance.
- Suggestions focus: add missing dates/details, consolidate space, highlight relevant academic projects/certs.

### Job Stability Scoring
- Definition: number of distinct full‑time roles held in the last ~10 years (ignore internships, roles < 6 months, and internal promotions at the same employer). If only ≤3 years of history is visible, assign a neutral stability score (~60) and suggest adding timeline details.
- Mapping (jobs per 10 years → score):
  - 1 → 100 (Excellent)
  - 2 → 90 (Very Good)
  - 3 → 75 (Good)
  - 4 → 55 (OK)
  - 5 → 35 (Bad)
  - 6+ → 10 (Worst)
- For resumes covering fewer than 10 years, scale to a decade first: jobs10 = jobsObserved × (10 / yearsCovered); then apply the bins above.

### Formatting — Criteria
- Spelling/grammar/punctuation/capitalization; flag typos explicitly.
- Consistent bullet style, tense (past/present), and person (first/third).
- Layout/whitespace, alignment, margins, readable fonts, section headings.
- Page length and section order for clarity; avoid dense walls of text.
- Date formats (consistent), contact/link correctness and standardization.
- ATS-friendly structure (simple lists, minimal images/tables), where applicable.

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
- The app does not persist resumes or analyses server‑side by default; tasks are stored in `localStorage` (`atlas:tasks`).

## Quality & Interpretation
- Scores are rubric‑guided but LLM‑based; expect small variance. Use them to prioritize edits rather than as absolute truth.
- Suggestions aim for measurable impact (%, time saved, revenue, latency, cost) and ATS friendliness (keywords, structure, clarity).

### Formatting Criteria (what “formatting” covers)
- Spelling/grammar/punctuation/capitalization; flag typos explicitly.
- Consistent bullet style, tense (past/present), and person (first/third).
- Layout/whitespace, alignment, margins, readable fonts, section headings.
- Page length and section order for clarity; avoid dense walls of text.
- Date formats (consistent), contact/link correctness and standardization.
- ATS-friendly structure (simple lists, minimal images/tables), where applicable.

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
