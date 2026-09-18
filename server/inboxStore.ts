/**
 * Persistent per-customer thread store for the staff inbox.
 *
 * Primary backend: Neon (serverless Postgres) via @neondatabase/serverless
 * (pure-JS driver — bundles cleanly into the esbuild CJS API output).
 * Fallback: in-memory Map (resets per serverless invocation — fine for local
 * dev and degraded mode when DATABASE_URL is absent).
 *
 * Schema (auto-created on first use):
 *   inbox_threads(
 *     line_uid TEXT PRIMARY KEY,
 *     customer_crm_id TEXT,
 *     display_name TEXT NOT NULL DEFAULT 'LINE User',
 *     avatar_url TEXT,
 *     is_line_friend BOOLEAN NOT NULL DEFAULT FALSE,
 *     messages JSONB NOT NULL DEFAULT '[]',
 *     unread INTEGER NOT NULL DEFAULT 0,
 *     last_ts BIGINT NOT NULL DEFAULT 0,
 *     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   )
 *
 * Each customer's full chat history lives in the `messages` JSONB column.
 */
import { neon } from '@neondatabase/serverless';

export interface InboxMessage {
  id: string;
  from: 'customer' | 'staff';
  text: string;
  ts: number;
}

export interface Thread {
  lineUid: string;
  customerCrmId: string | null;
  displayName: string;
  avatarUrl?: string;
  isLineFriend: boolean;
  messages: InboxMessage[];
  unread: number;
  lastTs: number;
}

export interface ThreadSummary {
  lineUid: string;
  customerCrmId: string | null;
  displayName: string;
  avatarUrl?: string;
  isLineFriend: boolean;
  lastText: string;
  lastTs: number;
  unread: number;
  /** Sprint 3: value-priority score (0–100) + flags — enriched by the API. */
  priority?: number;
  priorityFlags?: Array<'high_value' | 'at_risk'>;
}

interface InboxStore {
  upsertCustomerMessage(
    lineUid: string,
    text: string,
    displayName: string,
    customerCrmId: string | null,
    isLineFriend: boolean,
    avatarUrl?: string
  ): Promise<Thread | null>;
  appendStaffMessage(lineUid: string, text: string): Promise<Thread | null>;
  linkCrm(
    lineUid: string,
    crmCustomerId: string,
    identity?: { displayName?: string; avatarUrl?: string }
  ): Promise<Thread | null>;
  listThreads(): Promise<ThreadSummary[]>;
  getThread(lineUid: string): Promise<Thread | null>;
  health(): Promise<{ store: 'neon' | 'memory'; reachable: boolean | null; threads: number }>;
}

// Neon connection string (Vercel env var DATABASE_URL, or NEON_DATABASE_URL).
const neonUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const useNeon = Boolean(neonUrl);
const sql = useNeon ? neon(neonUrl!) : null;

// ---- in-memory fallback ----------------------------------------------------
const memThreads = new Map<string, Thread>();

