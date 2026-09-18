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
