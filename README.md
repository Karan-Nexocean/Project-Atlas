# Varuna — Resume Analyzer (Wingman | Nexocean)

A React + Vite + TypeScript + Tailwind app that analyzes resumes with Groq. Includes:
- Upload & analyze (PDF/text) → structured scoring + suggestions
- Wingman Chat assistant for ATS tips and phrasing guidance
- Task planning derived from analysis

## Prerequisites
- Node.js 18+ (recommend Node 20 LTS). See `.nvmrc`.
- Internet access for fonts (Fontshare) and Groq API.

## Setup
1) Install Node (via nvm)
   nvm install
   nvm use

2) Install deps
   npm ci

3) Environment
   cp .env.example .env.local
   # Edit .env.local and set GROQ_API_KEY

## Develop
- Start dev server (with local API routes in Vite):
  npm run dev

- Lint / Type-check:
  npm run lint
  npx tsc -p tsconfig.app.json --noEmit

Dev-only API routes (in `vite.config.ts` → `configureServer`):
- POST /api/analyze
- POST /api/chat
These exist only during `npm run dev`. For production, deploy equivalent server endpoints (Express/serverless) and point the frontend to them.

## Auth & Usage Logging (Optional, zero DB)
- Restrict by email domain and log usage to Slack without a database:
  1) Set in `.env.local`:
     - `ALLOW_EMAIL_DOMAIN=yourcompany.com`
     - `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...` (incoming webhook)
  2) In the UI, click the user icon (top right) and enter your work email.
  3) The app will send `X-Recruiter-Email` with requests. The dev server will:
     - Enforce the domain if `ALLOW_EMAIL_DOMAIN` is set
     - Post a one‑line event to Slack on every analysis/chat (no resume content)

Notes:
- For production hardening, gate the site with SSO (e.g., Cloudflare Access or Netlify Identity) and forward the authenticated email as a header to your API. Keep the Slack logging in place for audit without a DB.

## Build & Preview
- Production build (static):
  npm run build

- Preview static build (no dev APIs):
  npm run preview

## Deploy to Netlify
- See docs/DEPLOY_NETLIFY.md for step-by-step instructions. This repo already includes netlify/functions and netlify.toml so your frontend calls to /api/* will route to serverless functions in production.

## Notes
- Secrets: `.env.local` is git-ignored; never commit real keys. If a key was shared or committed elsewhere, rotate it.
- Fonts: Satoshi is loaded from Fontshare CDN.
