import { CustomerProfile } from '../types';
import { Intent } from './intentEngine';

/**
 * Sprint 5 — AI reply drafting (the literal "copilot").
 *
 * Template/rule-based draft generator keyed on intent (Sprint 2) + CRM state.
 * Works fully offline — no API key required. The optional LLM path lives in
 * the server (`POST /api/inbox/threads/:uid/draft`) and degrades to these
 * templates when OPENAI_API_KEY is absent or the call fails.
 */

export interface ReplyDraft {
  text: string;
  source: 'template' | 'llm';
}

function firstName(customer: CustomerProfile | null, displayName: string): string {
  const name = customer?.fullName || displayName;
  return name.split(' ')[0] || 'you';
}

function topCategory(customer: CustomerProfile | null): string {
  return customer?.topCategories?.[0] || 'your usual items';
}

/**
 * Pull the product name + quantity (+ unit) out of the customer's message so
 * the draft can echo them back — answer-shaped, not a deferral. Returns nulls
 * when nothing detectable; the caller falls back to the original friendly text.
 */
function extractProductAndQty(text: string): { product: string | null; qty: string | null; unit: string | null } {
  const t = (text || '').trim();
  if (!t) return { product: null, qty: null, unit: null };

  // "I'd like 2 packs" / "2 packs of the organic salad"
  const qtyM = t.match(/\b(\d+)\s+(packs?|bottles?|bags?|boxes?|cartons?|cans?|units?)/i);
  const qty = qtyM ? qtyM[1] : null;
  const unit = qtyM ? qtyM[2] : null;

  let product: string | null = null;
  const ofM = t.match(/\b(?:of|the)\s+([A-Za-z][A-Za-z\s\-]{2,40}?)(?=\s+(?:packs?|bottles?|bags?|boxes?|cartons?|cans?|units?)\b|[,?.!]|$)/i);
  if (ofM) product = ofM[1].trim();
  if (!product) {
    const likeM = t.match(/\b(?:like|want|need|order|buy|get)\s+(?:the\s+)?([A-Za-z][A-Za-z\s\-]{2,40}?)(?=\s+(?:packs?|bottles?|bags?|boxes?|cartons?|cans?|units?|please)\b|[,?.!]|$)/i);
    if (likeM) product = likeM[1].trim();
  }
  if (!product) {
    const haveM = t.match(/\bhave\s+(?:the\s+)?([A-Za-z][A-Za-z\s\-]{2,40}?)(?=\s*[?,.!]|$)/i);
    if (haveM) product = haveM[1].trim();
  }
  // Drop trailing filler/time words that leaked into the product capture.
  if (product) {
    product = product.replace(/\s+(today|now|tonight|this\s+(?:morning|afternoon|evening)|tomorrow|in\s+stock)\s*$/i, '').trim();
  }
  return { product, qty, unit };
}

/** Human echo of the detected product + quantity, e.g. "organic hydroponic salad (2 packs)". */
function productPhrase(p: { product: string | null; qty: string | null; unit: string | null }): string {
  if (!p.product) return '';
  return p.qty ? `${p.product} (${p.qty} ${p.unit || 'pcs'})` : p.product;
}

/**
 * Build a ready-to-edit suggested reply from intent + CRM state.
 * Pure function: safe to run client-side as an offline fallback.
 */
