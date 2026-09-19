/**
 * Sprint 10 — Lucia session auth for the Admin Portal + staff inbox.
 *
 * Custom session adapter over the `lucia_sessions` table (Neon) with an
 * in-memory fallback when DATABASE_URL is absent — same dual-mode pattern as
 * inboxStore. Passwords are hashed with Lucia's built-in scrypt.
 *
 * Cookie: httpOnly, SameSite=Lax, Secure in production (NODE_ENV=production
 * or VERCEL=true). Cookie name: `tops_session`.
 */
import type { Express, NextFunction, Request, Response } from 'express';
import { Lucia, TimeSpan } from 'lucia';
import type { Adapter, DatabaseSession, DatabaseUser } from 'lucia';
import { neon } from '@neondatabase/serverless';
import { adminStore, verifyPassword, type StaffUser } from './adminStore';

const neonUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const useNeon = Boolean(neonUrl);
const sql = useNeon ? neon(neonUrl!) : null;

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === 'true';

function userAttributes(u: StaffUser) {
  return { email: u.email, name: u.name, role: u.role, branch: u.branch, isAdmin: u.isAdmin };
}

// ---- session adapters ---------------------------------------------------------
class NeonSessionAdapter implements Adapter {
  async getSessionAndUser(sessionId: string): Promise<[DatabaseSession | null, DatabaseUser | null]> {
    await adminStore.ensureSchema();
    const rows = await sql!`
      SELECT s.id, s.user_id, s.expires_at, u.email, u.name, u.role, u.branch, u.is_admin
      FROM lucia_sessions s
      JOIN staff_users u ON u.id = s.user_id
      WHERE s.id = ${sessionId}
    `;
    if (!rows.length) return [null, null];
    const r: any = rows[0];
    return [
      { id: r.id, userId: r.user_id, expiresAt: r.expires_at, attributes: {} },
      {
        id: r.user_id,
        attributes: {
          email: r.email,
          name: r.name,
          role: r.role,
          branch: r.branch,
          isAdmin: Boolean(r.is_admin),
        },
      },
    ];
  }

  async getUserSessions(userId: string): Promise<DatabaseSession[]> {
    await adminStore.ensureSchema();
    const rows = await sql!`SELECT id, user_id, expires_at FROM lucia_sessions WHERE user_id = ${userId}`;
    return rows.map((r: any) => ({ id: r.id, userId: r.user_id, expiresAt: r.expires_at, attributes: {} }));
  }

  async setSession(session: DatabaseSession): Promise<void> {
    await adminStore.ensureSchema();
    await sql!`
      INSERT INTO lucia_sessions (id, user_id, expires_at)
      VALUES (${session.id}, ${session.userId}, ${session.expiresAt})
      ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at
    `;
  }

  async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    await adminStore.ensureSchema();
    await sql!`UPDATE lucia_sessions SET expires_at = ${expiresAt} WHERE id = ${sessionId}`;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await adminStore.ensureSchema();
    await sql!`DELETE FROM lucia_sessions WHERE id = ${sessionId}`;
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await adminStore.ensureSchema();
    await sql!`DELETE FROM lucia_sessions WHERE user_id = ${userId}`;
  }

  async deleteExpiredSessions(): Promise<void> {
    await adminStore.ensureSchema();
    await sql!`DELETE FROM lucia_sessions WHERE expires_at < now()`;
  }
}

class MemorySessionAdapter implements Adapter {
  private sessions = new Map<string, DatabaseSession>();

  async getSessionAndUser(sessionId: string): Promise<[DatabaseSession | null, DatabaseUser | null]> {
    const session = this.sessions.get(sessionId) ?? null;
    if (!session) return [null, null];
    const user = await adminStore.getUserById(session.userId);
    if (!user) return [session, null];
    return [session, { id: user.id, attributes: userAttributes(user) }];
  }

  async getUserSessions(userId: string): Promise<DatabaseSession[]> {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  async setSession(session: DatabaseSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    const s = this.sessions.get(sessionId);
    if (s) s.expiresAt = expiresAt;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    for (const [id, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(id);
    }
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    for (const [id, s] of this.sessions) {
      if (s.expiresAt < now) this.sessions.delete(id);
    }
  }
}

const adapter: Adapter = useNeon && sql ? new NeonSessionAdapter() : new MemorySessionAdapter();

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(7, 'd'),
  sessionCookie: {
    name: 'tops_session',
    attributes: {
      path: '/',
      sameSite: 'lax',
      secure: isProduction,
    },
  },
});

// ---- helpers --------------------------------------------------------------------
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: StaffUser;
    }
  }
}

function toPublicUser(u: StaffUser) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, branch: u.branch, isAdmin: u.isAdmin };
}

function setSessionCookie(res: Response, sessionId: string) {
  const cookie = lucia.createSessionCookie(sessionId);
  res.cookie(cookie.name, cookie.value, cookie.attributes);
}

function clearSessionCookie(res: Response) {
  const cookie = lucia.createBlankSessionCookie();
  res.cookie(cookie.name, cookie.value, cookie.attributes);
}

/** Optional: resolve the logged-in user from the session cookie (null if none). */
export async function currentUser(req: Request): Promise<StaffUser | null> {
  const sessionId = lucia.readSessionCookie(req.headers.cookie || '');
  if (!sessionId) return null;
  const { user } = await lucia.validateSession(sessionId);
  if (!user) return null;
  return adminStore.getUserById(user.id);
}

/** Gate for /api/admin/* — 401 when logged out, 403 for non-admin staff. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    if (!user.isAdmin) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// ---- routes -----------------------------------------------------------------------
async function handleLogin(req: Request, res: Response, adminOnly: boolean) {
  const { email, password } = (req.body || {}) as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  await adminStore.ensureSeeded();
  const user = await adminStore.getUserByEmail(email.trim());
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (adminOnly && !user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  const session = await lucia.createSession(user.id, {});
  setSessionCookie(res, session.id);
  res.json({ user: toPublicUser(user) });
}

export function registerAuthRoutes(app: Express) {
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      await handleLogin(req, res, true);
    } catch (err: any) {
      res.status(500).json({ error: 'login failed', message: err?.message });
    }
  });

  app.post('/api/staff/login', async (req: Request, res: Response) => {
    try {
      await handleLogin(req, res, false);
    } catch (err: any) {
      res.status(500).json({ error: 'login failed', message: err?.message });
    }
  });

  async function handleLogout(req: Request, res: Response) {
    const sessionId = lucia.readSessionCookie(req.headers.cookie || '');
    if (sessionId) {
      await lucia.invalidateSession(sessionId);
    }
    clearSessionCookie(res);
    res.json({ success: true });
  }

  app.post('/api/admin/logout', async (req: Request, res: Response) => {
    try {
      await handleLogout(req, res);
    } catch (err: any) {
      res.status(500).json({ error: 'logout failed', message: err?.message });
    }
  });

  app.post('/api/staff/logout', async (req: Request, res: Response) => {
    try {
      await handleLogout(req, res);
    } catch (err: any) {
      res.status(500).json({ error: 'logout failed', message: err?.message });
    }
  });

  app.get('/api/admin/me', requireAdmin, (req: Request, res: Response) => {
    res.json({ user: toPublicUser(req.user!) });
  });

  app.get('/api/staff/me', async (req: Request, res: Response) => {
    try {
      const user = await currentUser(req);
      if (!user) {
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
      res.json({ user: toPublicUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to read session', message: err?.message });
    }
  });
}
