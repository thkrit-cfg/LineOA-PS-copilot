# Staff Inbox — API Contract (source of truth)

Purpose: a **pure-human** staff middleware PWA. Customer sends a LINE message →
webhook stores it in a per-customer thread → staff reads/replies in a web PWA →
reply is pushed back to LINE via the Messaging API. No AI. CRM data is shown
alongside the chat via the existing `CustomerCrmDrawer`.

## Storage

Primary: **Upstash Redis REST** (no SDK — plain `fetch`).
Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

REST protocol:
- `POST {UPSTASH_REDIS_REST_URL}`
- headers: `{ Authorization: "Bearer {TOKEN}", "Content-Type": "application/json" }`
- body: `{ "command": ["GET", key] }` → `{ "result": <string|null> }`
- body: `{ "command": ["SET", key, value] }` → `{ "result": "OK" }`
- batch: `{ "commands": [["GET","a"],["GET","b"]] }` → `{ "results": [...] }`

**Fallback:** if either env var is missing/empty, use an in-memory `Map`
(resets per serverless invocation — fine for local dev + degraded mode).
The store interface must be identical either way so routes don't care.

### Redis keys
- `inbox:thread:{lineUid}` → JSON string of a `Thread`:
  ```ts
  {
    lineUid: string;
    customerCrmId: string | null;      // matched via mockDb.getCustomerByLineUid
    displayName: string;               // lineDisplayName || customer.fullName || 'LINE User'
    isLineFriend: boolean;
    messages: { id: string; from: 'customer' | 'staff'; text: string; ts: number }[];
    unread: number;                    // customer messages not yet seen by staff
    lastTs: number;
  }
  ```
- `inbox:index` → JSON array of thread summaries, newest last:
  ```ts
  { lineUid: string; lastTs: number; lastText: string; unread: number;
    displayName: string; customerCrmId: string | null }[]
  ```

## Endpoints (all under the existing Express `createApp()` in server/app.ts)

### POST /api/line/webhook  (EXISTING — extend, do not break)
Keep signature verification + the `/crm` bot Flex reply exactly as-is.
ADDITIONALLY, for every `event.type === 'message' && event.message.type === 'text'`:
- `lineUid = event.source.userId`
- upsert the customer message into the thread (append to `messages`, `from:'customer'`,
  `unread += 1`, update `lastTs`/`lastText`, refresh `inbox:index`)
- match `customerCrmId` via `mockDb.getCustomerByLineUid(lineUid)` (may be null → guest)
- still return `200 { status:'ok', processedEvents }`

### GET /api/inbox/threads
`{ data: [ { lineUid, customerCrmId, displayName, isLineFriend, lastText, lastTs,
             unread, rfmSegment?, tier? } ] }` sorted by `lastTs` DESC.
`rfmSegment`/`tier` come from the matched `CustomerProfile` (omit if guest).

### GET /api/inbox/threads/:lineUid
`{ data: { lineUid, customerCrmId, displayName, isLineFriend,
           messages: [...], unread: 0, customer: CustomerProfile | null } }`
Reading a thread sets its `unread = 0` (and updates `inbox:index`).

### POST /api/inbox/threads/:lineUid/reply
body `{ text: string }`
- push to LINE: `POST https://api.line.me/v2/bot/message/push`
  headers `Authorization: Bearer {LINE_CHANNEL_ACCESS_TOKEN}`,
  body `{ to: lineUid, messages: [{ type:'text', text }] }`
- append the staff message to the thread (`from:'staff'`, update lastTs/lastText)
- returns `{ success: boolean, lineApiResponse: any, realLinePushAttempted: boolean }`
  (mirror the existing `/api/line/push` graceful behaviour when no token)

### GET /api/inbox/health
`{ store: 'upstash' | 'memory', upstashReachable: boolean|null, threads: number }`

## Frontend (route /staff — NEW, separate from /liff/staff)
- Mobile-first PWA at `/staff` (vercel.json rewrite `/staff` → `/index.html`).
- Two views: **thread list** and **thread detail**.
- Thread list row: avatar/initial, displayName, tier badge, lastText, time, unread badge.
- Thread detail: chat bubbles (customer left, staff right), scrollable, auto-scroll to
  bottom; a **CRM** button opens the existing `CustomerCrmDrawer` for that customer;
  reply composer (input + send) → POST reply.
- Poll `GET /api/inbox/threads` every ~4s (and on focus) for new messages; poll the open
  thread's messages too while detail is open.
- PWA: `public/manifest.webmanifest` + `public/sw.js` (cache-first for static,
  network-first for /api), linked in `index.html`. Installable on mobile.
- Reuse the existing Tailwind palette (`#0b0f17`, `#0d131f`, `#141c2a`, slate-800 borders,
  emerald/amber accents) and `lucide-react` icons so it matches the LIFF app.

## Build / deploy (handled centrally — sub-agents do NOT run these)
- `npm run build && npm run build:api` (esbuild bundles server/entry.ts → api/index.js)
- Vercel prod deploy, team `thkrit-cfg`, project `line-oa-ps-copilot`
- New Vercel env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
