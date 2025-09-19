# Agent Handbook — Project Atlas

This document helps automation or AI coding agents work effectively inside the Atlas (Resume Analyzer) repository.

## Mission Overview
- Frontend: React 18 + TypeScript SPA served by Vite, styled with Tailwind and Framer Motion.
- Backend surface: Groq-powered analysis and chat exposed through `/api/analyze` and `/api/chat`. During local development these are implemented with Vite middleware; matching Node handlers live in `api/` for future hosting.
- Core value: accept PDF/text resumes, derive structured scoring + insights, allow follow-up chat, and track recruiter tasks locally.

## Environment & Tooling
1. **Node version**: use Node 20 (see `.nvmrc`). Always run `nvm use` before installing modules.
2. **Dependencies**: install with `npm ci` to respect the lockfile.
3. **Secrets**: copy `.env.example` to `.env.local` and set `GROQ_API_KEY`.
4. **Dev server**: run `npm run dev`. This starts Vite on `0.0.0.0:5000` (Replit-compatible) and mounts mock API routes for analyze/chat so no extra backend is required locally.
5. **Static preview**: run `npm run build` followed by `npm run preview` to test the production bundle; note that preview does **not** expose `/api/*`, so analysis/chat calls will fail.

## Quality Gates
- `npm run lint` for ESLint. Fix warnings aggressively; the project treats lint findings as blockers.
- `npx tsc -p tsconfig.app.json --noEmit` for type safety. Keep TypeScript strictness intact.
- Manual high-level test plan whenever resumes or chat flows are touched: upload a PDF, verify scores, run a chat turn, add tasks, and reload to confirm persistence.

## Implementation Guidelines
- **State management**: prefer React hooks/local state. Persistent recruiter metadata and tasks are stored via `localStorage` using keys starting with `atlas:` (see `src/components/TasksView.tsx` and `src/utils/identity.ts`).
- **API calls**: follow the fetch patterns in `src/App.tsx`, `src/components/ChatPage.tsx`, and `src/hooks/useTaskPlanner.ts` so headers such as `X-Recruiter-Email`, `X-Groq-Key`, and any bearer tokens remain consistent.
- **Identity data**: recruiter email, Groq overrides, and auth tokens are pulled from `localStorage` keys prefixed with `atlas:` (legacy `varuna:` / `wingman:` keys are still migrated). Touch these flows with care.
- **Atlas Assistant**: extend the dedicated `ChatPage` component for chat UX; `ChatAssistant` remains as a legacy modal for reference only.
- **LLM payloads**: keep prompts centralized. The JSON schema enforcement lives in `api/analyze.ts` and `src/App.tsx`. When changing shapes, update both client normalization and `_shared.ts`.
- **PDF parsing**: `pdf-parse` is lazy-imported for faster cold starts. Respect chunk limits (12k chars) to avoid overloading Groq.
- **Styling**: Tailwind classes live alongside component markup; refer to `tailwind.config.js` for custom colors/spacing. Use semantic class names already in use.
- **Animations**: leverage Framer Motion components present in `src/components` instead of custom CSS transitions.
- **Error handling**: surface toast notifications via `useToast()` and guard network calls with try/catch; the project assumes graceful degradation rather than console-only errors.
- **Task planner**: `TaskItem` types live in `src/types/tasks.ts`. Keep backwards compatibility with legacy keys (`varuna`, `wingman`) when persisting data.

## Working with API Handlers
- Handlers in `api/` mirror the dev middleware and run on Node 20. Avoid filesystem writes and keep response times within Groq limits.
- Shared helpers (`api/_shared.ts`) provide normalization utilities. Reuse these instead of duplicating logic.
- When adding a new endpoint, export the handler as `default` with `(req, res)` signature.

## Deployment Considerations
- Deployment is currently out of scope; keep the handlers platform-agnostic so they can be wired into the new dashboard backend later.

## Definition of Done Checklist
- [ ] Code compiles and passes lint/type checks.
- [ ] Dev server test covering resume upload, analysis display, chat interaction, and task persistence.
- [ ] Documentation updated when contracts, env vars, or workflows change (README + this handbook).
- [ ] Secrets handled through `.env.local` or platform settings only.
- [ ] For backend or export tweaks, run `npm run build && npm start` to smoke test the Express bundle served from `dist/`.
- [ ] Run a quick smoke test against the local dev server (`npm run dev`) to verify `/api/analyze` and `/api/chat` responses.

Keep this guide updated whenever workflow or architecture changes to reduce ramp-up time for future agents.
