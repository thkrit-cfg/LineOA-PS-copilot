import { CustomerProfile } from '../types';

/**
 * Sprint 2 — Intent detection + next-best-action.
 * Sprint 12 — reweighting: multi-word phrases outrank single words, a bare
 * `?` can no longer win on its own, and order-tracking phrases outrank the
 * generic 'where'/'when' question words. New retail intents: availability,
 * delivery, price.
 *
 * Pure keyword/regex rules (EN + TH), no API key required.
 * Classifies the customer's last message and derives a next-best-action
 * (NBA) from intent + CRM state (segment, tier, daysSinceLastPurchase, LTV).
 */

export type Intent =
  | 'order_status'
  | 'complaint'
  | 'restock'
  | 'availability'
  | 'delivery'
  | 'price'
  | 'question'
  | 'greeting'
  | 'other';

export interface IntentResult {
  intent: Intent;
  label: string;
  confidence: number; // 0–100 heuristic
  matched: string[]; // keywords that fired
}

export interface NextBestAction {
  label: string;
  tone: 'urgent' | 'opportunity' | 'standard';
}

export const INTENT_LABEL: Record<Intent, string> = {
  order_status: 'Order status',
  complaint: 'Complaint',
  restock: 'Restock',
  availability: 'Availability',
  delivery: 'Delivery',
  price: 'Price',
  question: 'Question',
  greeting: 'Greeting',
  other: 'Other',
};

// Keyword sets (lowercase). Thai entries are matched against a
// whitespace-stripped copy of the text so "ของ หมด" still hits "ของหมด".
const KEYWORDS: Record<Exclude<Intent, 'other'>, string[]> = {
  complaint: [
    // EN
    'complaint', 'damaged', 'expired', 'spoiled', 'not fresh', 'bad taste',
    'wrong item', 'wrong order', 'missing item', 'short', 'disappointed',
    'refund', 'return', 'problem with', 'issue with', 'sorry', 'unacceptable',
    // TH
    'ไม่พอใจ', 'เสียหาย', 'หมดอายุ', 'บ่', 'หืน', 'ไม่สด', 'ของผิด',
    'สั่งผิด', 'ขอคืน', 'คืนเงิน', 'ร้องเรียน', 'ไม่อร่อย', 'ขาด', 'บ่น',
  ],
  order_status: [
    // EN — multi-word tracking phrases first (they outrank single words)
    'where is my', 'has it arrived', 'arrived yet', 'when will it arrive',
    'order status', 'order number', 'cancel my order', 'track', 'tracking',
    'shipped', 'delivered', 'delivery', 'ship',
    // TH
    'ติดตาม', 'จัดส่ง', 'ส่งของ', 'ของถึง', 'ถึงแล้ว', 'ยังไม่ถึง', 'รึยัง',
    'สถานะ', 'ยกเลิก', 'ออเดอร์', 'ออเดอร์ถึง', 'พัสดุ',
  ],
  restock: [
    // EN
    'restock', 'out of stock', 'back in stock', 'no more', 'ran out',
    'reorder', 'order again', 'same as last time', 'buy again', 'need more',
    // TH
    'ของหมด', 'หมดแล้ว', 'สั่งซ้ำ', 'สั่งเหมือนเดิม', 'ซื้อซ้ำ',
    'ของมาไหม', 'เข้าใหม่', 'เติม', 'มีของอีกไหม',
  ],
  availability: [
    // EN
    'do you have', 'got any', 'have any', 'in stock', 'available',
    // TH
    'มีไหม', 'มีของไหม', 'มีของไหมคะ', 'มีขายไหม', 'มีเหลือไหม',
  ],
  delivery: [
    // EN
    'deliver', 'delivery', 'deliver this', 'deliver today', 'deliver afternoon',
    'deliver morning', 'can you deliver', 'how long', 'how fast',
    'delivery fee', 'delivery time',
    // TH
    'ส่งไหม', 'ส่งได้ไหม', 'ส่งวันนี้', 'ส่งบ่าย', 'ส่งเช้า', 'กี่โมงถึง',
    'กี่โมงได้', 'ส่งถึง', 'ค่าส่ง',
  ],
  price: [
    // EN
    'price', 'how much', 'cost', 'price for',
    // TH
    'เท่าไหร่', 'เท่าไร', 'ราคา', 'กี่บาท',
  ],
  question: [
    // EN
    'how', 'what', 'when', 'where', 'why', 'can i', 'could you',
    'promo', 'discount', 'voucher', 'open', 'hours', 'location',
    'payment', 'accept',
    // TH
    'โปรโมชั่น', 'โปร', 'ส่วนลด', 'คูปอง',
    'เปิดกี่โมง', 'ปิดกี่โมง', 'อยู่ที่ไหน', 'รับชำระ', 'อย่างไร', 'ทำยังไง',
  ],
  greeting: [
    // EN
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'thank you', 'thanks', 'nice to meet',
    // TH
    'สวัสดี', 'สวัสดีค่ะ', 'สวัสดีครับ', 'ฮัลโหล', 'ขอบคุณ', 'ขอบคุณมาก',
    'ยินดี', 'ราตรีสวัสดิ์',
  ],
};

