import { CustomerProfile } from '../types';

/**
 * Sprint 4 — Revenue attribution.
 *
 * Per-customer value summary computed from the data lake (customer
 * transactions + CRM LTV). Pure function, no API key, no I/O.
 */

export interface CustomerValue {
  /** Lifetime value from CRM (all channels, all time). */
  totalLtv: number;
  /** Value of the most recent order. */
  lastOrderValue: number;
  /** Date of the most recent order (ISO string). */
  lastOrderDate: string;
  /** Sum of order values in the last 30 days (from transaction dates). */
  value30d: number;
  /** Number of orders in the last 30 days. */
  orders30d: number;
  /**
   * Estimated "conversation value": what this thread is worth to protect.
   * Blends LTV share, recency of purchase, and 30d momentum.
   */
  conversationValue: number;
}

const DAY_MS = 86_400_000;

function parseDate(s: string): number {
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

export function computeCustomerValue(
  customer: CustomerProfile,
  now: number = Date.now()
): CustomerValue {
  const txs = [...customer.transactions].sort(
    (a, b) => parseDate(b.date) - parseDate(a.date)
  );
  const last = txs[0];

  const lastOrderValue = last ? last.totalAmount : 0;
  const lastOrderDate = last ? last.date : '';

  const cutoff = now - 30 * DAY_MS;
  const recent = txs.filter(t => {
    const ts = parseDate(t.date);
    return ts > 0 && ts >= cutoff;
  });
  const value30d = recent.reduce((s, t) => s + t.totalAmount, 0);

  // Conversation value: LTV base, damped by purchase recency, boosted by
  // recent momentum. Range roughly 0–100k THB for the mock data.
  const recencyFactor =
    customer.daysSinceLastPurchase <= 7
      ? 1
      : customer.daysSinceLastPurchase <= 21
        ? 0.75
        : customer.daysSinceLastPurchase <= 45
          ? 0.5
          : 0.3;
  const momentum = value30d > 0 ? Math.min(1.2, 1 + value30d / 5000) : 1;
  const conversationValue = Math.round(customer.totalSpendLtv * recencyFactor * momentum);

  return {
    totalLtv: customer.totalSpendLtv,
    lastOrderValue,
    lastOrderDate,
    value30d,
    orders30d: recent.length,
    conversationValue,
  };
}
