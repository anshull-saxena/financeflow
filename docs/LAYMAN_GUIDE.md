# FinanceFlow — Layman Guide (Presentation Ready)

## 1) What is FinanceFlow?

FinanceFlow is a **personal finance dashboard** that helps a user:

- Track **income** and **expenses**
- See a quick **dashboard** view of balance and recent activity
- Set **financial goals** and track progress
- Manage basic **settings** (theme, profile, preferences)

Today, the project is built as a **beautiful, fast UI demo** that runs as a static website.  
We also prepared a **production-grade MySQL database schema + migrations**, so it’s ready to connect to a real backend later.

## 2) The problem it solves (in simple words)

Most people manage money across multiple places (notes, sheets, apps). FinanceFlow brings the essentials into one experience:

- “Where is my money going?”
- “How much did I earn/spend this month?”
- “Am I on track for my goals?”

## 3) What users can do (features)

**Core screens**

- **Login** (`index.html`): entry point to the app experience (demo flow; real auth planned later).
- **Onboarding** (`onboarding.html`): capture name, email, currency, monthly goal.
- **Dashboard** (`dashboard.html`): balance, income/expense summary, recent transactions, goals.
- **Income** (`income.html`): add/delete income records.
- **Expenses** (`expenses.html`): add/delete expense records and category breakdown.
- **Settings** (`settings.html`): profile + preferences (demo interactions).

**Data behavior (current)**

- In the demo, data is stored in the browser using `localStorage` so the UI works without any server.
- The database (MySQL) layer is ready so that, once the API is added, the UI can store the same data permanently.

## 4) Demo script (what to show in a live presentation)

Use this flow to present in ~3–5 minutes:

1. Open **Login**
   - Explain it’s a demo entry screen (no real auth yet).
2. Go to **Onboarding**
   - Enter name/email, choose currency, set monthly goal.
3. Land on **Dashboard**
   - Highlight: balance, income, expenses, “Recent Transactions”.
4. Go to **Income**
   - Add an income record; show it reflected in totals.
5. Go to **Expenses**
   - Add an expense; show updated dashboard totals.
6. Open **Settings**
   - Show theme toggle and profile edit (demo prompts/modals).

Tip: If you want stable visuals for slides, use screenshots in `financeflow_app/` (PNG files).

## 5) How it’s built (simple architecture explanation)

Right now there are **two layers**:

### A) UI layer (static website)

- Lives in: `site/public/`
- Deployed as a static site (Vercel rewrite routes everything to `site/public`)
- Runs instantly in the browser

### B) Data layer (ready for production)

- Lives in: `server/`
- Includes:
  - MySQL schema
  - migrations (versioned SQL changes)
  - seed script (demo rows)
- The API/auth layer is intentionally deferred for later.

**Mental model**

```
Browser UI (site/public)
  ├─ today: localStorage (demo)
  └─ next: calls API (planned)
               └─ MySQL (server schema ready)
```

## 6) Database design (what’s in MySQL)

The initial schema supports the same concepts you see in the UI:

- `users`: basic user identity (no auth yet)
- `user_settings`: currency, monthly goal, preferences
- `transactions`: income + expense entries (amount, category, time)
- `goals`: savings goals (target vs saved)

Schema file:

- `server/migrations/001_init.sql`

## 7) “Production ready” improvements already applied

Even while staying a static site, the project includes real production-minded work:

- Security headers + CSP for the site (`vercel.json`)
- Hardened modal utilities so pages don’t break if called early (`site/public/shared_modals.js`)
- Removed hardcoded demo credentials from login behavior
- Standardized user identity keys (`ff_userName`, `ff_userEmail`) + migration from legacy keys
- MySQL migrations + seed tooling so DB is deployable in real environments

## 8) How to run it locally (quick)

### Run the UI

Because it’s static HTML, you can serve `site/public/` with any static server. For example:

- `npx serve site/public`

(Or use any simple static host.)

### Set up MySQL (no Docker)

Follow:

- `docs/MYSQL_SETUP.md`

This creates the DB/user and runs migrations + seed scripts under `server/`.

## 9) Honest limitations (what’s next)

What is still pending to become a full production app:

- Real authentication (signup/login, sessions, password reset)
- API server to store data in MySQL (instead of `localStorage`)
- Input validation + rate limiting at API boundaries
- CI checks (lint/tests) once the backend is introduced

## 10) Roadmap (nice to say at the end of the presentation)

1. Add API layer (Node.js) to connect UI ↔ MySQL
2. Add auth and secure sessions
3. Add analytics (monthly reports, category trends)
4. Add export/import (CSV), and multi-device sync