// ---- neon helpers ----------------------------------------------------------
let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!useNeon || !sql) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS inbox_threads (
        line_uid TEXT PRIMARY KEY,
        customer_crm_id TEXT,
        display_name TEXT NOT NULL DEFAULT 'LINE User',
        avatar_url TEXT,
        is_line_friend BOOLEAN NOT NULL DEFAULT FALSE,
        messages JSONB NOT NULL DEFAULT '[]',
        unread INTEGER NOT NULL DEFAULT 0,
        last_ts BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `
      .then(() => undefined)
      .catch(err => {
        schemaReady = null; // allow retry on transient failure
        throw err;
      });
  }
  return schemaReady;
}

function rowToThread(r: any): Thread {
  return {
    lineUid: r.line_uid,
    customerCrmId: r.customer_crm_id ?? null,
    displayName: r.display_name,
    avatarUrl: r.avatar_url ?? undefined,
    isLineFriend: Boolean(r.is_line_friend),
    messages: Array.isArray(r.messages) ? (r.messages as InboxMessage[]) : [],
    unread: Number(r.unread),
    lastTs: Number(r.last_ts),
  };
}

function newThread(lineUid: string): Thread {
  return {
    lineUid,
    customerCrmId: null,
    displayName: 'LINE User',
    isLineFriend: false,
    messages: [],
    unread: 0,
    lastTs: 0,
  };
}

// ---- shared logic ----------------------------------------------------------
function summarize(t: Thread): ThreadSummary {
  const last = t.messages[t.messages.length - 1];
  return {
    lineUid: t.lineUid,
    customerCrmId: t.customerCrmId,
    displayName: t.displayName,
    avatarUrl: t.avatarUrl,
    isLineFriend: t.isLineFriend,
    lastText: last ? last.text : '',
    lastTs: t.lastTs,
    unread: t.unread,
  };
}

function newMessageId(): string {
  return `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function upsertThread(
  lineUid: string,
  mutate: (t: Thread) => void
): Promise<Thread | null> {
  if (useNeon && sql) {
    await ensureSchema();
    const rows = await sql`SELECT * FROM inbox_threads WHERE line_uid = ${lineUid}`;
    const thread = rows.length ? rowToThread(rows[0]) : newThread(lineUid);
    mutate(thread);
    await sql`
      INSERT INTO inbox_threads
        (line_uid, customer_crm_id, display_name, avatar_url, is_line_friend, messages, unread, last_ts, updated_at)
      VALUES
        (${thread.lineUid}, ${thread.customerCrmId}, ${thread.displayName}, ${thread.avatarUrl ?? null},
         ${thread.isLineFriend}, ${JSON.stringify(thread.messages)}::jsonb, ${thread.unread}, ${thread.lastTs}, now())
      ON CONFLICT (line_uid) DO UPDATE SET
        customer_crm_id = EXCLUDED.customer_crm_id,
        display_name = EXCLUDED.display_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, inbox_threads.avatar_url),
        is_line_friend = EXCLUDED.is_line_friend,
        messages = EXCLUDED.messages,
        unread = EXCLUDED.unread,
        last_ts = EXCLUDED.last_ts,
        updated_at = now()
    `;
    return thread;
  }

  // in-memory fallback
  const thread = memThreads.get(lineUid) || newThread(lineUid);
  mutate(thread);
  memThreads.set(lineUid, thread);
  return thread;
}

// ---- public store ----------------------------------------------------------
export const inboxStore: InboxStore = {
  async upsertCustomerMessage(lineUid, text, displayName, customerCrmId, isLineFriend, avatarUrl) {
    return upsertThread(lineUid, t => {
      if (customerCrmId && !t.customerCrmId) t.customerCrmId = customerCrmId;
      if (displayName && t.displayName === 'LINE User') t.displayName = displayName;
      if (avatarUrl && !t.avatarUrl) t.avatarUrl = avatarUrl;
      t.isLineFriend = isLineFriend || t.isLineFriend;
      t.messages.push({ id: newMessageId(), from: 'customer', text, ts: Date.now() });
      t.unread += 1;
      t.lastTs = Date.now();
    });
  },

  async appendStaffMessage(lineUid, text) {
    return upsertThread(lineUid, t => {
      t.messages.push({ id: newMessageId(), from: 'staff', text, ts: Date.now() });
      t.lastTs = Date.now();
    });
  },

  async linkCrm(lineUid, crmCustomerId, identity) {
    return upsertThread(lineUid, t => {
      t.customerCrmId = crmCustomerId;
      if (identity?.displayName) t.displayName = identity.displayName;
      if (identity?.avatarUrl) t.avatarUrl = identity.avatarUrl;
    });
  },

  async listThreads() {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM inbox_threads ORDER BY last_ts DESC`;
      return rows.map(rowToThread).map(summarize).sort((a, b) => b.lastTs - a.lastTs);
    }
    return Array.from(memThreads.values()).map(summarize).sort((a, b) => b.lastTs - a.lastTs);
  },

  async getThread(lineUid) {
    let thread: Thread | null = null;
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM inbox_threads WHERE line_uid = ${lineUid}`;
      thread = rows.length ? rowToThread(rows[0]) : null;
      if (!thread) return null;
      // Reading a thread clears its unread badge.
      if (thread.unread > 0) {
        thread.unread = 0;
        await sql`UPDATE inbox_threads SET unread = 0 WHERE line_uid = ${lineUid}`;
      }
      return thread;
    }
    thread = memThreads.get(lineUid) || null;
    if (!thread) return null;
    if (thread.unread > 0) {
      thread.unread = 0;
    }
    return thread;
  },

  async health() {
    if (useNeon && sql) {
      try {
        await ensureSchema();
        const rows = await sql`SELECT count(*)::int AS c FROM inbox_threads`;
        return { store: 'neon', reachable: true, threads: Number(rows[0].c) };
      } catch {
        return { store: 'neon', reachable: false, threads: 0 };
      }
    }
    return { store: 'memory', reachable: null, threads: memThreads.size };
  },
};
