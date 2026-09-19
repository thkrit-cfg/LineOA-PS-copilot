# Sprint Plan — Get Ahead of LINE OA Admin Chat

Goal: turn the `/staff` inbox from a "chat window" into a revenue/retention
cockpit. Native OA Manager shows a conversation; ours shows a **customer** —
their value, intent, and the next money-making move. That is the category
LINE native cannot enter (it has zero business intelligence).

Baseline: commit `438bfd7` (link flow + half-screen drawer + CRM chips).
Stack: React + TS + Vite, Tailwind, motion/react, lucide-react.
Backend: Express (`server/app.ts`) shared by dev + Vercel.
Data: `src/data/mockGroceryDataLake.ts`, `src/services/recommendationEngine.ts`,
`src/services/segmentationEngine.ts`.
Main UI: `src/components/StaffInbox.tsx`, `src/components/CustomerCrmDrawer.tsx`.

Gate for EVERY sprint: `npx tsc --noEmit` clean AND `npm run build` succeeds.
Rules: no commit / push / deploy / credentials. Leave the working tree buildable.
Do not touch `vercel.json`, env vars, or LINE tokens.

---

## Sprint 1 — In-chat copilot (product recs in the thread)
Scope:
- Show top 2–3 `getPersonalizedRecommendations(customer)` in the thread header
  (below the CRM strip) as compact tappable cards: product name, short reason,
  confidence %, suggested promo.
- Tapping a rec inserts a ready-to-send product message into the composer
  (formatted text is fine; Flex card optional) — staff reviews + sends.
- Only for mapped customers (`detail.customer != null`).
Files: `src/components/StaffInbox.tsx`, reuse `src/services/recommendationEngine.ts`,
optionally new `src/components/RecCard.tsx`.
Acceptance:
- Nattaporn's thread shows 2–3 recs with product + reason + confidence.
- Tapping a rec populates the composer with a sendable product message.
- tsc + build clean.

## Sprint 2 — Intent detection + next-best-action
Scope:
- New `src/services/intentEngine.ts`: classify the customer's last message into
  intents (`order_status | complaint | restock | question | greeting | other`)
  via keyword/regex rules (EN + TH).
- Compute a "next best action" from intent + CRM state (segment, tier,
  daysSinceLastPurchase, LTV). E.g. At Risk + >21d inactive → win-back offer;
  complaint → apologize + escalate; restock → quick re-order rec.
- Show an intent tag on the last customer bubble + an NBA chip in the header.
Files: `src/services/intentEngine.ts` (new), `src/components/StaffInbox.tsx`.
Acceptance:
- A handful of sample messages classify to the correct intent.
- NBA chip appears and reflects CRM state.
- tsc + build clean.

## Sprint 3 — Value-priority inbox
Scope:
- Add a priority score to each thread (LTV weight + risk weight + recency).
- Sort the thread list by priority (not just recency); flag high-value /
  at-risk threads with a badge.
Files: `server/inboxStore.ts` (add `ThreadSummary.priority`), `src/components/StaffInbox.tsx`.
Acceptance:
- A dormant Platinum VIP sorts above a recent low-value thread.
- At-risk threads get a visible flag.
- tsc + build clean.

## Sprint 4 — Revenue attribution
Scope:
- New `src/services/attributionEngine.ts`: per-customer value summary from the
  data lake (total LTV, last order value, orders in last 30d, estimated
  "conversation value").
- Show a value strip in the thread header (LTV, last order, 30d value).
- Add a "Top value conversations" sort in the list.
Files: `src/services/attributionEngine.ts` (new), `src/components/StaffInbox.tsx`.
Acceptance:
- A mapped customer shows real LTV + last order value from transactions.
- tsc + build clean.

## Sprint 5 — AI reply drafting (the literal "copilot")
Scope:
- New `src/services/replyDraftEngine.ts`: template/rule-based draft generator
  keyed on intent (Sprint 2) + CRM state. Works offline, no API key.
- Optional LLM path: if `OPENAI_API_KEY` is set, a server endpoint
  `POST /api/inbox/threads/:uid/draft` calls the LLM; otherwise fall back to
  templates. Must degrade gracefully with no key.
- "Draft" button in the composer → shows a suggested reply in an editable
  preview; staff edits + sends.
Files: `src/services/replyDraftEngine.ts` (new), `src/components/StaffInbox.tsx`,
`server/app.ts` (optional `/draft` endpoint).
Acceptance:
- Draft button produces a sensible suggested reply for a sample intent.
- Works with no API key (template path).
- tsc + build clean.

## Sprint 6 — Mobile-first CRM-in-chat (ProfilePanel + compact strip + LINE look)
Source: wireframe `public/docs/wireframes/staff-inbox-v2.html` (TO-BE A–E).
Scope (frontend only, no backend):
- Split `CustomerCrmDrawer.tsx` → **ProfilePanel** (bound to ONE customer prop, NO
  search, bottom sheet on mobile) + keep the search UI as a separate **link-mode
  sheet** (only for unlinked threads). Delete the dead "Set as Active Customer" button.
