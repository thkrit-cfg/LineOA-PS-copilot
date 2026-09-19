import * as XLSX from 'xlsx';
import { ActivePromotion, CustomerProfile, GroceryProduct, SegmentRule, PushMessageLog } from '../types';
import { ACTIVE_PROMOTIONS, INITIAL_CUSTOMERS, INITIAL_PRODUCTS, INITIAL_SEGMENT_RULES } from '../data/mockGroceryDataLake';

const STORAGE_KEYS = {
  CUSTOMERS: 'tops_line_datalake_customers',
  PRODUCTS: 'tops_line_datalake_products',
  SEGMENTS: 'tops_line_datalake_segments',
  PUSH_LOGS: 'tops_line_push_logs',
};

export class DataLakeService {
  private static customers: CustomerProfile[] = [];
  private static products: GroceryProduct[] = [];
  private static segments: SegmentRule[] = [];
  private static pushLogs: PushMessageLog[] = [];
  private static initialized = false;

  public static init() {
    if (this.initialized) return;

    try {
      const storedCust = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      this.customers = storedCust ? JSON.parse(storedCust) : INITIAL_CUSTOMERS;

      const storedProd = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      this.products = storedProd ? JSON.parse(storedProd) : INITIAL_PRODUCTS;

      const storedSeg = localStorage.getItem(STORAGE_KEYS.SEGMENTS);
      this.segments = storedSeg ? JSON.parse(storedSeg) : INITIAL_SEGMENT_RULES;

      const storedLogs = localStorage.getItem(STORAGE_KEYS.PUSH_LOGS);
      this.pushLogs = storedLogs ? JSON.parse(storedLogs) : [];
    } catch (e) {
      console.error('Error loading datalake from storage, using initial mock:', e);
      this.customers = INITIAL_CUSTOMERS;
      this.products = INITIAL_PRODUCTS;
      this.segments = INITIAL_SEGMENT_RULES;
      this.pushLogs = [];
    }

    this.initialized = true;
  }

  public static getCustomers(): CustomerProfile[] {
    this.init();
    return [...this.customers];
  }

  public static getProducts(): GroceryProduct[] {
    this.init();
    return [...this.products];
  }

  public static getSegments(): SegmentRule[] {
    this.init();
    return [...this.segments];
  }

  /** All currently-live promotions (within their date window, active flag on). */
  public static getActivePromotions(): ActivePromotion[] {
    const today = new Date().toISOString().slice(0, 10);
    return ACTIVE_PROMOTIONS.filter(
      p => p.active && p.startsAt <= today && p.endsAt >= today
    );
  }

  /**
   * Rank live promotions for a specific customer, best fit first.
   * Signals: promo type they prefer, categories they buy, tier eligibility.
   * Returns up to `limit` with a short "why" reason for the staff UI.
   */
  public static suggestPromotions(
    customer: CustomerProfile | null | undefined,
    limit = 3
  ): Array<{ promo: ActivePromotion; reason: string }> {
    const promos = this.getActivePromotions();
    if (!customer) {
      // No CRM link: only the universal "link your card" offer is relevant.
      return promos
        .filter(p => p.id === 'PROMO-LINK100')
        .slice(0, limit)
        .map(p => ({ promo: p, reason: 'Unlocks member pricing after linking' }));
    }

    const scored = promos.map(p => {
      let score = 0;
      const reasons: string[] = [];

      if (p.minTier && !p.minTier.includes(customer.tier)) {
        return { promo: p, score: -1, reason: '' }; // not eligible
      }

      if (p.promoType === customer.preferredPromoType) {
        score += 40;
        reasons.push('matches their preferred offer type');
      }
      const catOverlap = p.eligibleCategories.filter(c =>
        customer.topCategories.includes(c)
      );
      if (catOverlap.length > 0) {
        score += 25 + catOverlap.length * 5;
        reasons.push(`covers ${catOverlap[0]}`);
      }
      if (p.id === 'PROMO-LINK100' && customer.lineUid) {
        return { promo: p, score: -1, reason: '' }; // already linked
      }
      if (customer.rfmSegment === 'At Risk' || customer.rfmSegment === 'Need Attention') {
        if (p.maxDiscount || p.promoType === 'ONE_GET_ONE_FREE') {
          score += 15;
          reasons.push('strong win-back incentive');
        }
      }
      return { promo: p, score, reason: reasons.join(', ') || 'currently running' };
    });

    return scored
      .filter(s => s.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({ promo: s.promo, reason: s.reason }));
  }

