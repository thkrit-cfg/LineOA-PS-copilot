/**
 * Persistent per-customer thread store for the staff inbox.
 *
 * Primary backend: Upstash Redis via its REST API (plain fetch — no SDK,
 * so it bundles cleanly into the single-file esbuild CJS output).
 * Fallback: in-memory Map (resets per serverless invocation — fine for
 * local dev and degraded mode when UPSTASH_* env vars are absent).
 *
 * Keys:
 *   inbox:thread:{lineUid}  -> JSON Thread
 *   inbox:index             -> JSON ThreadSummary[]
 */

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
  health(): Promise<{ store: 'upstash' | 'memory'; upstashReachable: boolean | null; threads: number }>;
}

const THREAD_KEY = (uid: string) => `inbox:thread:${uid}`;
const INDEX_KEY = 'inbox:index';

// Vercel KV (preferred) or raw Upstash REST. Both expose the same REST API.
const upstashUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(upstashUrl && upstashToken);

// ---- in-memory fallback ----------------------------------------------------
const memThreads = new Map<string, Thread>();

function memIndex(): ThreadSummary[] {
  return Array.from(memThreads.values()).map(summarize).sort((a, b) => a.lastTs - b.lastTs);
}

// ---- upstash helpers -------------------------------------------------------
async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(upstashUrl!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: ['GET', key] }),
  });
  if (!res.ok) throw new Error(`Upstash GET failed: ${res.status}`);
  const json: any = await res.json();
  return typeof json.result === 'string' ? json.result : null;
}

async function redisSet(key: string, value: string): Promise<void> {
  const res = await fetch(upstashUrl!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: ['SET', key, value] }),
  });
  if (!res.ok) throw new Error(`Upstash SET failed: ${res.status}`);
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
  let thread: Thread | null = null;
  if (useUpstash) {
    const raw = await redisGet(THREAD_KEY(lineUid));
    thread = raw ? (JSON.parse(raw) as Thread) : null;
  } else {
    thread = memThreads.get(lineUid) || null;
  }

  if (!thread) {
    thread = {
      lineUid,
      customerCrmId: null,
      displayName: 'LINE User',
      isLineFriend: false,
      messages: [],
      unread: 0,
      lastTs: 0,
    };
  }
  mutate(thread);

  if (useUpstash) {
    await redisSet(THREAD_KEY(lineUid), JSON.stringify(thread));
  } else {
    memThreads.set(lineUid, thread);
  }
  await refreshIndex();
  return thread;
}

async function refreshIndex(): Promise<void> {
  let summaries: ThreadSummary[];
  if (useUpstash) {
    // Rebuild index from all known thread keys we can cheaply derive:
    // we keep a lightweight set of uids in the index itself.
    const rawIdx = await redisGet(INDEX_KEY);
    const idx: ThreadSummary[] = rawIdx ? JSON.parse(rawIdx) : [];
    const uidSet = new Set(idx.map(s => s.lineUid));
    // fetch each thread to get fresh summaries (inbox scale is small)
    const fresh: ThreadSummary[] = [];
    for (const uid of uidSet) {
      const raw = await redisGet(THREAD_KEY(uid));
      if (raw) fresh.push(summarize(JSON.parse(raw) as Thread));
    }
    summaries = fresh.sort((a, b) => a.lastTs - b.lastTs);
    await redisSet(INDEX_KEY, JSON.stringify(summaries));
  } else {
    summaries = memIndex();
  }
  void summaries;
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
    if (useUpstash) {
      const raw = await redisGet(INDEX_KEY);
      const idx: ThreadSummary[] = raw ? JSON.parse(raw) : [];
      return idx.sort((a, b) => b.lastTs - a.lastTs);
    }
    return Array.from(memThreads.values()).map(summarize).sort((a, b) => b.lastTs - a.lastTs);
  },

  async getThread(lineUid) {
    let thread: Thread | null = null;
    if (useUpstash) {
      const raw = await redisGet(THREAD_KEY(lineUid));
      thread = raw ? (JSON.parse(raw) as Thread) : null;
    } else {
      thread = memThreads.get(lineUid) || null;
    }
    if (!thread) return null;
    // Reading a thread clears its unread badge.
    if (thread.unread > 0) {
      thread.unread = 0;
      if (useUpstash) await redisSet(THREAD_KEY(lineUid), JSON.stringify(thread));
      await refreshIndex();
    }
    return thread;
  },

  async health() {
    let upstashReachable: boolean | null = null;
    let count = 0;
    if (useUpstash) {
      try {
        const res = await fetch(upstashUrl!, {
          method: 'POST',
          headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: ['PING'] }),
        });
        upstashReachable = res.ok;
        if (res.ok) {
          const raw = await redisGet(INDEX_KEY);
          count = raw ? JSON.parse(raw).length : 0;
        }
      } catch {
        upstashReachable = false;
      }
    } else {
      count = memThreads.size;
    }
    return { store: useUpstash ? 'upstash' : 'memory', upstashReachable, threads: count };
  },
};
