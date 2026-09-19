/**
 * Sprint 11 — Admin Portal API client.
 *
 * Typed fetch helpers + response types mirroring server/adminApi.ts and
 * server/adminStore.ts EXACTLY (cookie `tops_session` is sent via
 * credentials: 'same-origin').
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) message = j.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- types (mirror server/adminStore.ts + server/auth.ts) ---------------------

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  branch: string;
  isAdmin: boolean;
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

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  promoType: string;
  eligibleCategories: string[];
  eligibleSkus: string[] | null;
  /** 'YYYY-MM-DD' */
  startsAt: string;
  /** 'YYYY-MM-DD' — live through the end of this day */
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
  /** 'YYYY-MM-DD' */
  startsAt: string;
  /** 'YYYY-MM-DD' */
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

/** Ticket as returned by GET /api/admin/tickets (staff name joined). */
export interface TicketWithStaff extends Ticket {
  staffName: string | null;
  staffBranch: string | null;
}

// ---- typed endpoint wrappers (see server/adminApi.ts) --------------------------

export const adminApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: User }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<{ success: boolean }>('/api/admin/logout', { method: 'POST' }),
  me: () => apiFetch<{ user: User }>('/api/admin/me'),
  metrics: () => apiFetch<AdminMetrics>('/api/admin/metrics'),

  listPromotions: () => apiFetch<{ data: Promotion[]; total: number }>('/api/admin/promotions'),
  createPromotion: (input: PromotionInput) =>
    apiFetch<{ success: boolean; data: Promotion }>('/api/admin/promotions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  patchPromotion: (id: string, patch: Partial<PromotionInput>) =>
    apiFetch<{ success: boolean; data: Promotion }>(`/api/admin/promotions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deletePromotion: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/admin/promotions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listTickets: (status?: TicketStatus) =>
    apiFetch<{ data: TicketWithStaff[]; total: number }>(
      `/api/admin/tickets${status ? `?status=${status}` : ''}`
    ),
  answerTicket: (id: string, answer: string) =>
    apiFetch<{ success: boolean; data: Ticket }>(`/api/admin/tickets/${encodeURIComponent(id)}/answer`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),
  closeTicket: (id: string) =>
    apiFetch<{ success: boolean; data: Ticket }>(`/api/admin/tickets/${encodeURIComponent(id)}/close`, {
      method: 'POST',
    }),
};
