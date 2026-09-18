import React, { useState } from 'react';
import { 
  Search, 
  UserCheck, 
  QrCode, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  ShoppingBag, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Tag, 
  MessageSquare, 
  ChevronRight,
  ShieldCheck,
  Award,
  RefreshCw,
  Eye,
  Store,
  Phone
} from 'lucide-react';
import { CustomerProfile, GroceryProduct, PushMessageLog } from '../types';
import { getPersonalizedRecommendations, generateStaffConversationScript } from '../services/recommendationEngine';
import { executeCampaignTrigger } from '../services/segmentationEngine';
import { CURRENT_STAFF } from '../data/mockGroceryDataLake';

interface StaffConsoleProps {
  customers: CustomerProfile[];
  selectedCustomer: CustomerProfile;
  onSelectCustomer: (cust: CustomerProfile) => void;
  onSendPush: (log: PushMessageLog) => void;
}

export const StaffConsole: React.FC<StaffConsoleProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onSendPush,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [filterLineOnly, setFilterLineOnly] = useState(false);
  const [pushedItemSku, setPushedItemSku] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Recommendations calculated dynamically for this customer
  const recommendations = getPersonalizedRecommendations(selectedCustomer);
  const script = generateStaffConversationScript(selectedCustomer);

  // Filter customers list
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase().trim();
    const matchQuery = 
      !query ||
      c.fullName.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.the1CardNo.includes(query) ||
      (c.lineUid && c.lineUid.toLowerCase().includes(query)) ||
      (c.lineDisplayName && c.lineDisplayName.toLowerCase().includes(query));

    const matchTier = filterTier === 'ALL' || c.tier === filterTier;
    const matchLine = !filterLineOnly || Boolean(c.lineUid);

    return matchQuery && matchTier && matchLine;
  });

  const handlePushRecommendation = (rec: any) => {
    setPushedItemSku(rec.product.sku);

    const syntheticRule = {
      id: `STAFF-REC-${rec.product.sku}`,
      name: `Staff Personalized Recommendation: ${rec.product.nameEn}`,
      description: 'Triggered by Store Staff at POS/LINE Consultation',
      triggerEvent: 'STAFF_RECOMMENDATION_TRIGGER',
      automatedPushEnabled: false,
      pushTemplate: {
        titleEn: `Store Staff Pick: Special on ${rec.product.nameEn}`,
        titleTh: `คำแนะนำจากพนักงานท็อปส์: ข้อเสนอพิเศษสำหรับ ${rec.product.nameTh}`,
        bodyEn: `${rec.reason} Use exclusive promo: ${rec.suggestedPromo}`,
        bodyTh: `${rec.reasonTh} พิเศษ! แสดงข้อความนี้ที่จุดชำระเงินหรือสั่งซื้อได้ทันที`,
        promoCode: `STAFF${rec.product.sku.slice(-3)}`,
        discountValue: rec.suggestedPromo,
        ctaText: 'Add to Basket on LINE',
        flexColor: '#059669',
      }
    };

    const log = executeCampaignTrigger(syntheticRule, selectedCustomer);
    onSendPush(log);

    setTimeout(() => {
      setPushedItemSku(null);
    }, 2500);
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-4 overflow-hidden">
      
      {/* Left Column: Customer Directory & Search */}
      <div className="w-full xl:w-80 shrink-0 bg-[#141b26] border border-slate-800 rounded-2xl p-3 flex flex-col max-h-[750px] shadow-lg">
        
        {/* Active Staff Info Header */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <img 
            src={CURRENT_STAFF.avatar} 
            alt={CURRENT_STAFF.name} 
            className="w-9 h-9 rounded-full object-cover border border-emerald-500/50"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate">{CURRENT_STAFF.name}</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-medium">
              {CURRENT_STAFF.role} · {CURRENT_STAFF.staffId}
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="py-2.5 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              id="customer-search-input"
              type="text"
              placeholder="Search Name, Phone, LINE UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="bg-[#0b0f17] border border-slate-800 text-[11px] text-slate-300 rounded-lg px-2 py-1 flex-1 focus:outline-none"
            >
              <option value="ALL">All Tiers</option>
              <option value="PLATINUM_VIP">Platinum VIP</option>
              <option value="GOLD">Gold</option>
              <option value="SILVER">Silver</option>
              <option value="MEMBER">Member</option>
            </select>

            <button
              onClick={() => setFilterLineOnly(!filterLineOnly)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                filterLineOnly
                  ? 'bg-[#06c755]/20 text-[#06c755] border-[#06c755]/40'
                  : 'bg-[#0b0f17] text-slate-400 border-slate-800'
              }`}
            >
              LINE Only
            </button>
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 px-1 py-0.5">
            Store Customers ({filteredCustomers.length})
          </div>

          {filteredCustomers.map(c => {
            const isSelected = c.crmCustomerId === selectedCustomer.crmCustomerId;
            return (
              <button
                key={c.crmCustomerId}
                onClick={() => onSelectCustomer(c)}
                className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-sm'
                    : 'bg-[#182130]/60 border-slate-800/80 text-slate-300 hover:bg-[#1f2a3c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs truncate max-w-[170px]">{c.fullName}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    c.tier === 'PLATINUM_VIP' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                    c.tier === 'GOLD' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {c.tier.replace('_VIP', '')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">{c.phone}</span>
                  {c.lineUid ? (
                    <span className="text-[#06c755] font-medium flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#06c755]" />
                      LINE Mapped
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium">Unmapped</span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Spend: ฿{c.totalSpendLtv.toLocaleString()}</span>
                  <span>{c.rfmSegment}</span>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Center/Right: Customer 360 & Personalization Engine */}
      <div className="flex-1 bg-[#141b26] border border-slate-800 rounded-2xl p-4 xl:p-5 overflow-y-auto max-h-[750px] shadow-lg space-y-5">
        
        {/* Customer Header 360 Bar */}
        <div className="bg-gradient-to-r from-[#17202e] to-[#1a2536] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-lg font-extrabold shadow-md">
                {selectedCustomer.fullName.charAt(0)}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold ${
                selectedCustomer.lineUid ? 'bg-[#06c755] text-white' : 'bg-amber-500 text-black'
              }`}>
                {selectedCustomer.lineUid ? 'L' : '!'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-white">
                  {selectedCustomer.fullName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {selectedCustomer.tier}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedCustomer.rfmSegment}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                <span>The 1: <strong className="text-slate-200 font-mono">{selectedCustomer.the1CardNo}</strong></span>
                <span>CRM ID: <strong className="text-slate-200 font-mono">{selectedCustomer.crmCustomerId}</strong></span>
                <span>Phone: <strong className="text-slate-200 font-mono">{selectedCustomer.phone}</strong></span>
              </div>
            </div>
          </div>

          {/* LINE UID Status Widget */}
          <div className="bg-[#0f1520] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between md:min-w-[280px]">
            {selectedCustomer.lineUid ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs text-[#06c755] font-bold">
                  <UserCheck className="w-4 h-4" />
                  <span>LINE Account Mapped</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title={selectedCustomer.lineUid}>
                  UID: {selectedCustomer.lineUid}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>Name: <strong className="text-slate-200">{selectedCustomer.lineDisplayName}</strong></span>
                  {selectedCustomer.pdpaConsent && (
                    <span className="text-emerald-400 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> PDPA OK
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> LINE Unmapped
                  </span>
                  <button
                    id="btn-staff-show-qr"
                    onClick={() => setShowQrModal(true)}
                    className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Show Link QR</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Customer hasn&apos;t bound LINE OA. Invite them to scan for ฿100 instant coupon.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* 4 Core Grocery Operational Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          <div className="bg-[#17202e] border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Spend (LTV)</span>
            <div className="text-base font-bold text-white mt-1">
              ฿{selectedCustomer.totalSpendLtv.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">{selectedCustomer.orderCount} lifetime orders</span>
          </div>

          <div className="bg-[#17202e] border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Avg Basket (AOV)</span>
            <div className="text-base font-bold text-emerald-400 mt-1">
              ฿{selectedCustomer.aov.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">vs Store Avg ฿850 (+{Math.round(((selectedCustomer.aov - 850) / 850) * 100)}%)</span>
          </div>

          <div className="bg-[#17202e] border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inactivity Cadence</span>
            <div className={`text-base font-bold mt-1 ${
              selectedCustomer.daysSinceLastPurchase > 20 ? 'text-rose-400' : 'text-white'
            }`}>
              {selectedCustomer.daysSinceLastPurchase} Days Ago
            </div>
            <span className="text-[10px] text-slate-400">Last: {selectedCustomer.lastPurchaseDate}</span>
          </div>

          <div className="bg-[#17202e] border border-slate-800 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Preferred Promo Type</span>
            <div className="text-xs font-bold text-amber-300 mt-1 truncate">
              {selectedCustomer.preferredPromoType.replace(/_/g, ' ')}
            </div>
            <span className="text-[10px] text-slate-400">Highest conversion response</span>
          </div>

        </div>

        {/* Staff In-Store Conversation Guide */}
        <div className="bg-[#162232] border border-emerald-500/30 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <MessageSquare className="w-4 h-4" />
              <span>Recommended Staff Talking Point (สคริปต์พนักงานหน้าร้าน)</span>
            </div>
            <span className="text-[10px] text-slate-400">AI Contextual Prompt</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="bg-[#0e1622] p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 font-semibold block mb-0.5">THAI (ภาษาไทย)</span>
              <p className="text-slate-200 leading-relaxed font-sans">{script.th}</p>
            </div>
            <div className="bg-[#0e1622] p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 font-semibold block mb-0.5">ENGLISH</span>
              <p className="text-slate-200 leading-relaxed">{script.en}</p>
            </div>
          </div>
        </div>

        {/* Personalized Upsell & Cross-Sell Engine */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Personalized Upsell, Cross-Sell & Replenishment Engine
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Based on CRM transaction patterns & basket affinity
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recommendations.map((rec) => {
              const isPushed = pushedItemSku === rec.product.sku;

              return (
                <div 
                  key={rec.product.sku}
                  className="bg-[#182130] border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex gap-3">
                    <img 
                      src={rec.product.image} 
                      alt={rec.product.nameEn} 
                      className="w-20 h-20 rounded-xl object-cover border border-slate-700 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          rec.type === 'CROSS_SELL' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                          rec.type === 'REPLENISHMENT' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}>
                          {rec.type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">
                          {rec.confidenceScore}% Match
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white leading-tight truncate">
                        {rec.product.nameEn}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {rec.product.nameTh}
                      </p>

                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-sm font-extrabold text-emerald-400">
                          ฿{rec.product.price}
                        </span>
                        {rec.product.originalPrice && (
                          <span className="text-xs text-slate-500 line-through">
                            ฿{rec.product.originalPrice}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">/ {rec.product.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Reasoning */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
                    <p className="text-[11px] text-slate-300 leading-snug">
                      💡 {rec.reasonTh}
                    </p>
                    <div className="bg-[#111722] p-2 rounded-xl text-[10px] text-amber-300 font-medium flex items-center justify-between">
                      <span>Promo: {rec.suggestedPromo}</span>
                    </div>
                  </div>

                  {/* 1-Click Action */}
                  <div className="mt-3">
                    <button
                      id={`btn-push-rec-${rec.product.sku}`}
                      onClick={() => handlePushRecommendation(rec)}
                      disabled={isPushed}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow ${
                        isPushed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#06c755] hover:bg-[#05b34c] text-white shadow-md active:scale-98'
                      }`}
                    >
                      {isPushed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pushed to LINE OA App!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Push Offer to Customer&apos;s LINE Phone</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Past Purchase History & Category Affinity */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-slate-400" />
              <span>Purchase History & Channel Attribution ({selectedCustomer.transactions.length} Orders)</span>
            </h3>
            <span className="text-xs text-slate-400">
              Preferred Store: {selectedCustomer.preferredBranch}
            </span>
          </div>

          <div className="space-y-2">
            {selectedCustomer.transactions.map((tx) => (
              <div 
                key={tx.orderId}
                className="bg-[#182130] border border-slate-800 rounded-xl p-3 text-xs space-y-2"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-200">{tx.orderId}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      tx.channel === 'LINE_OA' ? 'bg-[#06c755]/20 text-[#06c755] border border-[#06c755]/30' :
                      tx.channel === 'IN_STORE_POS' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                      'bg-purple-950 text-purple-300 border border-purple-800'
                    }`}>
                      {tx.channel.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400 text-[11px]">{tx.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] mr-2">{tx.paymentMethod}</span>
                    <span className="font-extrabold text-emerald-400 text-sm">
                      ฿{tx.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Items in this order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {tx.items.map((item, idx) => (
                    <div key={idx} className="bg-[#111722] p-2 rounded-lg border border-slate-800/60 flex items-center justify-between">
                      <div className="min-w-0 pr-1">
                        <p className="font-semibold text-slate-200 truncate text-[11px]">{item.nameEn}</p>
                        <p className="text-slate-400 text-[9px] truncate">{item.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-slate-400 text-[10px]">x{item.quantity}</span>
                        <p className="font-bold text-slate-200 text-xs">฿{item.totalPrice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* In-Store QR Modal for Staff to show customer on Tablet */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1c2433] border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">
                Scan to Link The 1 to Tops LINE OA
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Show this QR to {selectedCustomer.fullName} at checkout to instantly claim ฿100 cash coupon.
              </p>
            </div>

            {/* Realistic stylized QR container */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto">
              <div className="w-48 h-48 border-4 border-slate-900 rounded-lg flex flex-col items-center justify-center relative">
                {/* SVG mock QR pattern with Tops logo */}
                <div className="absolute inset-2 grid grid-cols-6 gap-1 opacity-85">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`${(i % 2 === 0 || i % 5 === 0) ? 'bg-slate-900' : 'bg-transparent'} rounded-xs`} 
                    />
                  ))}
                </div>
                <div className="z-10 bg-red-600 text-white font-extrabold text-xs px-2 py-1 rounded shadow">
                  Tops LINE
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Staff Attribution Code: <strong>STF-BKK-104 (Somchai)</strong>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
