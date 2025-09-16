# Atlas — Resume Analyzer

Atlas is a Vite + React + TypeScript single-page app that helps recruiters review resumes faster. It ingests PDF or text resumes, scores key sections, proposes actionable improvements, and provides a "Wingman" chat assistant for follow-up questions and phrasing guidance. Task planning and optional usage logging keep teams aligned without needing a standalone backend.

## Key Capabilities
- **Resume analysis** – Upload PDF or plain text and receive normalized scoring with strengths, improvements, ATS tips, and industry-specific recommendations.
- **Wingman chat** – Conversational Groq-powered helper for refining outreach copy or clarifying analysis results.
- **Task planner** – Turn analysis outcomes into trackable to-dos that persist locally per browser profile.
- **Identity-aware logging** – Optional email-domain gating plus Slack or Neon Postgres logging for lightweight auditing.
- **Serverless friendly** – Vercel-ready API routes in `api/` mirror the dev middleware so deployment requires minimal changes.

## Tech Stack
- React 18 with TypeScript and Vite 5
- Tailwind CSS for styling and Framer Motion for animations
- Groq SDK (Open AI OSS 120B) for LLM calls
- Vercel edge/serverless functions for production APIs (Node 20 target)
- Optional Neon serverless Postgres for audit logging

## Getting Started
### Prerequisites
- Node.js 18+ (Node 20 LTS recommended). `.nvmrc` pins the version used in development.
- npm 9+ (ships with Node 20) or compatible package manager.
- Groq API key with access to `openai/gpt-oss-120b`.
- Internet access for Fontshare-hosted fonts and Groq API requests.

### Installation
```bash
nvm install  # aligns with .nvmrc
nvm use
npm ci
```

### Environment Variables
Copy `.env.example` to `.env.local` (git-ignored) and populate as needed.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | ✅ | LLM access for `/api/analyze` and `/api/chat`.
| `ALLOW_EMAIL_DOMAIN` | Optional | Restrict access to recruiter emails that match `@domain`.
| `SLACK_WEBHOOK_URL` | Optional | Post simple usage logs for analyses and chat turns.
| `NEON_DATABASE_URL` | Optional | Persist usage summaries to Neon Postgres when deployed.
| `VITE_ALLOW_EMAIL_DOMAIN` | Optional | Frontend hint mirroring `ALLOW_EMAIL_DOMAIN`.

### Run the Dev Server
```bash
npm run dev
```

The Vite dev server exposes helper endpoints declared in `vite.config.ts`:
- `POST /api/analyze` – normalizes PDF/text input and requests a structured analysis.
- `POST /api/chat` – forwards chat turns to Groq.

These routes exist only while running `npm run dev`; production traffic must hit the functions in `api/` (see below).

## Available Scripts
- `npm run dev` – start Vite with mocked API routes.
- `npm run lint` – lint TypeScript/JS files via ESLint.
- `npx tsc -p tsconfig.app.json --noEmit` – verify type safety for the SPA bundle.
- `npm run build` – build static assets into `dist/`.
- `npm run preview` – serve the built assets without dev middleware.

## Project Structure
```
Project-Atlas/
├── src/                # React components, hooks, state, and utilities
├── api/                # Vercel-compatible serverless functions (analyze/chat/health)
├── public/             # Static assets copied as-is
├── vite.config.ts      # Dev server middleware + Tailwind/Vite configuration
├── tailwind.config.js  # Tailwind theme definitions
├── docs/               # Additional product/design documentation
└── README.md
```

Important frontend modules:
- `src/components/FileUpload.tsx` handles PDF parsing, candidate name derivation, and API submission.
- `src/components/AnalysisResults.tsx` renders section scoring and AI-suggested improvements.
- `src/components/ChatPage.tsx` powers the recruiter chat assistant.
- `src/components/TasksView.tsx` stores follow-up tasks in `localStorage` (keys migrated from legacy Wingman/Varuna apps).

## Production APIs
The Vite dev middleware is duplicated in the Vercel functions under `api/` for deployment:
- `api/analyze.ts` – validates identity, extracts text from PDFs, and requests JSON-mode analysis from Groq.
- `api/chat.ts` – streams recruiter chat messages through Groq.
- `api/health.ts` – lightweight readiness probe for monitors.
- `api/_shared.ts` – shared helpers for Slack/Neon logging, normalization, and identity enforcement.

When deploying behind SSO (e.g., Cloudflare Access), pass the authenticated email via `X-Recruiter-Email` or supported headers so domain enforcement can succeed.

## Deploying to Vercel
1. Create a Vercel project targeting Node.js 20.
2. Configure project settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
3. Add environment variables (`GROQ_API_KEY`, optional `ALLOW_EMAIL_DOMAIN`, `SLACK_WEBHOOK_URL`, `NEON_DATABASE_URL`).
4. Add a rewrite for SPA routing: source `/(.*)` → destination `/`.
5. Link or import this repository. The API directory will deploy as serverless functions automatically.

A GitHub workflow in `.github/workflows/verify-vercel-config.yml` guards against accidental `vercel.json` commits that could conflict with dashboard-managed routing.

## Troubleshooting
- **`GROQ_API_KEY is not set`** – ensure `.env.local` is loaded before `npm run dev` and that the value exists in Vercel for production.
- **`Unauthorized: missing recruiter identity`** – set `ALLOW_EMAIL_DOMAIN` only when also providing `X-Recruiter-Email` from the client or an access proxy.
- **Local PDF parsing issues** – install system dependencies required by `pdf-parse` if missing; for text-only resumes fall back to `.txt` uploads.
- **Port collisions** – Vite defaults to `5173`. Override with `npm run dev -- --port 5174` if needed.

## Security Notes
- `.env.local` and other `*.local` files are ignored by git; never commit secrets.
- Rotate Groq and Slack credentials if they were ever exposed.
- When enabling Neon logging, review table retention policies and PII handling per your compliance requirements.

---
Maintained by the Nexocean Atlas team. Contributions welcome via pull request.
