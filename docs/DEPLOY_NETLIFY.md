# Deploying Atlas on Netlify (Production)

This guide sets up Netlify as hosting + serverless API with zero-DB auth and usage logging. It keeps your frontend code unchanged by routing /api/* to Netlify Functions.

## 1) Repo prerequisites
- Node 20+ (repo has .nvmrc=20; Netlify will honor it).
- Functions live in netlify/functions/:
  - analyze.ts → handles resume analysis
  - chat.ts → Wingman chat + task planner
- Redirects defined in netlify.toml to map /api/* → functions.

## 2) Create the site
- On Netlify Dashboard → Add new site → Import from Git
- Select this repo.
- Build settings:
  - Build command: npm run build
  - Publish directory: dist
  - Functions directory: netlify/functions

## 3) Environment variables
Add the following in Site settings → Build & deploy → Environment:
- GROQ_API_KEY (required)
- ALLOW_EMAIL_DOMAIN=yourcompany.com (optional but recommended)
- SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... (optional log stream; no DB needed)
- Optional frontend hint: VITE_ALLOW_EMAIL_DOMAIN=yourcompany.com

Redeploy after changing env vars.

## 4) Identity (optional but recommended)
Use Netlify Identity to strongly assert user emails (instead of a self-entered header):
- Enable Identity (Site settings → Identity → Enable Identity)
- Registration preferences: Invite only (or Open + Allowed domains)
- Allowed domains: yourcompany.com
- Providers: Google/Microsoft (as desired)

How it works with functions:
- When the frontend includes an Authorization: Bearer <token> header from Netlify Identity, Netlify injects the verified user into context.clientContext.user inside functions.
- Our functions already prefer Identity email if present; otherwise, they fallback to the X-Recruiter-Email header you set in the UI (top right → “Identify”).

Note: The static UI itself is public by default. Identity protects your function calls (the real data). To force UI login flows, add the netlify-identity-widget package and request a token before calling /api/*.

## 5) Domain
- Default domain is <site-name>.netlify.app. Choose a site name like atlas to get https://atlas.netlify.app.
- To change: Site settings → Domain management → Primary domain → Edit site name.

## 6) Usage logging (no DB)
- Each analyze and chat call posts a single-line event to Slack (no resume content). Example:
  - Atlas Analyze • recruiter@yourcompany.com → Jane Doe • score=78 • len=8421
- This gives you an audit trail of who used Atlas for which candidate with zero storage.

## 7) Frontend behavior (unchanged)
- The app continues to call /api/analyze and /api/chat.
- In production, netlify.toml routes those to /.netlify/functions/*.
- Recruiter identity:
  - If Netlify Identity is used and the browser sends a token, functions use that email.
  - Else, the app sends X-Recruiter-Email from the small identity prompt (top right).
  - If ALLOW_EMAIL_DOMAIN is set, functions will reject non-matching emails.

## 8) Local dev vs Netlify
- Local: npm run dev uses Vite middleware endpoints in vite.config.ts and the .env.local file.
- Netlify: /api/* handled by netlify/functions/* with env vars set in the dashboard.

## 9) Troubleshooting
- 401/403 from /api/*: identity header/token missing or domain mismatch. Enter your work email (top right) or sign in via Identity.
- GROQ_API_KEY is not set: add it in Netlify env and redeploy.
- PDF text extraction failed: ensure the PDF is text-based; scanned PDFs won’t extract well.
- Build uses Node 20: .nvmrc ensures this on Netlify. If needed, set NODE_VERSION=20 env.

## (Optional) Stronger gating in the UI
If you want to require verified login before any use:
- Add netlify-identity-widget and a simple login button.
- After login, fetch a token and attach Authorization: Bearer <token> to all /api/* calls.
- The existing function code will trust the Identity email over the header.

That’s it—once deployed, your app will be live at https://<site-name>.netlify.app with serverless APIs, optional domain gating, and Slack-based usage logs.
