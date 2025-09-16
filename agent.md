# Agent Handbook — Project Atlas

This document helps automation or AI coding agents work effectively inside the Atlas (Resume Analyzer) repository.

## Mission Overview
- Frontend: React 18 + TypeScript SPA served by Vite, styled with Tailwind and Framer Motion.
- Backend surface: Groq-powered analysis and chat exposed through `/api/analyze` and `/api/chat`. During local development these are implemented with Vite middleware; in production they run as Vercel serverless functions under `api/`.
- Core value: accept PDF/text resumes, derive structured scoring + insights, allow follow-up chat, and track recruiter tasks locally.

## Environment & Tooling
1. **Node version**: use Node 20 (see `.nvmrc`). Always run `nvm use` before installing modules.
2. **Dependencies**: install with `npm ci` to respect the lockfile.
3. **Secrets**: copy `.env.example` to `.env.local` and set at minimum `GROQ_API_KEY`. Optional variables (`ALLOW_EMAIL_DOMAIN`, `SLACK_WEBHOOK_URL`, `NEON_DATABASE_URL`, `VITE_ALLOW_EMAIL_DOMAIN`) unlock identity gating and logging.
4. **Dev server**: run `npm run dev`. This starts Vite on port 5173 and mounts mock API routes for analyze/chat so no extra backend is required locally.
5. **Static preview**: run `npm run build` followed by `npm run preview` to test the production bundle without dev-only APIs.

## Quality Gates
- `npm run lint` for ESLint. Fix warnings aggressively; the project treats lint findings as blockers.
- `npx tsc -p tsconfig.app.json --noEmit` for type safety. Keep TypeScript strictness intact.
- Manual high-level test plan whenever resumes or chat flows are touched: upload a PDF, verify scores, run a chat turn, add tasks, and reload to confirm persistence.

## Implementation Guidelines
- **State management**: prefer React hooks/local state. Persistent recruiter metadata and tasks are stored via `localStorage` using keys starting with `atlas:` (see `src/components/TasksView.tsx` and `src/utils/identity.ts`).
- **API calls**: use the helpers in `src/utils/api.ts` (or follow existing patterns) so auth headers (`X-Recruiter-Email`, `X-Groq-Key`, `X-Db-Url`) are consistent. Never bypass domain checks.
- **LLM payloads**: keep prompts centralized. The JSON schema enforcement lives in `api/analyze.ts` and `src/App.tsx`. When changing shapes, update both client normalization and `_shared.ts`.
- **PDF parsing**: `pdf-parse` is lazy-imported for faster cold starts. Respect chunk limits (12k chars) to avoid overloading Groq.
- **Styling**: Tailwind classes live alongside component markup; refer to `tailwind.config.js` for custom colors/spacing. Use semantic class names already in use.
- **Animations**: leverage Framer Motion components present in `src/components` instead of custom CSS transitions.
- **Error handling**: surface toast notifications via `useToast()` and guard network calls with try/catch; the project assumes graceful degradation rather than console-only errors.
- **Task planner**: `TaskItem` types live in `src/types/tasks.ts`. Keep backwards compatibility with legacy keys (`varuna`, `wingman`) when persisting data.

## Working with Serverless Functions
- Functions run on Vercel’s Node 20 environment. Avoid filesystem writes and keep response times under Groq limits.
- Shared helpers (`api/_shared.ts`) implement Slack/Neon logging, recruiter validation, and analysis normalization. Always reuse these utilities instead of duplicating logic.
- When adding a new endpoint, export the handler as `default` with `(req, res)` signature compatible with Vercel’s Edge runtime.

## Deployment Considerations
- Production relies on Vercel dashboard settings (no `vercel.json` committed). Confirm the SPA rewrite (`/(.*)` → `/`) and environment variables after making API changes.
- Usage logging:
  - Slack: posts concise events, never send resume content.
  - Neon: table `atlas_usage` is created automatically if missing. Ensure schema updates remain backward compatible.

## Definition of Done Checklist
- [ ] Code compiles and passes lint/type checks.
- [ ] Dev server test covering resume upload, analysis display, chat interaction, and task persistence.
- [ ] Documentation updated when contracts, env vars, or workflows change (README + this handbook).
- [ ] Secrets handled through `.env.local` or platform settings only.
- [ ] For backend tweaks, run a quick smoke test against the deployed Vercel function (`npm run dev` or `vercel dev`) to verify responses.

Keep this guide updated whenever workflow or architecture changes to reduce ramp-up time for future agents.
