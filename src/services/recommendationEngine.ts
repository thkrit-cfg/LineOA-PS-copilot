import { CustomerProfile, GroceryProduct, UpsellRecommendation } from '../types';
import { INITIAL_PRODUCTS } from '../data/mockGroceryDataLake';

export function getPersonalizedRecommendations(customer: CustomerProfile): UpsellRecommendation[] {
  const recommendations: UpsellRecommendation[] = [];
  const boughtCategories = new Set(customer.topCategories);
  const allProducts = INITIAL_PRODUCTS;

  // 1. Cross-sell pairing logic based on previous baskets
  if (boughtCategories.has('Butcher & Seafood')) {
    // If they like beef/salmon, recommend Japanese pairing sauce or premium cooking oil
    const sauce = allProducts.find(p => p.sku === 'SKU-SAUCE-012');
    if (sauce) {
      recommendations.push({
        product: sauce,
        type: 'CROSS_SELL',
        reason: 'Pairs with recent Beef & Salmon orders. Customers who buy Australian Ribeye frequently add Kikkoman Sukiyaki marinade.',
        reasonTh: 'จับคู่เนื้อวัวและแซลมอน: ลูกค้าที่ซื้อริบอาย มักซื้อซอสสุกี้ยากี้คิคโคแมนคู่กันเพื่อปรุงอาหารที่บ้าน',
        confidenceScore: 94,
        suggestedPromo: 'Bundle Deal: Buy 2 Meat cuts get 20% off Japanese Sauce',
      });
    }

    const riceOil = allProducts.find(p => p.sku === 'SKU-OIL-009');
    if (riceOil) {
      recommendations.push({
        product: riceOil,
        type: 'CROSS_SELL',
        reason: 'High smoke-point cooking oil recommended for searing steaks without bitter burning.',
        reasonTh: 'น้ำมันรำข้าวทนความร้อนสูง เหมาะสำหรับย่างสเต็กเนื้อแองกัสโดยไม่เกิดควันไหม้',
        confidenceScore: 88,
        suggestedPromo: 'Special Price: ฿72 when purchased with fresh beef',
      });
    }
  }

  // 2. Fresh Produce & Healthy Living cross-sell
  if (boughtCategories.has('Fresh Produce') || customer.dietaryPreferences.includes('Organic')) {
    const grapes = allProducts.find(p => p.sku === 'SKU-IMPORT-008');
    if (grapes && customer.aov > 1200) {
      recommendations.push({
        product: grapes,
        type: 'PREMIUM_UPGRADE',
        reason: 'Premium seasonal fruit upgrade: Direct-import Japanese Shine Muscat grapes matching high AOV basket.',
        reasonTh: 'ผลไม้นำเข้าคัดพิเศษ: องุ่นไชน์มัสคัสหวานกรอบไร้เมล็ด ตอบโจทย์ลูกค้าระดับพรีเมียม',
        confidenceScore: 91,
        suggestedPromo: 'Tops Club Member: Special ฿690 (Regular ฿790)',
      });
    }
    
    const salmon = allProducts.find(p => p.sku === 'SKU-SEAFOOD-010');
    if (salmon && !customer.transactions.some(t => t.items.some(i => i.sku === 'SKU-SEAFOOD-010'))) {
      recommendations.push({
        product: salmon,
        type: 'CROSS_SELL',
        reason: 'Clean protein pairing with Royal Project organic greens for a balanced healthy salad bowl.',
        reasonTh: 'โปรตีนเพื่อสุขภาพ: เนื้อแซลมอนสดนอร์เวย์ ทานคู่กับผักสลัดออร์แกนิกโครงการหลวง',
        confidenceScore: 85,
        suggestedPromo: 'Fresh Combo: Save ฿50 when buying Salad + Salmon',
      });
    }
  }

  // 3. Replenishment alert based on purchase cadence
  if (boughtCategories.has('Dairy & Eggs') || customer.daysSinceLastPurchase >= 7) {
    const milk = allProducts.find(p => p.sku === 'SKU-DAIRY-004');
    const eggs = allProducts.find(p => p.sku === 'SKU-DAIRY-005');

    if (milk) {
      recommendations.push({
        product: milk,
        type: 'REPLENISHMENT',
        reason: `Replenishment Cycle Alert: Customer last bought milk ${customer.daysSinceLastPurchase} days ago. Average household dairy consumption is 5-7 days.`,
        reasonTh: `เตือนเสบียงหมดรอบสัปดาห์: ซื้อนมสดครั้งล่าสุดเมื่อ ${customer.daysSinceLastPurchase} วันที่แล้ว รอบบริโภคเฉลี่ยควรเติมใหม่`,
        confidenceScore: 96,
        suggestedPromo: 'Buy 2 bottles get 15 The 1 Extra Points',
      });
    }

    if (eggs) {
      recommendations.push({
        product: eggs,
        type: 'REPLENISHMENT',
        reason: 'Essential staple replenishment: Organic eggs consumption predicted depleted.',
        reasonTh: 'เติมไข่ไก่ออร์แกนิก ซีพี สดใหม่ สำหรับมื้อเช้าครอบครัว',
        confidenceScore: 89,
        suggestedPromo: 'Bundle with Rice for Extra ฿20 Discount Voucher',
      });
    }
  }

  // Fallback if empty
  if (recommendations.length === 0) {
    INITIAL_PRODUCTS.slice(0, 3).forEach(prod => {
      recommendations.push({
        product: prod,
        type: 'CROSS_SELL',
        reason: 'Top trending grocery item across Bangkok branches this week.',
        reasonTh: 'สินค้ายอดนิยมประจำสัปดาห์ที่ลูกค้าท็อปส์เลือกซื้อมากที่สุด',
        confidenceScore: 75,
        suggestedPromo: 'Special Tops Club Offer',
      });
    });
  }

  return recommendations;
}