  public static getPushLogs(): PushMessageLog[] {
    this.init();
    return [...this.pushLogs];
  }

  public static saveCustomers(updated: CustomerProfile[]) {
    this.customers = updated;
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
  }

  public static saveSegments(updated: SegmentRule[]) {
    this.segments = updated;
    localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(updated));
  }

  public static async addPushLog(log: PushMessageLog) {
    this.init();
    this.pushLogs.unshift(log);
    localStorage.setItem(STORAGE_KEYS.PUSH_LOGS, JSON.stringify(this.pushLogs.slice(0, 100)));

    // Also dispatch to backend /api/line/push asynchronously
    try {
      await fetch('/api/line/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toLineUid: log.customerLineUid,
          crmCustomerId: log.crmId,
          customerName: log.customerName,
          flexTitle: log.campaignTitle,
          messagePayload: log.payload
        })
      });
    } catch {
      // Graceful fallback to client storage
    }
  }

  public static linkLineAccount(crmCustomerId: string, lineUid: string, lineDisplayName: string): CustomerProfile | null {
    this.init();
    const index = this.customers.findIndex(c => c.crmCustomerId === crmCustomerId);
    if (index === -1) return null;

    const updated = [...this.customers];
    updated[index] = {
      ...updated[index],
      lineUid,
      lineDisplayName,
      isLineFriend: true,
      pdpaConsent: true,
      pdpaConsentDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      rfmSegment: updated[index].rfmSegment === 'New Follower' ? 'Potential Loyalist' : updated[index].rfmSegment,
    };

    this.saveCustomers(updated);
    return updated[index];
  }

  public static unlinkLineAccount(crmCustomerId: string): CustomerProfile | null {
    this.init();
    const index = this.customers.findIndex(c => c.crmCustomerId === crmCustomerId);
    if (index === -1) return null;

    const updated = [...this.customers];
    updated[index] = {
      ...updated[index],
      lineUid: null,
      lineDisplayName: undefined,
      lineAvatarUrl: undefined,
    };

    this.saveCustomers(updated);
    return updated[index];
  }

  public static resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SEGMENTS);
    localStorage.removeItem(STORAGE_KEYS.PUSH_LOGS);
    this.customers = INITIAL_CUSTOMERS;
    this.products = INITIAL_PRODUCTS;
    this.segments = INITIAL_SEGMENT_RULES;
    this.pushLogs = [];
  }

  // --- Real Excel (.xlsx) Export Capability ---
  public static exportDataLakeToExcel(): void {
    this.init();
    const workbook = XLSX.utils.book_new();

    // 1. Customers Sheet
    const customerRows = this.customers.map(c => ({
      'CRM_Customer_ID': c.crmCustomerId,
      'The1_Card_Number': c.the1CardNo,
      'Full_Name': c.fullName,
      'Phone': c.phone,
      'Email': c.email,
      'Tier': c.tier,
      'Preferred_Branch': c.preferredBranch,
      'LINE_UID': c.lineUid || 'UNMAPPED',
      'LINE_Display_Name': c.lineDisplayName || 'N/A',
      'Is_LINE_Friend': c.isLineFriend ? 'YES' : 'NO',
      'PDPA_Consent': c.pdpaConsent ? 'YES' : 'NO',
      'PDPA_Consent_Date': c.pdpaConsentDate || 'N/A',
      'RFM_Segment': c.rfmSegment,
      'Total_Spend_THB': c.totalSpendLtv,
      'Order_Count': c.orderCount,
      'AOV_THB': c.aov,
      'Last_Purchase_Date': c.lastPurchaseDate,
      'Days_Inactive': c.daysSinceLastPurchase,
      'Top_Categories': c.topCategories.join(', '),
      'Preferred_Promo_Type': c.preferredPromoType,
    }));
    const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
    XLSX.utils.book_append_sheet(workbook, wsCustomers, 'CRM_Customers');

    // 2. Line UID Mapping Table Sheet
    const mappingRows = this.customers.map(c => ({
      'LINE_UID': c.lineUid || 'UNMAPPED',
      'LINE_Display_Name': c.lineDisplayName || 'N/A',
      'CRM_Customer_ID': c.crmCustomerId,
      'Full_Name': c.fullName,
      'Phone_Verified': c.phone,
      'Mapping_Status': c.lineUid ? 'BOUND_ACTIVE' : 'PENDING_OPT_IN',
      'PDPA_Authorized': c.pdpaConsent ? 'YES' : 'NO',
    }));
    const wsMapping = XLSX.utils.json_to_sheet(mappingRows);
    XLSX.utils.book_append_sheet(workbook, wsMapping, 'LINE_UID_Mapping_Table');

    // 3. Transactions Sheet
    const txRows: any[] = [];
    this.customers.forEach(c => {
      c.transactions.forEach(t => {
        t.items.forEach(item => {
          txRows.push({
            'Order_ID': t.orderId,
            'CRM_Customer_ID': c.crmCustomerId,
            'Customer_Name': c.fullName,
            'LINE_UID': c.lineUid || 'UNMAPPED',
            'Order_Date': t.date,
            'Channel': t.channel,
            'Branch': t.branch,
            'SKU': item.sku,
            'Product_Name_EN': item.nameEn,
            'Product_Name_TH': item.nameTh,
            'Category': item.category,
            'Quantity': item.quantity,
            'Unit_Price_THB': item.unitPrice,
            'Total_Item_THB': item.totalPrice,
            'Payment_Method': t.paymentMethod,
          });
        });
      });
    });
    const wsTx = XLSX.utils.json_to_sheet(txRows);
    XLSX.utils.book_append_sheet(workbook, wsTx, 'POS_LINE_Transactions');

    // 4. Products Sheet
    const prodRows = this.products.map(p => ({
      'SKU': p.sku,
      'Name_EN': p.nameEn,
      'Name_TH': p.nameTh,
      'Category': p.category,
      'Sub_Category': p.subCategory,
      'Retail_Price_THB': p.price,
      'Original_Price_THB': p.originalPrice || p.price,
      'In_Stock': p.inStock ? 'YES' : 'NO',
      'Unit': p.unit,
      'Promo_Tag': p.promoTag || 'NONE',
    }));
    const wsProd = XLSX.utils.json_to_sheet(prodRows);
    XLSX.utils.book_append_sheet(workbook, wsProd, 'Grocery_Catalog');

    // Generate Excel binary and download trigger
    XLSX.writeFile(workbook, `Tops_LINE_Grocery_DataLake_POC_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // --- Real Excel / CSV Import Capability ---
  public static async importDataLakeFromExcel(file: File): Promise<{ success: boolean; count: number; message: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Check if there is a customer sheet or just the first sheet
          const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('customer') || s.toLowerCase().includes('crm')) || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);

          if (!rawRows || rawRows.length === 0) {
            resolve({ success: false, count: 0, message: 'Uploaded sheet contains no readable records.' });
            return;
          }

          let updatedCount = 0;
          const currentCust = [...this.customers];

          rawRows.forEach((row) => {
            const crmId = row['CRM_Customer_ID'] || row['crmCustomerId'] || row['CustomerId'] || row['Customer_ID'] || row['ID'];
            const lineUid = row['LINE_UID'] || row['lineUid'] || row['LineUid'];
            const phone = row['Phone'] || row['phone'] || row['Mobile'];
            const fullName = row['Full_Name'] || row['fullName'] || row['Name'];

            if (crmId) {
              const existingIdx = currentCust.findIndex(c => c.crmCustomerId === String(crmId));
              if (existingIdx !== -1) {
                // Update mapping if provided
                if (lineUid && lineUid !== 'UNMAPPED') {
                  currentCust[existingIdx].lineUid = String(lineUid);
                  currentCust[existingIdx].isLineFriend = true;
                }
                if (phone) currentCust[existingIdx].phone = String(phone);
                updatedCount++;
              } else if (fullName) {
                // Add new customer profile
                currentCust.push({
                  crmCustomerId: String(crmId),
                  the1CardNo: `6271-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
                  fullName: String(fullName),
                  phone: phone ? String(phone) : '081-000-0000',
                  email: `${String(fullName).toLowerCase().replace(/\s+/g, '.')}@example.com`,
                  tier: (row['Tier'] as any) || 'MEMBER',
                  preferredBranch: row['Preferred_Branch'] || 'Tops Food Hall CentralWorld',
                  lineUid: lineUid && lineUid !== 'UNMAPPED' ? String(lineUid) : null,
                  lineDisplayName: row['LINE_Display_Name'] || (lineUid ? String(fullName).split(' ')[0] : undefined),
                  isLineFriend: Boolean(lineUid && lineUid !== 'UNMAPPED'),
                  pdpaConsent: row['PDPA_Consent'] === 'YES' || true,
                  pdpaConsentDate: new Date().toISOString().substring(0, 10),
                  rfmSegment: 'Potential Loyalist',
                  totalSpendLtv: Number(row['Total_Spend_THB']) || 1500,
                  orderCount: Number(row['Order_Count']) || 2,
                  aov: Number(row['AOV_THB']) || 750,
                  lastPurchaseDate: new Date().toISOString().substring(0, 10),
                  daysSinceLastPurchase: 3,
                  topCategories: ['Fresh Produce', 'Pantry & Staples'],
                  dietaryPreferences: ['Organic'],
                  preferredPromoType: 'INSTANT_CASH_VOUCHER',
                  transactions: [],
                });
                updatedCount++;
              }
            }
          });

          this.saveCustomers(currentCust);
          resolve({
            success: true,
            count: updatedCount,
            message: `Successfully processed ${updatedCount} customer and LINE UID mapping records from Excel sheet "${sheetName}".`,
          });
        } catch (err: any) {
          resolve({ success: false, count: 0, message: `Failed to parse Excel file: ${err?.message || 'Invalid format'}` });
        }
      };

      reader.onerror = () => resolve({ success: false, count: 0, message: 'Could not read file.' });
      reader.readAsArrayBuffer(file);
    });
  }

  // --- Data Lake Health Metrics ---
  public static getMetrics() {
    this.init();
    const totalCustomers = this.customers.length;
    const mappedLineCount = this.customers.filter(c => c.lineUid).length;
    const pdpaConsentedCount = this.customers.filter(c => c.pdpaConsent).length;
    const mappingRatePct = totalCustomers > 0 ? Math.round((mappedLineCount / totalCustomers) * 100) : 0;
    const totalTransactions = this.customers.reduce((acc, c) => acc + c.transactions.length, 0);
    const totalGrossMerchandiseValue = this.customers.reduce((acc, c) => acc + c.totalSpendLtv, 0);

    return {
      totalCustomers,
      mappedLineCount,
      unmappedLineCount: totalCustomers - mappedLineCount,
      mappingRatePct,
      pdpaConsentedCount,
      pdpaRatePct: totalCustomers > 0 ? Math.round((pdpaConsentedCount / totalCustomers) * 100) : 0,
      totalTransactions,
      totalGrossMerchandiseValue,
      catalogProductCount: this.products.length,
      activeSegmentRulesCount: this.segments.length,
    };
  }
}
