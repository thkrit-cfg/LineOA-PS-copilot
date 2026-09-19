export type Channel = 'LINE_OA' | 'IN_STORE_POS' | 'TOPS_ONLINE_APP' | 'GRAB_MART' | 'CALL_AND_DELIVER';

export type CustomerTier = 'MEMBER' | 'SILVER' | 'GOLD' | 'PLATINUM_VIP';

export type PromoType = 
  | 'INSTANT_CASH_VOUCHER'
  | 'ONE_GET_ONE_FREE'
  | 'THE_1_POINTS_X5'
  | 'FREE_EXPRESS_DELIVERY'
  | 'BUNDLE_CROSS_SELL'
  | 'CATEGORY_DISCOUNT_15PCT';

export interface PurchaseItem {
  sku: string;
  nameEn: string;
  nameTh: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Transaction {
  orderId: string;
  date: string;
  channel: Channel;
  branch: string;
  totalAmount: number;
  items: PurchaseItem[];
  paymentMethod: string;
}

export interface CustomerProfile {
  crmCustomerId: string; // e.g. T1-892401
  the1CardNo: string;
  fullName: string;
  phone: string;
  email: string;
  tier: CustomerTier;
  preferredBranch: string;
  lineUid: string | null; // e.g. U7c89f0123... or null if unmapped
  lineDisplayName?: string;
  lineAvatarUrl?: string;
  isLineFriend: boolean;
  pdpaConsent: boolean;
  pdpaConsentDate?: string;
  rfmSegment: 'Champions' | 'Loyal Shoppers' | 'Potential Loyalist' | 'At Risk' | 'Need Attention' | 'New Follower';
  totalSpendLtv: number;
  orderCount: number;
  aov: number; // Average Order Value
  lastPurchaseDate: string;
  daysSinceLastPurchase: number;
  topCategories: string[];
  dietaryPreferences: string[]; // e.g. 'Organic', 'Halal', 'Import Gourmet', 'Baby Care'
  preferredPromoType: PromoType;
  transactions: Transaction[];
  staffNotes?: string;
}

export interface GroceryProduct {
  sku: string;
  nameEn: string;
  nameTh: string;
  category: string;
  subCategory: string;
  price: number;
  originalPrice?: number;
  image: string;
  inStock: boolean;
  unit: string;
  isPromo: boolean;
  promoTag?: string;
  shelfLifeDays: number;
}

export interface UpsellRecommendation {
  product: GroceryProduct;
  reason: string;
  reasonTh: string;
  confidenceScore: number;
  type: 'CROSS_SELL' | 'REPLENISHMENT' | 'PREMIUM_UPGRADE' | 'SEASONAL';
  suggestedPromo: string;
}

export interface ActivePromotion {
  id: string;
  code: string; // e.g. FRESH15
  title: string; // e.g. "15% Off Organic Vegetables"
  description: string; // one-line detail staff can share
  promoType: PromoType;
  eligibleCategories: string[]; // product categories this applies to
  eligibleSkus?: string[]; // if set, only these SKUs (else all eligible categories)
  startsAt: string; // ISO date
  endsAt: string; // ISO date
  minSpend?: number; // baht
  maxDiscount?: number; // baht cap
  minTier?: CustomerTier[]; // if set, only these tiers (else all)
  active: boolean;
}

export interface SegmentRule {
  id: string;
  name: string;
  description: string;
  targetCategory?: string;
  minSpend?: number;
  maxInactivityDays?: number;
  minInactivityDays?: number;
  tier?: CustomerTier[];
  onlyUnmappedLine?: boolean;
  branch?: string;
  triggerEvent: string;
  automatedPushEnabled: boolean;
  pushTemplate: {
    titleEn: string;
    titleTh: string;
    bodyEn: string;
    bodyTh: string;
    promoCode: string;
    discountValue: string;
    ctaText: string;
    flexColor: string;
  };
}

export interface PushMessageLog {
  id: string;
  timestamp: string;
  customerLineUid: string;
  customerName: string;
  crmId: string;
  campaignTitle: string;
  messageType: 'FLEX_MESSAGE' | 'COUPON_CARD' | 'STAFF_RECOMMENDATION';
  payload: any;
  status: 'DELIVERED' | 'READ' | 'CLICKED';
}

export interface LineStaffUser {
  staffId: string;
  name: string;
  role: 'Store Staff' | 'Produce Specialist' | 'Store Manager' | 'Operations Director';
  branch: string;
  avatar: string;
}