export function generateStaffConversationScript(customer: CustomerProfile): { en: string; th: string } {
  if (customer.rfmSegment === 'Champions') {
    return {
      th: `สวัสดีครับคุณ${customer.fullName.split(' ')[0]}! วันนี้มีเนื้อริบอายแองกัสและแซลมอนนอร์เวย์เข้าใหม่สดๆ ที่ท็อปส์ ฟู้ดฮอลล์ สามารถสะสม The 1 คะแนน x5 ผ่าน LINE ได้เลยครับ`,
      en: `Good day Khun ${customer.fullName.split(' ')[0]}! We have freshly arrived Australian Ribeye and Norwegian Salmon today. You can also claim your 5X The 1 points directly on LINE OA!`,
    };
  }

  if (customer.rfmSegment === 'At Risk') {
    return {
      th: `สวัสดีครับคุณ${customer.fullName.split(' ')[0]}! ท็อปส์คิดถึงคุณนะคร้าบ วันนี้เราเตรียมคูปองส่วนลด 15% สำหรับผักโครงการหลวงสดใหม่ไว้ใน LINE กดรับได้ทันทีเลยครับ`,
      en: `Welcome back Khun ${customer.fullName.split(' ')[0]}! We missed you! We have loaded an exclusive 15% Royal Project organic produce coupon on your LINE OA account for your visit today.`,
    };
  }

  if (!customer.lineUid) {
    return {
      th: `สวัสดีครับคุณ${customer.fullName.split(' ')[0]}! บัตร The 1 ของคุณยังไม่ได้ผูกกับ LINE Tops เพียงสแกน QR นี้ 15 วินาที รับฟรีทันทีคูปองเงินสด 100 บาท ใช้ชำระบิลนี้ได้เลยครับ!`,
      en: `Hello Khun ${customer.fullName.split(' ')[0]}! Your The 1 card is not yet linked to our LINE OA. Scan this QR in 15 seconds to receive an instant ฿100 cash voucher on your current basket!`,
    };
  }

  return {
    th: `สวัสดีครับคุณ${customer.fullName.split(' ')[0]}! วันนี้มีโปรโมชั่นพิเศษสำหรับสมาชิก ${customer.tier} ตรวจสอบคูปองพิเศษใน LINE Tops ได้เลยครับ`,
    en: `Hello Khun ${customer.fullName.split(' ')[0]}! We have special member benefits for ${customer.tier} tier on our LINE OA today!`,
  };
}