const QUESTION_MARKS = ['?', '؟'];

/** Normalize text for keyword matching: lowercase + strip whitespace (helps Thai). */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

export function classifyIntent(text: string): IntentResult {
  const raw = (text || '').trim();
  if (!raw) return { intent: 'other', label: INTENT_LABEL.other, confidence: 0, matched: [] };

  const norm = normalize(raw);
  const hasQuestionMark = QUESTION_MARKS.some(q => raw.includes(q));

  let best: Intent = 'other';
  let bestScore = 0;
  let bestMatched: string[] = [];

  for (const intent of Object.keys(KEYWORDS) as Array<Exclude<Intent, 'other'>>) {
    const matched = KEYWORDS[intent].filter(k => norm.includes(normalize(k)));
    if (matched.length === 0) continue;
    // Multi-word phrases are stronger signals than single words.
    let score = 0;
    for (const k of matched) score += k.includes(' ') ? 3 : 1;
    // A question mark supports "question" — but it can NEVER win on its own.
    // At least one real keyword must fire for question to be a candidate.
    if (intent === 'question' && hasQuestionMark) score += 1;
    if (score > bestScore) {
      best = intent;
      bestScore = score;
      bestMatched = matched;
    }
  }

  // Greeting-only messages (e.g. "สวัสดีค่ะ") should not be buried under a
  // single coincidental keyword — require 2+ hits unless it's the only hit.
  if (best === 'greeting' && bestScore === 1) {
    const others = (Object.keys(KEYWORDS) as Array<Exclude<Intent, 'other'>>)
      .filter(i => i !== 'greeting')
      .some(i => KEYWORDS[i].some(k => norm.includes(normalize(k))));
    if (others) best = 'other';
  }

  const confidence = best === 'other' ? 40 : Math.min(95, 55 + bestScore * 10);
  return { intent: best, label: INTENT_LABEL[best], confidence, matched: bestMatched };
}

/**
 * Next-best-action from intent + CRM state.
 * Priority: complaint > at-risk win-back > intent-specific > default.
 */
export function nextBestAction(
  intent: Intent,
  customer: CustomerProfile | null
): NextBestAction {
  if (!customer) {
    return { label: 'Identify customer & link CRM', tone: 'standard' };
  }

  if (intent === 'complaint') {
    return { label: 'Apologize + escalate to store manager', tone: 'urgent' };
  }

  const atRisk = customer.rfmSegment === 'At Risk' || customer.rfmSegment === 'Need Attention';
  if (atRisk && customer.daysSinceLastPurchase > 21) {
    return {
      label: `Win-back: 15% off ${customer.topCategories[0] || 'favourite category'}`,
      tone: 'opportunity',
    };
  }

  switch (intent) {
    case 'restock':
      return {
        label: customer.rfmSegment === 'Champions'
          ? 'Quick re-order + 5X The 1 points'
          : 'Quick re-order + replenishment recs',
        tone: 'opportunity',
      };
    case 'order_status':
      return { label: 'Check order status & share tracking', tone: 'standard' };
    case 'availability':
      return { label: 'Confirm stock + offer to take the order', tone: 'opportunity' };
    case 'delivery':
      return { label: 'Confirm delivery window + take the order', tone: 'opportunity' };
    case 'price':
      return { label: 'Quote price + attach relevant promo', tone: 'standard' };
    case 'greeting':
      return customer.rfmSegment === 'Champions'
        ? { label: 'Greet + push 5X points offer', tone: 'opportunity' }
        : { label: 'Greet + push top recommendation', tone: 'opportunity' };
    case 'question':
      return { label: 'Answer + attach relevant promo', tone: 'standard' };
    default:
      return { label: 'Acknowledge & ask a clarifying question', tone: 'standard' };
  }
}
