# JavaScript implementation notes

FinanceFlow’s UI is a **static, browser-run application** built from HTML + inline JavaScript.

## Where JS lives

- Page scripts (inline inside HTML):
  - `site/public/index.html` (login + routing)
  - `site/public/onboarding.html` (profile capture)
  - `site/public/dashboard.html` (render totals, goals, transactions)
  - `site/public/income.html` (income CRUD in demo)
  - `site/public/expenses.html` (expense CRUD in demo)
  - `site/public/settings.html` (settings UX)
- Shared reusable JS:
  - `site/public/shared_modals.js` (custom alert/confirm/prompt modals)

## State management (current demo)

Right now the UI stores data in **`localStorage`** so it works without a server.

### Key conventions

Two styles exist:

1. “Scoped” JSON keys (preferred in the app data layer)
   - `ff_transactions` (array)
   - `ff_goals` (array)
   - `ff_<key>` values read/written via helpers like:
     - `STORE.get('transactions', [])` → reads `ff_transactions`
     - `STORE.set('transactions', txns)` → writes `ff_transactions`
2. Simple string keys for identity/settings
   - `ff_userName`
   - `ff_userEmail` (standardized)

Legacy compatibility:

- Some older pages used `ff_email`
- The app now migrates `ff_email → ff_userEmail` if needed.

## Rendering approach

Pages like `dashboard.html`, `income.html`, and `expenses.html` follow the same pattern:

- Read arrays from `localStorage`
- Calculate totals (income/expense/balance)
- Render sections by writing `innerHTML` based on sorted data
- Wire up event listeners for:
  - opening/closing modals
  - form submissions
  - deleting records (with confirm)

This keeps the demo lightweight and dependency-free.

## Shared modals (replacing native popups)

`site/public/shared_modals.js` provides:

- `window.showAppAlert(message, title?)`
- `window.showAppConfirm(message, title?)`
- `window.showAppPrompt(message, defaultValue?, title?)`

Production hardening included:

- Defensive insertion of modal DOM (safe even if called before `DOMContentLoaded`)
- Single global container (`#appModalContainer`) injected into `<body>`

Pages include `shared_modals.js` once and then call these helpers for consistent UX.

## Security / production posture (static site)

Static sites still benefit from security headers:

- `vercel.json` adds:
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options`, `X-Content-Type-Options`, etc.

Note: CSP currently allows inline scripts/styles because the UI is inline-heavy.  
When a build pipeline is introduced (Tailwind build + bundling), CSP can be tightened to remove `'unsafe-inline'`.

## Current limitation (intentional)

Until the API/auth phase:

- “Login” is routing/UX only (no real authentication)
- Data does not sync across devices because it lives in the browser
- Any “password update” or similar flows are demo-only

## Next step (when API is added)

The goal is to keep the UI/UX largely the same, but replace the storage layer:

- Replace `localStorage` reads/writes with fetch calls to an API
- Persist to MySQL (schema + migrations already exist under `server/`)