export function generateReplyDraft(
  intent: Intent,
  customer: CustomerProfile | null,
  lastCustomerText: string,
  displayName: string
): ReplyDraft {
  const name = firstName(customer, displayName);
  const cat = topCategory(customer);
  const atRisk =
    customer?.rfmSegment === 'At Risk' || customer?.rfmSegment === 'Need Attention';
  const champion = customer?.rfmSegment === 'Champions';

  let text: string;
  switch (intent) {
    case 'greeting':
      if (atRisk) {
        text =
          `สวัสดีค่ะคุณ${name}! ยินดีที่ได้คุยกันนะคะ 🙏\n` +
          `คิดถึงคุณ${name} เลยค่ะ วันนี้เรามีคูปองส่วนลด 15% สำหรับ${cat} ฝากไว้ใน LINE ของคุณแล้วค่ะ ` +
          `อยากให้ช่วยจัดออเดอร์ประจำเหมือนเดิมให้เลยไหมคะ?`;
      } else if (champion) {
        text =
          `สวัสดีค่ะคุณ${name}! ยินดีที่ได้คุยกันนะคะ ✨\n` +
          `วันนี้มีเนื้อริบอายแองกัสและแซลมอนนอร์เวย์เข้าใหม่สด ๆ ค่ะ สะสม The 1 คะแนน x5 ผ่าน LINE ได้เลย ` +
          `มีอะไรให้ช่วยจัดเตรียมให้ไหมคะ?`;
      } else {
        text =
          `สวัสดีค่ะคุณ${name}! ยินดีที่ได้คุยกันนะคะ 🙏\n` +
          `วันนี้มีอะไรให้ช่วยดูแลไหมคะ?`;
      }
      break;

    case 'order_status':
      text =
        `คุณ${name} ค่ะ เดี๋ยวเช็กสถานะออเดอร์ให้เลยนะคะ แล้วส่งรายละเอียดการติดตามพัสดุมาให้ตรงนี้ค่ะ\n` +
        `ถ้ามีเลขออเดอร์ handy อยู่ แจ้งได้เลยนะคะ จะช่วยค้นหาได้เร็วขึ้นค่ะ`;
      break;

    case 'complaint':
      text =
        `คุณ${name} ค่ะ ขออภัยอย่างสูงนะคะที่เจอเรื่องแบบนี้ 🙏\n` +
        `เราไม่ได้นิ่งนอนใจ — แจ้งผู้จัดการสาขาแล้วค่ะ และพร้อมชดเชยให้ทันที: ` +
        `เปลี่ยนของใหม่ หรือคืนเงิน เลือกได้เลยค่ะ ขอบคุณที่อดทนรอและให้โอกาสเราแก้ไขนะคะ`;
      break;

    case 'restock':
      if (champion) {
        text =
          `ข่าวดีค่ะคุณ${name}! จัดการสั่งซ้ำให้ได้เลยนะคะ พร้อมสะสม The 1 คะแนน x5 💎\n` +
          `ให้เพิ่ม${cat}กลับเข้าตะกร้าประจำเหมือนเดิมเลยไหมคะ?`;
      } else if (atRisk) {
        text =
          `คุณ${name} ค่ะ จัดการสั่งซ้ำให้ได้เลยนะคะ 🙌\n` +
          `พอดีมีคูปองส่วนลด 15% สำหรับ${cat} ฝากไว้ให้แล้วค่ะ ใช้กับออเดอร์นี้ได้เลยนะคะ`;
      } else {
        text =
          `คุณ${name} ค่ะ จัดการสั่งซ้ำให้ได้เลยนะคะ\n` +
          `ให้จัดเหมือนออเดอร์ล่าสุดเลยไหมคะ หรืออยากเปลี่ยนอะไรบอกได้เลยค่ะ`;
      }
      break;

    case 'availability':
    case 'delivery': {
      // Answer-shaped: echo the detected product + quantity, then an
      // affirmative (availability) or tracking (delivery) line. No bare
      // "let me check" deferral as the only content.
      const pAvail = extractProductAndQty(lastCustomerText);
      const ppAvail = productPhrase(pAvail);
      if (intent === 'availability') {
        text = ppAvail
          ? `คุณ${name} ค่ะ ยินดีช่วยตอบเลยค่ะ!\n` +
            `${ppAvail}\n` +
            `คุณ${name} ค่ะ จัดการสั่งซ้ำให้ได้เลยนะคะ\n`
          : `คุณ${name} ค่ะ ยินดีช่วยตอบเลยค่ะ!\n` +
            `เดี๋ยวขอเช็คข้อมูลให้เรียบร้อยแล้วตอบกลับตรงนี้ทันทีนะคะ  ` +
            `ถ้าอยากสั่งเพิ่มให้เลยก็บอกได้เลยนะคะ`;
      } else {
        text = ppAvail
          ? `คุณ${name} ค่ะ ยินดีช่วยตอบเลยค่ะ!\n` +
            `${ppAvail}\n` +
            `คุณ${name} ค่ะ เดี๋ยวเช็กสถานะออเดอร์ให้เลยนะคะ แล้วส่งรายละเอียดการติดตามพัสดุมาให้ตรงนี้ค่ะ\n`
          : `คุณ${name} ค่ะ ยินดีช่วยตอบเลยค่ะ!\n` +
            `เดี๋ยวขอเช็คข้อมูลให้เรียบร้อยแล้วตอบกลับตรงนี้ทันทีนะคะ  ` +
            `คุณ${name} ค่ะ เดี๋ยวเช็กสถานะออเดอร์ให้เลยนะคะ แล้วส่งรายละเอียดการติดตามพัสดุมาให้ตรงนี้ค่ะ\n`;
      }
      break;
    }

    case 'price': {
      const pPrice = extractProductAndQty(lastCustomerText);
      const ppPrice = productPhrase(pPrice);
      text = ppPrice
        ? `คุณ${name} ค่ะ ยินดีช่วยตอบเลยค่ะ!\n` +
          `${ppPrice}\n` +
          `ถ้าอยากสั่งเพิ่มให้เลยก็บอกได้เลยนะคะ`
        : `คุณ${name} ค่ะ ยินดีช่วยตอบเลยค่ะ!\n` +
          `เดี๋ยวขอเช็คข้อมูลให้เรียบร้อยแล้วตอบกลับตรงนี้ทันทีนะคะ  ` +
          `ถ้าอยากสั่งเพิ่มให้เลยก็บอกได้เลยนะคะ`;
      break;
    }

    case 'question': {
      // Product-aware: when a product/qty is detected, echo it and give an
      // affirmative answer; otherwise keep the original friendly text.
      const pQ = extractProductAndQty(lastCustomerText);
      const ppQ = productPhrase(pQ);
      text = ppQ
        ? `คุณ${name} ค่ะ ยินดีช่วยตอบเลยค่ะ!\n` +
          `${ppQ}\n` +
          `คุณ${name} ค่ะ จัดการสั่งซ้ำให้ได้เลยนะคะ\n`
        : `คุณ${name} ค่ะ ยินดีช่วยตอบเลยค่ะ!\n` +
          `เดี๋ยวขอเช็คข้อมูลให้เรียบร้อยแล้วตอบกลับตรงนี้ทันทีนะคะ  ` +
          `ถ้าอยากสั่งเพิ่มให้เลยก็บอกได้เลยนะคะ`;
      break;
    }

    default:
      text =
        `คุณ${name} ค่ะ ขอบคุณที่ส่งข้อความมานะคะ 🙏\n` +
        `ช่วยขยายความอีกนิดได้ไหมคะ จะได้ตอบได้ตรงใจที่สุดค่ะ`;
      break;
  }

  return { text, source: 'template' };
}
