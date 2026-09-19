# Admin Portal & Dashboard — Tech-Stack Verdict + Scaffold Plan

Audience: **HQ** (Operations Director / Store Manager) tracking store-staff
performance, managing ad-hoc promotions, and reviewing question tickets raised
by staff from the LINE inbox.

Live target: `https://line-oa-ps-copilot.vercel.app/admin` (same Vercel project,
same repo, same Neon DB).

## Tech-stack verdict (locked)

| Concern | Verdict | Why |
|---|---|---|
| Routing | **Keep pathname-based routing** (no react-router) | Existing `/staff` pattern in App.tsx; one more `/admin` branch; zero new deps |
| Auth | **Lucia** (`lucia` npm) + **custom Neon session store** | OSS, battle-tested cookie sessions; custom store over `@neondatabase/serverless` works on Vercel serverless (no node-postgres). Role-gated: `staff` vs `admin` |
| Charts | **Recharts** | Standalone, no design-system entanglement, themes cleanly to the existing dark chrome |
| Tables | **TanStack Table** (headless) | Keeps our hand-rolled Tailwind styling; no CSS framework clash |
| Server state | **TanStack Query** | Caching + refresh for metrics, promos, tickets polling |
| UI components | **Keep existing Tailwind design language** (NO shadcn/Tremor) | App already has a consistent dark chrome; shadcn setup + design clash not worth it at this scale |
| ORM | **Keep raw SQL** via `@neondatabase/serverless` | Consistent with `inboxStore.ts`; schema is small |
| Deep analytics | **Metabase — parked (optional, later)** | Needs a separate external host (Railway/Fly); revisit when HQ wants self-serve BI |

Rejected: Next.js rewrite (app is Vite+Express and deploys fine), Tremor
(needs shadcn setup), Drizzle (no benefit over raw SQL at this scale),
react-router (unnecessary for 3 routes).

## Data model (new Neon tables, auto-created like inbox_threads)

```sql
staff_users (
  id TEXT PRIMARY KEY,            -- e.g. st-001
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,    -- Lucia argon2
  name TEXT NOT NULL,
  role TEXT NOT NULL,             -- 'Store Staff' | 'Produce Specialist' | 'Store Manager' | 'Operations Director'
  branch TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE
)
lucia_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES staff_users(id),
  expires_at TIMESTAMPTZ NOT NULL
)
promotions (                      -- LIVE promos (replaces mock data)
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  promo_type TEXT NOT NULL,
  eligible_categories TEXT[] NOT NULL,
  eligible_skus TEXT[],
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  min_spend INTEGER,
  max_discount INTEGER,
  min_tier TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,                -- staff_users.id
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
tickets (                         -- staff -> HQ question flow
  id TEXT PRIMARY KEY,
  thread_line_uid TEXT NOT NULL,
  staff_id TEXT NOT NULL REFERENCES staff_users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- open | answered | closed
  answer TEXT,
  answered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ
)
```

**Staff attribution (the key gap):** `inbox_threads` gains `replied_by TEXT`
(ADD COLUMN IF NOT EXISTS); staff messages in the `messages` JSONB gain an
optional `staffId` field. `POST /api/inbox/threads/:uid/reply` accepts
`{text, staffId?}`. Every metric below derives from these timestamps/ids.

## API contract (all under existing Express app)

```
POST   /api/admin/login            {email,password} -> sets lucia cookie, {user}
POST   /api/admin/logout
GET    /api/admin/me               -> {user} | 401
GET    /api/admin/metrics          -> {
     kpis: { totalThreads, activeThreads, unread, resolvedToday,
             avgFirstResponseMin, staffMessages24h, openTickets },
     perStaff: [{ staffId, name, branch, role, messages24h, threadsHandled,
                  resolved, avgFirstResponseMin, promoOffers }],
     perBranch: [{ branch, threads, avgFirstResponseMin, resolved }],
     responseTrend: [{ day, avgFirstResponseMin, messages }]  // last 14 days
   }
GET    /api/admin/promotions       -> ActivePromotion[] (live, incl. inactive)
POST   /api/admin/promotions       {promo fields} -> created
PATCH  /api/admin/promotions/:id   {partial} -> updated
DELETE /api/admin/promotions/:id
GET    /api/admin/tickets?status=  -> Ticket[] (with staff name joined)
POST   /api/admin/tickets/:id/answer {answer}
POST   /api/admin/tickets/:id/close

POST   /api/staff/login            {email,password} -> staff cookie, {user}
GET    /api/staff/me               -> {user} | 401
POST   /api/inbox/threads/:uid/reply      {text, staffId?}  (attribution)
POST   /api/inbox/threads/:uid/ticket     {subject, body, staffId}
GET    /api/inbox/threads/:uid/tickets    -> tickets for that thread
```

Auth rules: `/api/admin/*` requires `is_admin`; reply/ticket endpoints accept
either a staff cookie or an explicit `staffId` (fallback for unlogged staff).

## Frontend (new `src/admin/` + staff-side changes)

- `src/admin/AdminPortal.tsx` — shell: login gate (if 401), tabs
  **Performance / Promotions / Tickets**, dark chrome matching the app.
- `src/admin/Dashboard.tsx` — KPI cards + Recharts (response-time trend line,
  per-staff bar, per-branch bar) via TanStack Query.
- `src/admin/Promotions.tsx` — TanStack Table CRUD (create/edit/retire promos;
  instantly visible in staff inbox "On-going promos" strip).
- `src/admin/Tickets.tsx` — ticket queue: open → answer → close.
- `src/App.tsx` — `/admin` pathname branch renders AdminPortal.
- Staff side (`StaffInbox.tsx`):
  - Staff login (email+password) → identity chip in header; replies stamped.
  - **"Ask HQ"** button per thread → ticket form (subject + body).
  - Open/answered tickets for the thread shown as a small banner.
  - "On-going promos" strip reads **live** `/api/admin/promotions` (public
    read of active promos) instead of mock data.

## Seed data (idempotent, on first admin access)
- 4 staff users (1 admin: ops.director@, 3 store staff across 2 branches),
  demo password `demo1234` (documented, changeable).
- 3 live promos ported from mock data.
- 2 sample tickets.
- Backfill: existing threads' staff messages get attributed to a seeded staff
  user round-robin (so the dashboard shows real shape immediately).

## Sprints
- **S10** — Server: tables, Lucia auth (custom Neon store), all /api/admin/* +
  staff login + attribution + ticket endpoints, seed. (OpenCode job A)
- **S11** — Admin frontend: /admin route, login, dashboard, promotions CRUD,
  tickets. (OpenCode job B)
- **S12** — Staff-side wiring: login, reply attribution, Ask HQ, live promos.
  (OpenCode job C)

Each: tsc + build must pass before commit.
