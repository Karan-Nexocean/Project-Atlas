# Atlas — Resume Analyzer

Atlas is a Vite + React + TypeScript single-page app that helps recruiters review resumes faster. It ingests PDF or text resumes, scores key sections, proposes actionable improvements, and provides a "Wingman" chat assistant for follow-up questions and phrasing guidance. Task planning keeps recruiters aligned without needing a standalone backend.

## Key Capabilities
- **Resume analysis** – Upload PDF or plain text and receive normalized scoring with strengths, improvements, ATS tips, and industry-specific recommendations.
- **Wingman chat** – Conversational Groq-powered helper for refining outreach copy or clarifying analysis results.
- **Task planner** – Turn analysis outcomes into trackable to-dos that persist locally per browser profile.
- **Local-friendly** – API helpers in `api/` mirror the dev middleware so you can keep everything running locally during dashboard development.

## Tech Stack
- React 18 with TypeScript and Vite 5
- Tailwind CSS for styling and Framer Motion for animations
- Groq SDK (Open AI OSS 120B) for LLM calls

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
Copy `.env.example` to `.env.local` (git-ignored) and set the required values:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | ✅ | LLM access for `/api/analyze` and `/api/chat`.
| `SLACK_WEBHOOK_URL` | Optional | Enables basic usage pings from the dev middleware.
| `ALLOW_EMAIL_DOMAIN` | Optional | Restricts `/api/*` endpoints to recruiter emails from a given domain.
| `VITE_ALLOW_EMAIL_DOMAIN` | Optional | Mirrors `ALLOW_EMAIL_DOMAIN` so the client can pre-validate recruiter emails.
| `NEON_DATABASE_URL` | Optional | Connection string reserved for future persistence integrations.

### Run the Dev Server
```bash
npm run dev
```

The Vite dev server binds to `0.0.0.0:5000` (matching the Replit deployment) and exposes helper endpoints declared in `vite.config.ts`:
- `POST /api/analyze` – normalizes PDF/text input and requests a structured analysis.
- `POST /api/chat` – forwards chat turns to Groq.

These routes exist while running `npm run dev` and mirror the logic in `api/` for future hosting.

### Production-style Run

```bash
npm run build
npm start
```

`npm start` launches the Express server (`server.js`) that serves the bundled `dist/` assets and mounts the same `/api/analyze` and `/api/chat` handlers used in development.

## Available Scripts
- `npm run dev` – start Vite with mocked API routes.
- `npm run lint` – lint TypeScript/JS files via ESLint.
- `npx tsc -p tsconfig.app.json --noEmit` – verify type safety for the SPA bundle.
- `npm run build` – build static assets into `dist/`.
- `npm run preview` – serve the built assets without dev middleware (no `/api/*` routes, so analysis/chat will not respond).

## Project Structure
```
Project-Atlas/
├── src/                # React components, hooks, state, and utilities
├── api/                # Node handlers that match the dev middleware (analyze/chat/health)
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

## API Helpers
The Vite dev middleware is duplicated in the Node handlers under `api/` so you can re-use the same code when you introduce a custom backend later on:
- `api/analyze.ts` – extracts text from PDFs and requests JSON-mode analysis from Groq.
- `api/chat.ts` – streams recruiter chat messages through Groq.
- `api/health.ts` – lightweight readiness probe for monitors.
- `api/_shared.ts` – shared helpers for normalization utilities.

## Key Views

- **Interview Guide** – onboarding content that prepares candidates with Nexocean-specific expectations (`src/components/InterviewGuide.tsx`).
- **Upload & Analyze** – handles PDF/TXT ingestion, invokes `/api/analyze`, and shows animated progress (`src/components/FileUpload.tsx`).
- **Analysis Results** – displays scores, strengths, improvements, and export options, plus task/plan triggers (`src/components/AnalysisResults.tsx`).
- **Tasks** – groups actionable items, supports Markdown export, and calls the task planner (`src/components/TasksView.tsx`).
- **Chat (Atlas Assistant)** – dedicated conversation view that can reference current analysis and tasks (`src/components/ChatPage.tsx`).

## Troubleshooting
- **`GROQ_API_KEY is not set`** – ensure `.env.local` is loaded before `npm run dev` and that the variable is defined in your environment when hosting the API elsewhere.
- **Local PDF parsing issues** – install system dependencies required by `pdf-parse` if missing; for text-only resumes fall back to `.txt` uploads.
- **Port collisions** – Development binds to `5000`. Override with `npm run dev -- --port 5174` if you need a different port.

## Security Notes
- `.env.local` and other `*.local` files are ignored by git; never commit secrets.
- Rotate Groq credentials if they were ever exposed.

---
Maintained by the Nexocean Atlas team. Contributions welcome via pull request.
