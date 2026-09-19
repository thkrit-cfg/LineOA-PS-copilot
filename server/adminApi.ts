/**
 * Sprint 10 — Admin Portal API routes (metrics, promotions CRUD, tickets)
 * plus the public active-promotions read consumed by the staff inbox.
 *
 * All /api/admin/* routes require an admin session (requireAdmin middleware
 * from auth.ts). GET /api/inbox/promotions is intentionally unauthenticated.
 */
import type { Express, Request, Response } from 'express';
import { adminStore, type PromotionInput, type TicketStatus } from './adminStore';
import { requireAdmin } from './auth';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDay(v: unknown): v is string {
  return typeof v === 'string' && DAY_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

export function registerAdminApi(app: Express) {
  // Public (no auth): active promos whose date window contains now.
  // This is what the staff inbox "On-going promos" strip consumes.
  app.get('/api/inbox/promotions', async (_req: Request, res: Response) => {
    try {
      await adminStore.ensureSeeded();
      const data = await adminStore.listActivePromotions();
      res.json({ data, total: data.length });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to list promotions', message: err?.message });
    }
  });

  // Dev-only: demo admin credentials for the login hint. NEVER served in
  // production — the /admin page source must not contain the email/password.
  app.get('/api/admin/demo-credentials', async (_req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      res.status(404).json({ error: 'not found' });
      return;
    }
    try {
      await adminStore.ensureSeeded();
      const admin = adminStore.demoAdmin();
      res.json({
        email: admin.email,
        password: process.env.DEMO_ADMIN_PASSWORD || 'demo1234',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to load demo credentials', message: err?.message });
    }
  });

  // ---- metrics ----
  app.get('/api/admin/metrics', requireAdmin, async (_req: Request, res: Response) => {
    try {
      res.json(await adminStore.computeMetrics());
    } catch (err: any) {
      res.status(500).json({ error: 'failed to compute metrics', message: err?.message });
    }
  });

  // ---- promotions CRUD ----
  app.get('/api/admin/promotions', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const data = await adminStore.listPromotions();
      res.json({ data, total: data.length });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to list promotions', message: err?.message });
    }
  });

  app.post('/api/admin/promotions', requireAdmin, async (req: Request, res: Response) => {
    try {
      const b = (req.body || {}) as Record<string, unknown>;
      const missing = ['code', 'title', 'promoType', 'startsAt', 'endsAt'].filter(
        k => typeof b[k] !== 'string' || !(b[k] as string).trim()
      );
      if (missing.length) {
        res.status(400).json({ error: `missing or invalid fields: ${missing.join(', ')}` });
        return;
      }
      if (!isValidDay(b.startsAt) || !isValidDay(b.endsAt)) {
        res.status(400).json({ error: 'startsAt and endsAt must be YYYY-MM-DD dates' });
        return;
      }
      const input: PromotionInput = {
        code: String(b.code).trim(),
        title: String(b.title).trim(),
        description: typeof b.description === 'string' ? b.description : '',
        promoType: String(b.promoType).trim(),
        eligibleCategories: Array.isArray(b.eligibleCategories) ? b.eligibleCategories.map(String) : [],
        eligibleSkus: Array.isArray(b.eligibleSkus) ? b.eligibleSkus.map(String) : null,
        startsAt: String(b.startsAt).trim(),
        endsAt: String(b.endsAt).trim(),
        minSpend: typeof b.minSpend === 'number' && Number.isFinite(b.minSpend) ? b.minSpend : null,
        maxDiscount: typeof b.maxDiscount === 'number' && Number.isFinite(b.maxDiscount) ? b.maxDiscount : null,
        minTier: Array.isArray(b.minTier) ? b.minTier.map(String) : null,
        active: typeof b.active === 'boolean' ? b.active : true,
      };
      const promo = await adminStore.createPromotion(input, req.user!.id);
      res.status(201).json({ success: true, data: promo });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to create promotion', message: err?.message });
    }
  });

  app.patch('/api/admin/promotions/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const b = (req.body || {}) as Record<string, unknown>;
      if (Object.keys(b).length === 0) {
        res.status(400).json({ error: 'no fields to update' });
        return;
      }
      if ((b.startsAt !== undefined && !isValidDay(b.startsAt)) || (b.endsAt !== undefined && !isValidDay(b.endsAt))) {
        res.status(400).json({ error: 'startsAt and endsAt must be YYYY-MM-DD dates' });
        return;
      }
      const patch: Partial<PromotionInput> = {};
      if (b.code !== undefined) patch.code = String(b.code).trim();
      if (b.title !== undefined) patch.title = String(b.title).trim();
      if (b.description !== undefined) patch.description = String(b.description);
      if (b.promoType !== undefined) patch.promoType = String(b.promoType).trim();
      if (b.eligibleCategories !== undefined) {
        patch.eligibleCategories = Array.isArray(b.eligibleCategories) ? b.eligibleCategories.map(String) : [];
      }
      if (b.eligibleSkus !== undefined) {
        patch.eligibleSkus = Array.isArray(b.eligibleSkus) ? b.eligibleSkus.map(String) : null;
      }
      if (b.startsAt !== undefined) patch.startsAt = String(b.startsAt).trim();
      if (b.endsAt !== undefined) patch.endsAt = String(b.endsAt).trim();
      if (b.minSpend !== undefined) patch.minSpend = typeof b.minSpend === 'number' ? b.minSpend : null;
      if (b.maxDiscount !== undefined) patch.maxDiscount = typeof b.maxDiscount === 'number' ? b.maxDiscount : null;
      if (b.minTier !== undefined) patch.minTier = Array.isArray(b.minTier) ? b.minTier.map(String) : null;
      if (b.active !== undefined) patch.active = Boolean(b.active);
      const updated = await adminStore.updatePromotion(String(req.params.id), patch);
      if (!updated) {
        res.status(404).json({ error: 'Promotion not found' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to update promotion', message: err?.message });
    }
  });

  app.delete('/api/admin/promotions/:id', requireAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await adminStore.deletePromotion(String(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: 'Promotion not found' });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to delete promotion', message: err?.message });
    }
  });

  // ---- tickets ----
  app.get('/api/admin/tickets', requireAdmin, async (req: Request, res: Response) => {
    try {
      const q = req.query.status;
      const status: TicketStatus | undefined =
        typeof q === 'string' && ['open', 'answered', 'closed'].includes(q) ? (q as TicketStatus) : undefined;
      const [tickets, users] = await Promise.all([adminStore.listTickets(status), adminStore.listUsers()]);
      const byId = new Map(users.map(u => [u.id, u]));
      const data = tickets.map(t => ({
        ...t,
        staffName: byId.get(t.staffId)?.name ?? null,
        staffBranch: byId.get(t.staffId)?.branch ?? null,
      }));
      res.json({ data, total: data.length });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to list tickets', message: err?.message });
    }
  });

  app.post('/api/admin/tickets/:id/answer', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { answer } = (req.body || {}) as { answer?: unknown };
      if (typeof answer !== 'string' || !answer.trim()) {
        res.status(400).json({ error: 'answer is required' });
        return;
      }
      const updated = await adminStore.answerTicket(String(req.params.id), answer.trim(), req.user!.id);
      if (!updated) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to answer ticket', message: err?.message });
    }
  });

  app.post('/api/admin/tickets/:id/close', requireAdmin, async (req: Request, res: Response) => {
    try {
      const updated = await adminStore.closeTicket(String(req.params.id));
      if (!updated) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'failed to close ticket', message: err?.message });
    }
  });
}