- Replace the 2-row `CrmStrip` + value strip with ONE compact tappable strip under
  the conversation header: segment · The 1 card (tap-to-copy) · LTV · last purchase ·
  first 2 dietary tags · preferred promo. Tapping the strip opens ProfilePanel.
- Tier chip in the chat header (Platinum VIP / Gold / …).
- `tel:` call link in the ProfilePanel action bar (phone already in profile).
- LINE look & feel on the chat: beige canvas (#eae5dc), white customer bubbles,
  LINE-green staff bubbles (#06c755) + green send button.
- Keep as-is: thread data, priority sort, intent chip, AI draft, copilot recs, composer.
Files: `src/components/StaffInbox.tsx`, `src/components/CustomerCrmDrawer.tsx`
(split into `ProfilePanel.tsx` + link sheet), `src/types.ts` (if needed).
Acceptance:
- Open a mapped thread → one compact strip; tap → ProfilePanel sheet (no search,
  this customer only); card number copies on tap; tel: link present.
- Unlinked thread → "Link CRM" opens the search sheet only.
- Chat canvas is beige, staff bubbles + send button are LINE green.
- tsc + build clean.

## Sprint 7 — Desktop 3-pane layout (≥1024px)
Source: wireframe TO-BE F.
Scope: at ≥1024px render the SAME components as a 3-pane OA-Manager layout —
thread list (left), conversation (center), CRM inspector (right, permanent column
bound to the open thread). Mobile (<1024px) keeps the single-column PWA flow.
One codebase, mobile-first; no duplicate logic.
Files: `src/components/StaffInbox.tsx` (responsive layout), `ProfilePanel.tsx`
(right column on desktop, bottom sheet on mobile).
Acceptance: at ≥1024px the three panes render side by side; inspector shows the
open thread's customer; <1024px is unchanged. tsc + build clean.

## Sprint 8 — Editable staff note (backend + frontend)
Source: wireframe note "Editable staff note".
Scope:
- New endpoint `PATCH /api/inbox/threads/:uid/note` storing a staff note on the
  thread (Neon) — the only new server work.
- "Add note" in the ProfilePanel action bar → editable note field, persisted.
Files: `server/app.ts`, `server/inboxStore.ts`, `src/components/ProfilePanel.tsx`.
Acceptance: add a note in the panel → persists across refresh; tsc + build clean.

## Sprint 9 — Voice / video call (CallScreen + join-link flow)
Source: wireframe TO-BE E (headline differentiator vs LINE OA Manager).
Scope:
- New `CallScreen` component (full-screen: avatar, name, timer, mute/speaker/video/
  end controls, "CRM stays loaded" hint).
- 📞 / 🎥 buttons in the chat header. Staff taps call → app sends a "join call" link
  in the LINE chat → customer taps to join (opens in LINE in-app browser).
- Transport: WebRTC join-link via a configurable signaling service (Daily/Stream).
  Degrades gracefully to `tel:` fallback from the profile sheet when no service is
  configured (no API key).
Files: `src/components/CallScreen.tsx` (new), `src/components/StaffInbox.tsx`,
`server/app.ts` (optional `/call` join-link endpoint).
Acceptance: 📞/🎥 present in header; tapping sends a join link into the thread;
CallScreen renders; tel: fallback works with no service configured. tsc + build clean.

## Backlog (parked)

### Real-time inbox: WebSocket to replace 15s polling — PARKED 2026-09-19
Decision: park. Current 15s poll is durable (Neon) and adequate; revisit if
real-time becomes a staff complaint.

Research done (2026-09-19):
- Vercel Functions serve real WebSockets on Fluid Compute (default for our
  project). `ws` + `WebSocketServer({ noServer: true })` upgrade pattern works
  with our Express app; no vercel.json changes needed for the upgrade itself.
- HARD CONSTRAINT: webhook invocation and the open chat tab are separate
  serverless instances — no shared memory. Cross-instance fan-out needs a
  broker. Vercel's documented pattern for chat = WebSocket + Redis pub/sub
  (Marketplace Redis → REDIS_URL env var, ~$0–25/mo).
- Neon LISTEN/NOTIFY is NOT viable: needs a persistent direct connection,
  which serverless won't hold (and pooled connections disallow it).
- WS connections close at function maxDuration (300s default; 800s max on
  Pro) — client must auto-reconnect with backoff (1s → 30s) and re-join.
- Cheaper interim option if ever needed before Redis: tighten poll to ~5s.

Implementation sketch (when un-parked):
1. Provision Redis via Vercel Marketplace → REDIS_URL.
2. `server/realtime.ts`: per-instance `wss` (noServer) + Redis SUBSCRIBE;
   Express `upgrade` handler on `/api/ws`; heartbeat + reconnect-safe join.
3. Webhook + staff-send routes: after Neon write, `PUBLISH inbox:events`
   with `{ type: 'message', lineUid, ts }` (or full summary).
4. Client: `src/services/realtimeClient.ts` — WS connect, exponential
   backoff, on event → refresh that thread (or append message) + list bump.
   Keep 15s poll as fallback when WS is down.
5. Acceptance: message sent on LINE appears in open staff tab < 2s, no
   refresh; reconnects cleanly after tab sleep; tsc + build clean.
