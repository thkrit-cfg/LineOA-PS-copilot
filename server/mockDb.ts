import { CustomerProfile, GroceryProduct, LineStaffUser } from '../src/types';
import { INITIAL_CUSTOMERS, INITIAL_PRODUCTS, CURRENT_STAFF } from '../src/data/mockGroceryDataLake';

// In-memory mock database store for production prototype
class MockDatabase {
  private customers: Map<string, CustomerProfile> = new Map();
  private products: Map<string, GroceryProduct> = new Map();
  private staff: Map<string, LineStaffUser> = new Map();
  private pushLogs: Array<{
    id: string;
    targetSegment: string;
    customerLineUid?: string;
    crmId?: string;
    customerName: string;
    timestamp: string;
    status: 'DELIVERED' | 'READ' | 'FAILED' | 'CLAIMED_PROMO';
    flexTitle: string;
    promoSku?: string;
    branch: string;
    channel: 'PUSH_DIRECT' | 'BROADCAST_AUDIENCE' | 'STAFF_1ON1';
  }> = [];

  constructor() {
    this.seed();
  }

  private seed() {
    INITIAL_CUSTOMERS.forEach((cust: CustomerProfile) => {
      this.customers.set(cust.crmCustomerId, { ...cust });
    });
    INITIAL_PRODUCTS.forEach((prod: GroceryProduct) => {
      this.products.set(prod.sku, { ...prod });
    });
    this.staff.set(CURRENT_STAFF.staffId, { ...CURRENT_STAFF });
  }

  // Customer queries
  getAllCustomers(): CustomerProfile[] {
    return Array.from(this.customers.values());
  }

  getCustomerById(crmCustomerId: string): CustomerProfile | undefined {
    return this.customers.get(crmCustomerId);
  }

  getCustomerByLineUid(lineUid: string): CustomerProfile | undefined {
    return Array.from(this.customers.values()).find(c => c.lineUid === lineUid);
  }

  getCustomerByPhone(phone: string): CustomerProfile | undefined {
    const cleanPhone = phone.replace(/\D/g, '');
    return Array.from(this.customers.values()).find(c => c.phone.replace(/\D/g, '') === cleanPhone);
  }

  mapLineUid(crmCustomerId: string, lineUid: string, displayName?: string): CustomerProfile | null {
    const customer = this.customers.get(crmCustomerId);
    if (!customer) return null;
    customer.lineUid = lineUid;
    if (displayName) customer.lineDisplayName = displayName;
    return { ...customer };
  }

  unmapLineUid(crmCustomerId: string): CustomerProfile | null {
    const customer = this.customers.get(crmCustomerId);
    if (!customer) return null;
    customer.lineUid = null;
    customer.lineDisplayName = undefined;
    return { ...customer };
  }

  // Products queries
  getAllProducts(): GroceryProduct[] {
    return Array.from(this.products.values());
  }

  getProductBySku(sku: string): GroceryProduct | undefined {
    return this.products.get(sku);
  }

  // Push logs
  recordPushLog(log: {
    targetSegment: string;
    customerLineUid?: string;
    crmId?: string;
    customerName: string;
    flexTitle: string;
    promoSku?: string;
    branch: string;
    channel: 'PUSH_DIRECT' | 'BROADCAST_AUDIENCE' | 'STAFF_1ON1';
  }) {
    const newLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...log,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      status: 'DELIVERED' as const
    };
    this.pushLogs.unshift(newLog);
    return newLog;
  }

  getPushLogs() {
    return [...this.pushLogs];
  }
}

export const mockDb = new MockDatabase();
