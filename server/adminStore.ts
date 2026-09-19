/**
 * Sprint 10 — Admin Portal data store (staff users, promotions, tickets, metrics).
 *
 * Dual-mode like inboxStore: Neon (serverless Postgres) via @neondatabase/serverless
 * when DATABASE_URL is set, in-memory Maps otherwise. Tables are auto-created on
 * first use (CREATE TABLE IF NOT EXISTS + ALTER ... ADD COLUMN IF NOT EXISTS).
 *
 * Seed (idempotent, run lazily on first admin/staff access via ensureSeeded()):
 *  - 4 staff users, demo password `demo1234`
 *  - 3 live promotions ported from src/data/mockGroceryDataLake.ts
 *  - 2 sample tickets
 *  - attribution backfill on existing inbox threads (first run only)
 */
import { neon } from '@neondatabase/serverless';
import { Scrypt } from 'lucia';
import { inboxStore, type Thread } from './inboxStore';

const neonUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const useNeon = Boolean(neonUrl);
const sql = useNeon ? neon(neonUrl!) : null;

// ---- types -----------------------------------------------------------------
export interface StaffUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  branch: string;
  isAdmin: boolean;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  promoType: string;
  eligibleCategories: string[];
  eligibleSkus: string[] | null;
  /** 'YYYY-MM-DD' (local day granularity, mirrors the mock data shape). */
  startsAt: string;
  /** 'YYYY-MM-DD' — the promo is live through the end of this day. */
  endsAt: string;
  minSpend: number | null;
  maxDiscount: number | null;
  minTier: string[] | null;
  active: boolean;
  createdBy: string | null;
  updatedAt: string;
}

export interface PromotionInput {
  code: string;
  title: string;
  description?: string;
  promoType: string;
  eligibleCategories?: string[];
  eligibleSkus?: string[] | null;
  startsAt: string;
  endsAt: string;
  minSpend?: number | null;
  maxDiscount?: number | null;
  minTier?: string[] | null;
  active?: boolean;
}

export type TicketStatus = 'open' | 'answered' | 'closed';

export interface Ticket {
  id: string;
  threadLineUid: string;
  staffId: string;
  subject: string;
  body: string;
  status: TicketStatus;
  answer: string | null;
  answeredBy: string | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface AdminMetrics {
  kpis: {
    totalThreads: number;
    activeThreads: number;
    unread: number;
    resolvedToday: number;
    avgFirstResponseMin: number | null;
    staffMessages24h: number;
    openTickets: number;
  };
  perStaff: Array<{
    staffId: string;
    name: string;
    branch: string;
    role: string;
    messages24h: number;
    threadsHandled: number;
    resolved: number;
    avgFirstResponseMin: number | null;
    promoOffers: number;
  }>;
  perBranch: Array<{
    branch: string;
    threads: number;
    avgFirstResponseMin: number | null;
    resolved: number;
  }>;
  responseTrend: Array<{
    day: string;
    avgFirstResponseMin: number | null;
    messages: number;
  }>;
}

// ---- password hashing (Lucia's built-in scrypt) ----------------------------
const scrypt = new Scrypt();
export async function hashPassword(password: string): Promise<string> {
  return scrypt.hash(password);
}
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return scrypt.verify(passwordHash, password);
}

// ---- helpers ----------------------------------------------------------------
function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Local 'YYYY-MM-DD' for a day offset from today (same relative scheme as the mock data). */
function dayOffsetDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayKeyOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** timestamptz (Date) -> 'YYYY-MM-DD' in UTC (we store day boundaries in UTC). */
function toDayKey(v: unknown): string {
  const d = v instanceof Date ? v : new Date(v as string);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function dayStartMs(day: string): number {
  return new Date(`${day}T00:00:00Z`).getTime();
}
function dayEndMs(day: string): number {
  return new Date(`${day}T23:59:59.999Z`).getTime();
}

function toIso(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v ?? '');
}

