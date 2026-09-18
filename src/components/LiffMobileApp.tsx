import React, { useState, useEffect } from 'react';
import { 
  Store, 
  QrCode, 
  Tag, 
  Sparkles, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowLeft, 
  Copy, 
  ExternalLink, 
  Send, 
  User, 
  ShieldCheck, 
  CreditCard,
  Phone,
  RefreshCw,
  Gift,
  ChevronRight,
  Flame,
  Award,
  Search
} from 'lucide-react';
import { CustomerProfile, GroceryProduct, PushMessageLog } from '../types';
import { CustomerCrmDrawer } from './CustomerCrmDrawer';

interface LiffMobileAppProps {
  customers: CustomerProfile[];
  products: GroceryProduct[];
  onExitToDashboard?: () => void;
  onSendPush?: (log: PushMessageLog) => void;
}

declare global {
  interface Window {
    liff?: any;
  }
}

// Singleton flag to prevent multiple liff.init calls across re-renders
let isLiffInitializedGlobally = false;

export const LiffMobileApp: React.FC<LiffMobileAppProps> = ({
  customers,
  products,
  onExitToDashboard,
  onSendPush
}) => {
  const [activeTab, setActiveTab] = useState<'CARD' | 'COUPONS' | 'STAFF_COPILOT'>('CARD');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers[0]?.crmCustomerId || 'CUST-001'
  );
  const [liffProfile, setLiffProfile] = useState<{ displayName?: string; userId?: string; pictureUrl?: string } | null>(null);
  const [liffInitialized, setLiffInitialized] = useState<boolean>(false);
  const [activeCouponBarcode, setActiveCouponBarcode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showCrmDrawer, setShowCrmDrawer] = useState<boolean>(false);

  // Link status state
  const currentCustomer = customers.find(c => c.crmCustomerId === selectedCustomerId) || customers[0];

  // Initialize LINE LIFF SDK safely (strictly once)
  useEffect(() => {
    const initLiff = async () => {
      if (isLiffInitializedGlobally) {
        setLiffInitialized(true);
        return;
      }

      if (typeof window !== 'undefined' && window.liff) {
        try {
          isLiffInitializedGlobally = true;
          await window.liff.init({ liffId: '2011658962-de45TvhN' });
          setLiffInitialized(true);

          if (window.liff.isLoggedIn && window.liff.isLoggedIn()) {
            try {
              const profile = await window.liff.getProfile();
              setLiffProfile(profile);
              
              if (customers && customers.length > 0) {
                const matched = customers.find(c => c.lineUid === profile.userId);
                if (matched) {
                  setSelectedCustomerId(matched.crmCustomerId);
                }
              }
            } catch (pErr) {
              console.warn('LIFF getProfile skipped or failed:', pErr);
            }
          }
        } catch (err) {
          console.warn('LIFF init warning (graceful fallback active):', err);
          setLiffInitialized(true);
        }
      } else {
        setLiffInitialized(true);
      }
    };

    initLiff();
  }, []); // Run strictly once on mount

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setActionNotice(`Coupon code "${code}" copied!`);
    setTimeout(() => {
      setCopiedCode(null);
      setActionNotice(null);
    }, 2500);
  };

  const handleSendFlexToChat = async (product: GroceryProduct) => {
    // If inside real LINE LIFF with sendMessages capability
    if (window.liff && window.liff.isInClient && window.liff.isInClient()) {
      try {
        await window.liff.sendMessages([
          {
            type: 'text',
            text: `[Tops Copilot] Special Offer for you: ${product.nameEn} (Now ฿${product.price})`
          }
        ]);
        setActionNotice('Sent recommendation into LINE chat!');
        setTimeout(() => setActionNotice(null), 3000);
        return;
      } catch (e) {
        console.warn('sendMessages error:', e);
      }
    }

    // Fallback: Dispatch to backend / push log
    if (onSendPush && currentCustomer) {
      const log: PushMessageLog = {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        customerName: currentCustomer.fullName,
        crmId: currentCustomer.crmCustomerId,
        customerLineUid: currentCustomer.lineUid || 'U-GUEST',
        campaignTitle: `LIFF Staff Recommendation: ${product.nameEn}`,
        messageType: 'STAFF_RECOMMENDATION',
        status: 'DELIVERED',
        payload: {
          recommendedSku: product.sku,
          price: product.price
        }
      };
      onSendPush(log);
    }

    setActionNotice(`Sent "${product.nameEn}" offer to customer's LINE!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const calculatedPoints = currentCustomer 
    ? Math.round((currentCustomer.totalSpendLtv / 25) * 8) 
    : 14280;

  return (
    <div className="min-h-screen bg-[#0d131f] text-slate-100 flex flex-col font-sans max-w-md mx-auto shadow-2xl relative border-x border-slate-800">
      
      {/* Top Banner / LINE Indicator */}
      <div className="bg-[#141d2c] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-sm tracking-tight">Tops</span>
              <span className="bg-[#06c755] text-slate-950 px-1.5 py-0.2 rounded font-mono text-[10px] font-black">
                LIFF
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">
              The 1 Member & Staff Copilot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExitToDashboard && (
            <button
              onClick={onExitToDashboard}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1"
              title="Return to full Backoffice Admin Console"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Action Notice Toast */}
      {actionNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-3 bg-[#111723] p-1.5 border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('CARD')}
          className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'CARD'
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>The 1 Card</span>
        </button>

        <button
          onClick={() => setActiveTab('COUPONS')}
          className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'COUPONS'
              ? 'bg-[#06c755] text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>My Coupons</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF_COPILOT')}
          className={`py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'STAFF_COPILOT'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Staff Copilot</span>
        </button>
      </div>

      {/* Customer Quick Selector (For testing / Sales Floor lookup) */}
      <div className="bg-[#151e2d] px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px]">Active Customer:</span>
        </div>
        <button
          onClick={() => setShowCrmDrawer(true)}
          className="flex items-center gap-2 min-w-0 bg-[#0b0f17] border border-slate-700 hover:border-emerald-500 rounded-lg py-1 px-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
          title="Open Customer CRM Lookup"
        >
          <span className="text-white text-xs font-medium truncate max-w-[150px]">
            {currentCustomer?.fullName || 'Select customer'}
          </span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded shrink-0">
            {currentCustomer?.tier || '—'}
          </span>
          <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        </button>
      </div>

      {/* Customer CRM Lookup Drawer */}
      <CustomerCrmDrawer
        open={showCrmDrawer}
        onClose={() => setShowCrmDrawer(false)}
        customers={customers}
        onOpenCustomer={(id) => setSelectedCustomerId(id)}
      />

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-20">

        {/* 1. THE 1 DIGITAL MEMBERSHIP CARD */}
        {activeTab === 'CARD' && currentCustomer && (
          <div className="space-y-4">
            
            {/* The 1 Digital Card Graphic */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-[#1e232e] via-[#1a2130] to-[#111622]">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-sm shadow-md">
                    1
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm tracking-wide">The 1</h3>
                    <p className="text-[10px] text-amber-300/90 font-medium tracking-wider uppercase">
                      Central Retail Corporation
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-400/30 flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-400" />
                  <span>{currentCustomer.tier}</span>
                </span>
              </div>

              {/* Customer Identity */}
              <div className="mt-5">
                <div className="text-[11px] text-slate-400">Member Name</div>
                <div className="text-base font-bold text-white tracking-wide">
                  {currentCustomer.fullName}
                </div>
                <div className="font-mono text-xs text-slate-300 mt-0.5 tracking-wider">
                  {currentCustomer.the1CardNo || '7018-9421-5502-1829'}
                </div>
              </div>

              {/* Point Balance & Cash Value */}
              <div className="mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">The 1 Points</div>
                  <div className="text-xl font-black text-amber-400">
                    {calculatedPoints.toLocaleString()} <span className="text-xs font-normal text-slate-400">pts</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Cash Value</div>
                  <div className="text-xl font-black text-emerald-400">
                    ฿{Math.floor(calculatedPoints / 8).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* In-Store Barcode for Cashier Scanning */}
            <div className="bg-[#141c2a] rounded-2xl p-4 border border-slate-800 text-center space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Cashier POS Scan Code</span>
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                  Ready to scan
                </span>
              </div>

              {/* Simulated Visual Barcode */}
              <div className="bg-white p-3 rounded-xl inline-block w-full max-w-[280px] shadow-inner">
                <div className="flex justify-between items-center h-14 px-2 space-x-1">
                  {[4, 2, 6, 2, 4, 3, 2, 5, 2, 6, 3, 2, 4, 5, 2, 4, 2, 6, 3, 4, 2, 5, 4, 2, 3, 6, 2, 4, 5].map((w, idx) => (
                    <div
                      key={idx}
                      className="bg-black h-full rounded-xs"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
                <div className="font-mono text-xs text-black font-black tracking-widest mt-1">
                  {currentCustomer.the1CardNo || '7018-9421-5502-1829'}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Present this screen at any Tops Supermarket, Tops Food Hall, or Tops Fine Food cashier to earn and burn The 1 points.
              </p>
            </div>

            {/* Branch Preference & Dietary Tags */}
            <div className="bg-[#141c2a] rounded-2xl p-4 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Home Store:</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentCustomer.preferredBranch}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Dietary Preferences:</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {currentCustomer.dietaryPreferences.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-medium border border-emerald-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 2. MY EXCLUSIVE COUPONS */}
        {activeTab === 'COUPONS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Personalized Vouchers</span>
                </h4>
                <p className="text-xs text-slate-400">Tailored to your grocery purchase affinities</p>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                3 Available
              </span>
            </div>

            {/* Coupon 1 */}
            <div className="bg-[#151f2e] rounded-2xl border border-slate-800 overflow-hidden shadow-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold text-[10px] border border-red-500/30">
                    ฿150 CASH OFF
                  </span>
                  <h5 className="font-bold text-white text-sm mt-1">Australian Wagyu & Prime Beef</h5>
                  <p className="text-xs text-slate-400">Valid on purchases over ฿800 in Meat department</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black">
                  ฿150
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="font-mono text-xs text-amber-300 font-bold bg-black/40 px-2 py-1 rounded">
                  TOPS-WAGYU150
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode('TOPS-WAGYU150')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => setActiveCouponBarcode(activeCouponBarcode === 'TOPS-WAGYU150' ? null : 'TOPS-WAGYU150')}
                    className="px-3 py-1.5 rounded-lg bg-[#06c755] text-slate-950 font-bold text-xs"
                  >
                    {activeCouponBarcode === 'TOPS-WAGYU150' ? 'Hide Barcode' : 'Show Barcode'}
                  </button>
                </div>
              </div>

              {activeCouponBarcode === 'TOPS-WAGYU150' && (
                <div className="bg-white p-3 rounded-xl text-center space-y-1 mt-2">
                  <div className="flex justify-between items-center h-10 px-4 space-x-1">
                    {[4, 2, 5, 2, 4, 3, 2, 5, 2, 6, 3, 2, 4, 5, 2, 4, 2].map((w, idx) => (
                      <div key={idx} className="bg-black h-full" style={{ width: `${w * 2}px` }} />
                    ))}
                  </div>
                  <div className="font-mono text-black font-bold text-[11px]">BARCODE: 885-TOPS-WAGYU150</div>
                </div>
              )}
            </div>

            {/* Coupon 2 */}
            <div className="bg-[#151f2e] rounded-2xl border border-slate-800 overflow-hidden shadow-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                    20% DISCOUNT
                  </span>
                  <h5 className="font-bold text-white text-sm mt-1">Royal Project Organic Greens</h5>
                  <p className="text-xs text-slate-400">Fresh Hydroponic & Clean Salads</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">
                  20%
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="font-mono text-xs text-emerald-300 font-bold bg-black/40 px-2 py-1 rounded">
                  ROYAL-ORGANIC20
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode('ROYAL-ORGANIC20')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => setActiveCouponBarcode(activeCouponBarcode === 'ROYAL-ORGANIC20' ? null : 'ROYAL-ORGANIC20')}
                    className="px-3 py-1.5 rounded-lg bg-[#06c755] text-slate-950 font-bold text-xs"
                  >
                    {activeCouponBarcode === 'ROYAL-ORGANIC20' ? 'Hide Barcode' : 'Show Barcode'}
                  </button>
                </div>
              </div>

              {activeCouponBarcode === 'ROYAL-ORGANIC20' && (
                <div className="bg-white p-3 rounded-xl text-center space-y-1 mt-2">
                  <div className="flex justify-between items-center h-10 px-4 space-x-1">
                    {[3, 2, 6, 2, 4, 3, 5, 2, 2, 4, 3, 2, 4, 5, 2, 4, 2].map((w, idx) => (
                      <div key={idx} className="bg-black h-full" style={{ width: `${w * 2}px` }} />
                    ))}
                  </div>
                  <div className="font-mono text-black font-bold text-[11px]">BARCODE: 885-ROYAL-ORG20</div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. STAFF COPILOT (In-Store Frontline Associate Drawer) */}
        {activeTab === 'STAFF_COPILOT' && currentCustomer && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/60 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Frontline Sales Whisper</span>
                </span>
                <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded">
                  Staff Role: K. Somchai
                </span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Customer is browsing near Meat & Organic Fresh Department at {currentCustomer.preferredBranch}.
              </p>
            </div>

            {/* Quick Customer Profile Digest */}
            <div className="bg-[#141c2a] rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Spend (LTV):</span>
                <span className="font-bold text-emerald-400">฿{currentCustomer.totalSpendLtv.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Average Basket (AOV):</span>
                <span className="font-bold text-white">฿{currentCustomer.aov.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Purchase:</span>
                <span className="text-slate-300">{currentCustomer.daysSinceLastPurchase} days ago</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Top Categories:</span>
                <span className="font-semibold text-amber-300">{currentCustomer.topCategories.join(', ')}</span>
              </div>
            </div>

            {/* Recommended Cross-Sell Products with 1-Tap Push into LINE Chat */}
            <div className="space-y-2">
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI Recommended Products for Upsell:</span>
              </h5>

              {products.slice(0, 3).map(prod => (
                <div key={prod.sku} className="p-3 bg-[#151e2d] rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs truncate">{prod.nameEn}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-emerald-400 font-bold">฿{prod.price}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded">{prod.category}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendFlexToChat(prod)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#06c755] hover:bg-[#05b34c] text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                    title="Send Flex Message recommendation directly into customer chat"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send to LINE</span>
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* Bottom Sticky Bar for LIFF */}
      <div className="bg-[#121824] border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs sticky bottom-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-[11px]">
            {liffProfile ? `LINE: ${liffProfile.displayName}` : 'Tops OA: @732xokoy'}
          </span>
        </div>

        <button
          onClick={() => setActiveTab('CARD')}
          className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
        >
          Present Barcode
        </button>
      </div>

    </div>
  );
};
