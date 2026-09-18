/**
 * Sprint 3 — Value-priority inbox scoring.
 *
 * Pure function shared by the server (enriches /api/inbox/threads) and the
 * client (re-sorts + badges). No API key, no I/O.
 *
 * Priority (0–100) = LTV weight (0–40) + risk weight (0–30) + recency (0–30).
 * A dormant high-LTV / at-risk customer outranks a recent low-value thread.
 */

export interface PriorityInput {
  ltv?: number;
  segment?: string;
  tier?: string;
  lastTs: number;
  now?: number;
}

export interface PriorityResult {
  priority: number;
  flags: Array<'high_value' | 'at_risk'>;
}

const RISKY_SEGMENTS = new Set(['At Risk', 'Need Attention']);

export function computeThreadPriority(input: PriorityInput): PriorityResult {
  const now = input.now ?? Date.now();

  // LTV weight: ฿1,500 of LTV ≈ 1 point, capped at 40.
  const ltvScore = input.ltv ? Math.min(40, Math.round(input.ltv / 1500)) : 0;

  // Risk weight: churn-risk segments are urgent to re-engage.
  const riskScore = input.segment && RISKY_SEGMENTS.has(input.segment) ? 30 : 0;

  // Recency: how fresh the conversation is (ms → day buckets).
  const ageDays = input.lastTs > 0 ? (now - input.lastTs) / 86_400_000 : Infinity;
  const recencyScore =
    ageDays <= 7 ? 30 : ageDays <= 14 ? 20 : ageDays <= 30 ? 10 : 5;

  const flags: PriorityResult['flags'] = [];
  if ((input.ltv !== undefined && input.ltv >= 30000) || input.tier === 'PLATINUM_VIP' || input.tier === 'GOLD') {
    flags.push('high_value');
  }
  if (input.segment && RISKY_SEGMENTS.has(input.segment)) {
    flags.push('at_risk');
  }

  return { priority: ltvScore + riskScore + recencyScore, flags };
}