function avgRound(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/**
 * First-response time for a thread: ts of the first staff message minus the ts
 * of the last customer message immediately before it. Null when the thread has
 * no staff reply or no preceding customer message (null-safe).
 */
function firstResponseOf(t: Thread): { deltaMin: number; staffTs: number } | null {
  let i = -1;
  for (let k = 0; k < t.messages.length; k++) {
    if (t.messages[k].from === 'staff') {
      i = k;
      break;
    }
  }
  if (i < 0) return null;
  const staffTs = t.messages[i].ts;
  for (let j = i - 1; j >= 0; j--) {
    if (t.messages[j].from === 'customer') {
      const deltaMs = staffTs - t.messages[j].ts;
      if (deltaMs < 0) return null;
      return { deltaMin: deltaMs / 60000, staffTs };
    }
  }
  return null;
}

// ---- schema (Neon) -----------------------------------------------------------
let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!useNeon || !sql) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS staff_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          branch TEXT NOT NULL,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS lucia_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES staff_users(id),
          expires_at TIMESTAMPTZ NOT NULL
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS promotions (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          promo_type TEXT NOT NULL,
          eligible_categories TEXT[] NOT NULL DEFAULT '{}',
          eligible_skus TEXT[],
          starts_at TIMESTAMPTZ NOT NULL,
          ends_at TIMESTAMPTZ NOT NULL,
          min_spend INTEGER,
          max_discount INTEGER,
          min_tier TEXT[],
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS tickets (
          id TEXT PRIMARY KEY,
          thread_line_uid TEXT NOT NULL,
          staff_id TEXT NOT NULL REFERENCES staff_users(id),
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open',
          answer TEXT,
          answered_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          answered_at TIMESTAMPTZ
        );
      `;
    })()
      .then(() => undefined)
      .catch(err => {
        schemaReady = null; // allow retry on transient failure
        throw err;
      });
  }
  return schemaReady;
}

// ---- in-memory fallback ------------------------------------------------------
const memUsers = new Map<string, StaffUser>();
const memPromos = new Map<string, Promotion>();
const memTickets = new Map<string, Ticket>();

// ---- row mappers -------------------------------------------------------------
function rowToUser(r: any): StaffUser {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    name: r.name,
    role: r.role,
    branch: r.branch,
    isAdmin: Boolean(r.is_admin),
  };
}

function rowToPromotion(r: any): Promotion {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    description: r.description ?? '',
    promoType: r.promo_type,
    eligibleCategories: Array.isArray(r.eligible_categories) ? r.eligible_categories : [],
    eligibleSkus: Array.isArray(r.eligible_skus) ? r.eligible_skus : null,
    startsAt: toDayKey(r.starts_at),
    endsAt: toDayKey(r.ends_at),
    minSpend: r.min_spend == null ? null : Number(r.min_spend),
    maxDiscount: r.max_discount == null ? null : Number(r.max_discount),
    minTier: Array.isArray(r.min_tier) ? r.min_tier : null,
    active: Boolean(r.active),
    createdBy: r.created_by ?? null,
    updatedAt: toIso(r.updated_at),
  };
}

function rowToTicket(r: any): Ticket {
  return {
    id: r.id,
    threadLineUid: r.thread_line_uid,
    staffId: r.staff_id,
    subject: r.subject,
    body: r.body,
    status: (r.status as TicketStatus) || 'open',
    answer: r.answer ?? null,
    answeredBy: r.answered_by ?? null,
    createdAt: toIso(r.created_at),
    answeredAt: r.answered_at ? toIso(r.answered_at) : null,
  };
}

function persistPromotion(p: Promotion): Promise<void> {
  if (useNeon && sql) {
    return sql`
      INSERT INTO promotions
        (id, code, title, description, promo_type, eligible_categories, eligible_skus,
         starts_at, ends_at, min_spend, max_discount, min_tier, active, created_by, updated_at)
      VALUES
        (${p.id}, ${p.code}, ${p.title}, ${p.description}, ${p.promoType}, ${p.eligibleCategories},
         ${p.eligibleSkus}, ${new Date(dayStartMs(p.startsAt))}, ${new Date(dayEndMs(p.endsAt))},
         ${p.minSpend}, ${p.maxDiscount}, ${p.minTier}, ${p.active}, ${p.createdBy}, now())
      ON CONFLICT (id) DO UPDATE SET
        code = EXCLUDED.code,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        promo_type = EXCLUDED.promo_type,
        eligible_categories = EXCLUDED.eligible_categories,
        eligible_skus = EXCLUDED.eligible_skus,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at,
        min_spend = EXCLUDED.min_spend,
        max_discount = EXCLUDED.max_discount,
        min_tier = EXCLUDED.min_tier,
        active = EXCLUDED.active,
        created_by = EXCLUDED.created_by,
        updated_at = now()
    `.then(() => undefined);
  }
  memPromos.set(p.id, p);
  return Promise.resolve();
}

function persistTicket(t: Ticket): Promise<void> {
  if (useNeon && sql) {
    return sql`
      INSERT INTO tickets
        (id, thread_line_uid, staff_id, subject, body, status, answer, answered_by, created_at, answered_at)
      VALUES
        (${t.id}, ${t.threadLineUid}, ${t.staffId}, ${t.subject}, ${t.body}, ${t.status},
         ${t.answer}, ${t.answeredBy}, ${new Date(t.createdAt)}, ${t.answeredAt ? new Date(t.answeredAt) : null})
      ON CONFLICT (id) DO UPDATE SET
        thread_line_uid = EXCLUDED.thread_line_uid,
        staff_id = EXCLUDED.staff_id,
        subject = EXCLUDED.subject,
        body = EXCLUDED.body,
        status = EXCLUDED.status,
        answer = EXCLUDED.answer,
        answered_by = EXCLUDED.answered_by,
        created_at = EXCLUDED.created_at,
        answered_at = EXCLUDED.answered_at
    `.then(() => undefined);
  }
  memTickets.set(t.id, t);
  return Promise.resolve();
}

// ---- seed data ----------------------------------------------------------------
const SEED_STAFF: Array<Omit<StaffUser, 'passwordHash'>> = [
  { id: 'st-001', email: 'ops.director@topsgrocery.test', name: 'Krit', role: 'Operations Director', branch: 'Bangkok HQ', isAdmin: true },
  { id: 'st-siri', email: 'siri@topsgrocery.test', name: 'Siri', role: 'Store Staff', branch: 'Siam Square', isAdmin: false },
  { id: 'st-anan', email: 'anan@topsgrocery.test', name: 'Anan', role: 'Produce Specialist', branch: 'Siam Square', isAdmin: false },
  { id: 'st-malee', email: 'malee@topsgrocery.test', name: 'Malee', role: 'Store Manager', branch: 'Lat Phrao', isAdmin: false },
];

function seedPromotions(): Promotion[] {
  // Ported from ACTIVE_PROMOTIONS in src/data/mockGroceryDataLake.ts
  // (first three; dates kept relative to seed time, same as the mock).
  return [
    {
      id: 'PROMO-FRESH15',
      code: 'FRESH15WED',
      title: '15% Off Organic Vegetables',
      description: 'Royal Project & organic produce, max ฿150 off. Fresh Wednesday pick.',
      promoType: 'CATEGORY_DISCOUNT_15PCT',
      eligibleCategories: ['Fresh Produce'],
      eligibleSkus: null,
      startsAt: dayOffsetDate(-2),
      endsAt: dayOffsetDate(4),
      minSpend: 200,
      maxDiscount: 150,
      minTier: null,
      active: true,
      createdBy: 'st-001',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'PROMO-GOURMETPAIR',
      code: 'GOURMETPAIR',
      title: 'Gourmet Pairing: Free Japanese Sauce',
      description: 'Buy 2 cuts of premium Australian beef, get a free Kikkoman marinade (฿145).',
      promoType: 'ONE_GET_ONE_FREE',
      eligibleCategories: ['Butcher & Seafood'],
      eligibleSkus: ['SKU-MEAT-003'],
      startsAt: dayOffsetDate(-1),
      endsAt: dayOffsetDate(6),
      minSpend: 700,
      maxDiscount: null,
      minTier: ['GOLD', 'PLATINUM_VIP'],
      active: true,
      createdBy: 'st-001',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'PROMO-PANTRYSHIP',
      code: 'PANTRYSHIP',
      title: 'Free Express Delivery on Pantry Restock',
      description: 'Milk, eggs, rice & oil orders over ฿500 ship free within the hour.',
      promoType: 'FREE_EXPRESS_DELIVERY',
      eligibleCategories: ['Dairy & Eggs', 'Pantry & Staples'],
      eligibleSkus: null,
      startsAt: dayOffsetDate(-5),
      endsAt: dayOffsetDate(9),
      minSpend: 500,
      maxDiscount: null,
      minTier: null,
      active: true,
      createdBy: 'st-001',
      updatedAt: new Date().toISOString(),
    },
  ];
}

function seedTickets(): Ticket[] {
  const now = Date.now();
  const h = 3600_000;
  return [
    {
      id: 'TK-SEED-001',
      threadLineUid: 'Udemo0000000000000000000000001',
      staffId: 'st-siri',
      subject: 'GOURMETPAIR at POS — how do I apply it?',
      body: 'Customer at Siam Square wants the free Kikkoman marinade with 2 cuts of Australian beef. Do I key GOURMETPAIR at POS, or is it automatic for Gold+ tiers?',
      status: 'open',
      answer: null,
      answeredBy: null,
      createdAt: new Date(now - 2 * h).toISOString(),
      answeredAt: null,
    },
    {
      id: 'TK-SEED-002',
      threadLineUid: 'Udemo0000000000000000000000001',
      staffId: 'st-anan',
      subject: 'Fresh Wednesday organic veg stock',
      body: 'Royal Project broccoli is running low for the FRESH15WED push. Can HQ confirm the delivery ETA for tomorrow morning?',
      status: 'answered',
      answer: 'Confirmed — the Royal Project delivery arrives 06:30 tomorrow and stock is restocked before opening. Hold the FRESH15WED offer for walk-ins.',
      answeredBy: 'st-001',
      createdAt: new Date(now - 5 * h).toISOString(),
      answeredAt: new Date(now - 1 * h).toISOString(),
    },
  ];
}

// ---- seed (idempotent, lazy) ---------------------------------------------------
let seededInProcess = false;
let seedInFlight: Promise<void> | null = null;

async function countUsers(): Promise<number> {
  if (useNeon && sql) {
    const rows = await sql`SELECT count(*)::int AS c FROM staff_users`;
    return Number(rows[0].c);
  }
  return memUsers.size;
}
async function countPromotions(): Promise<number> {
  if (useNeon && sql) {
    const rows = await sql`SELECT count(*)::int AS c FROM promotions`;
    return Number(rows[0].c);
  }
  return memPromos.size;
}
async function countTickets(): Promise<number> {
  if (useNeon && sql) {
    const rows = await sql`SELECT count(*)::int AS c FROM tickets`;
    return Number(rows[0].c);
  }
  return memTickets.size;
}

/** Idempotent seed — safe to call on every admin/staff access. */
export async function ensureSeeded(): Promise<void> {
  if (seededInProcess) return;
  if (!seedInFlight) {
    seedInFlight = (async () => {
      if (useNeon && sql) await ensureSchema();
      const firstRun = (await countUsers()) === 0;
      if (firstRun) {
        const passwordHash = await hashPassword('demo1234');
        for (const u of SEED_STAFF) {
          if (useNeon && sql) {
            await sql`
              INSERT INTO staff_users (id, email, password_hash, name, role, branch, is_admin)
              VALUES (${u.id}, ${u.email}, ${passwordHash}, ${u.name}, ${u.role}, ${u.branch}, ${u.isAdmin})
              ON CONFLICT (id) DO NOTHING
            `;
          } else {
            memUsers.set(u.id, { ...u, passwordHash });
          }
        }
      }
      if ((await countPromotions()) === 0) {
        for (const p of seedPromotions()) await persistPromotion(p);
      }
      if ((await countTickets()) === 0) {
        for (const t of seedTickets()) await persistTicket(t);
      }
      if (firstRun) {
        // Attribute pre-existing unattributed staff replies round-robin across
        // the 3 non-admin staff so the dashboard has real shape immediately.
        const nonAdminIds = SEED_STAFF.filter(u => !u.isAdmin).map(u => u.id);
        await inboxStore.backfillAllAttribution(nonAdminIds);
      }
      seededInProcess = true;
    })().catch(err => {
      seedInFlight = null; // allow retry
      throw err;
    });
  }
  return seedInFlight;
}

// ---- public store ---------------------------------------------------------------
export const adminStore = {
  ensureSeeded,
  /** Create all admin tables (Neon only; no-op in memory mode). */
  ensureSchema,

  async getUserByEmail(email: string): Promise<StaffUser | null> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM staff_users WHERE lower(email) = lower(${email})`;
      return rows.length ? rowToUser(rows[0]) : null;
    }
    for (const u of memUsers.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  },

  async getUserById(id: string): Promise<StaffUser | null> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM staff_users WHERE id = ${id}`;
      return rows.length ? rowToUser(rows[0]) : null;
    }
    return memUsers.get(id) ?? null;
  },

  async listUsers(): Promise<StaffUser[]> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM staff_users ORDER BY id`;
      return rows.map(rowToUser);
    }
    return Array.from(memUsers.values()).sort((a, b) => a.id.localeCompare(b.id));
  },

  // ---- promotions ----
  async listPromotions(): Promise<Promotion[]> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM promotions ORDER BY id`;
      return rows.map(rowToPromotion);
    }
    return Array.from(memPromos.values()).sort((a, b) => a.id.localeCompare(b.id));
  },

  /** Active promos whose date window contains now (public, staff-inbox read). */
  async listActivePromotions(): Promise<Promotion[]> {
    const now = Date.now();
    return (await this.listPromotions()).filter(
      p => p.active && dayStartMs(p.startsAt) <= now && now <= dayEndMs(p.endsAt)
    );
  },

  async getPromotion(id: string): Promise<Promotion | null> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM promotions WHERE id = ${id}`;
      return rows.length ? rowToPromotion(rows[0]) : null;
    }
    return memPromos.get(id) ?? null;
  },

  async createPromotion(input: PromotionInput, createdBy: string | null): Promise<Promotion> {
    const promo: Promotion = {
      id: newId('PROMO'),
      code: input.code,
      title: input.title,
      description: input.description ?? '',
      promoType: input.promoType,
      eligibleCategories: input.eligibleCategories ?? [],
      eligibleSkus: input.eligibleSkus ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      minSpend: input.minSpend ?? null,
      maxDiscount: input.maxDiscount ?? null,
      minTier: input.minTier ?? null,
      active: input.active ?? true,
      createdBy,
      updatedAt: new Date().toISOString(),
    };
    if (useNeon && sql) await ensureSchema();
    await persistPromotion(promo);
    return promo;
  },

  async updatePromotion(id: string, patch: Partial<PromotionInput>): Promise<Promotion | null> {
    const current = await this.getPromotion(id);
    if (!current) return null;
    const next: Promotion = {
      ...current,
      code: patch.code !== undefined ? patch.code : current.code,
      title: patch.title !== undefined ? patch.title : current.title,
      description: patch.description !== undefined ? patch.description : current.description,
      promoType: patch.promoType !== undefined ? patch.promoType : current.promoType,
      eligibleCategories: patch.eligibleCategories !== undefined ? patch.eligibleCategories : current.eligibleCategories,
      eligibleSkus: patch.eligibleSkus !== undefined ? patch.eligibleSkus : current.eligibleSkus,
      startsAt: patch.startsAt !== undefined ? patch.startsAt : current.startsAt,
      endsAt: patch.endsAt !== undefined ? patch.endsAt : current.endsAt,
      minSpend: patch.minSpend !== undefined ? patch.minSpend : current.minSpend,
      maxDiscount: patch.maxDiscount !== undefined ? patch.maxDiscount : current.maxDiscount,
      minTier: patch.minTier !== undefined ? patch.minTier : current.minTier,
      active: patch.active !== undefined ? patch.active : current.active,
      updatedAt: new Date().toISOString(),
    };
    if (useNeon && sql) await ensureSchema();
    await persistPromotion(next);
    return next;
  },

  async deletePromotion(id: string): Promise<boolean> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`DELETE FROM promotions WHERE id = ${id} RETURNING id`;
      return rows.length > 0;
    }
    return memPromos.delete(id);
  },

  // ---- tickets ----
  async listTickets(status?: TicketStatus): Promise<Ticket[]> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = status
        ? await sql`SELECT * FROM tickets WHERE status = ${status} ORDER BY created_at DESC`
        : await sql`SELECT * FROM tickets ORDER BY created_at DESC`;
      return rows.map(rowToTicket);
    }
    return Array.from(memTickets.values())
      .filter(t => (status ? t.status === status : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listTicketsForThread(threadLineUid: string): Promise<Ticket[]> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM tickets WHERE thread_line_uid = ${threadLineUid} ORDER BY created_at DESC`;
      return rows.map(rowToTicket);
    }
    return Array.from(memTickets.values())
      .filter(t => t.threadLineUid === threadLineUid)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getTicket(id: string): Promise<Ticket | null> {
    if (useNeon && sql) {
      await ensureSchema();
      const rows = await sql`SELECT * FROM tickets WHERE id = ${id}`;
      return rows.length ? rowToTicket(rows[0]) : null;
    }
    return memTickets.get(id) ?? null;
  },

  async createTicket(input: { threadLineUid: string; staffId: string; subject: string; body: string }): Promise<Ticket> {
    const ticket: Ticket = {
      id: newId('TK'),
      threadLineUid: input.threadLineUid,
      staffId: input.staffId,
      subject: input.subject,
      body: input.body,
      status: 'open',
      answer: null,
      answeredBy: null,
      createdAt: new Date().toISOString(),
      answeredAt: null,
    };
    if (useNeon && sql) await ensureSchema();
    await persistTicket(ticket);
    return ticket;
  },

  async answerTicket(id: string, answer: string, answeredBy: string): Promise<Ticket | null> {
    const current = await this.getTicket(id);
    if (!current) return null;
    const next: Ticket = {
      ...current,
      status: 'answered',
      answer,
      answeredBy,
      answeredAt: new Date().toISOString(),
    };
    if (useNeon && sql) await ensureSchema();
    await persistTicket(next);
    return next;
  },

  async closeTicket(id: string): Promise<Ticket | null> {
    const current = await this.getTicket(id);
    if (!current) return null;
    const next: Ticket = { ...current, status: 'closed' };
    if (useNeon && sql) await ensureSchema();
    await persistTicket(next);
    return next;
  },

  // ---- metrics (computed in JS from thread data) --------------------------------
  async computeMetrics(): Promise<AdminMetrics> {
    await ensureSeeded();
    const [threads, users, tickets, promos] = await Promise.all([
      inboxStore.getAllThreads(),
      this.listUsers(),
      this.listTickets(),
      this.listPromotions(),
    ]);

    const now = Date.now();
    const dayMs = 86_400_000;
    const cutoff24h = now - dayMs;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayStartMs = startOfToday.getTime();

    const frByThread = new Map<string, { deltaMin: number; staffTs: number } | null>();
    const allDeltas: number[] = [];
    for (const t of threads) {
      const fr = firstResponseOf(t);
      frByThread.set(t.lineUid, fr);
      if (fr) allDeltas.push(fr.deltaMin);
    }

    let staffMessages24h = 0;
    for (const t of threads) {
      for (const m of t.messages) {
        if (m.from === 'staff' && m.ts >= cutoff24h) staffMessages24h++;
      }
    }

    const kpis = {
      totalThreads: threads.length,
      activeThreads: threads.filter(t => t.status === 'active').length,
      unread: threads.reduce((sum, t) => sum + (t.unread || 0), 0),
      resolvedToday: threads.filter(t => t.status === 'done' && (t.updatedAt || 0) >= todayStartMs).length,
      avgFirstResponseMin: avgRound(allDeltas),
      staffMessages24h,
      openTickets: tickets.filter(t => t.status === 'open').length,
    };

    const userById = new Map(users.map(u => [u.id, u]));
    const promoCodes = promos.map(p => p.code);

    const perStaff = users.map(u => {
      let messages24h = 0;
      let promoOffers = 0;
      for (const t of threads) {
        for (const m of t.messages) {
          if (m.from === 'staff' && m.staffId === u.id) {
            if (m.ts >= cutoff24h) messages24h++;
            if (promoCodes.some(c => m.text.includes(c))) promoOffers++;
          }
        }
      }
      const handled = threads.filter(t => t.repliedBy === u.id);
      const deltas = handled
        .map(t => frByThread.get(t.lineUid)?.deltaMin ?? null)
        .filter((d): d is number => d !== null);
      return {
        staffId: u.id,
        name: u.name,
        branch: u.branch,
        role: u.role,
        messages24h,
        threadsHandled: handled.length,
        resolved: handled.filter(t => t.status === 'done').length,
        avgFirstResponseMin: avgRound(deltas),
        promoOffers,
      };
    });

    const branchOrder: string[] = [];
    const branchAgg = new Map<string, { threads: number; resolved: number; avgs: number[] }>();
    for (const s of perStaff) {
      if (!branchAgg.has(s.branch)) {
        branchAgg.set(s.branch, { threads: 0, resolved: 0, avgs: [] });
        branchOrder.push(s.branch);
      }
      const b = branchAgg.get(s.branch)!;
      b.threads += s.threadsHandled;
      b.resolved += s.resolved;
      if (s.avgFirstResponseMin !== null) b.avgs.push(s.avgFirstResponseMin);
    }
    const perBranch = branchOrder.map(branch => {
      const b = branchAgg.get(branch)!;
      return {
        branch,
        threads: b.threads,
        resolved: b.resolved,
        avgFirstResponseMin: avgRound(b.avgs),
      };
    });

    const responseTrend: AdminMetrics['responseTrend'] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStartMs = todayStartMs - i * dayMs;
      const dayEndMs = dayStartMs + dayMs;
      let messages = 0;
      const deltas: number[] = [];
      for (const t of threads) {
        for (const m of t.messages) {
          if (m.from === 'staff' && m.ts >= dayStartMs && m.ts < dayEndMs) messages++;
        }
        const fr = frByThread.get(t.lineUid);
        if (fr && fr.staffTs >= dayStartMs && fr.staffTs < dayEndMs) deltas.push(fr.deltaMin);
      }
      responseTrend.push({
        day: dayKeyOf(dayStartMs),
        avgFirstResponseMin: avgRound(deltas),
        messages,
      });
    }

    return { kpis, perStaff, perBranch, responseTrend };
  },
};
