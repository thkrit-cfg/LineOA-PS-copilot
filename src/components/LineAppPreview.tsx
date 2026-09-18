import React, { useState } from 'react';
import { 
  Smartphone, 
  Send, 
  Sparkles, 
  QrCode, 
  Tag, 
  ShoppingBag, 
  PhoneCall, 
  FileText, 
  CheckCircle2, 
  X, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Terminal,
  Layers,
  Clock,
  Copy,
  Info,
  ChevronUp
} from 'lucide-react';
import { CustomerProfile, PushMessageLog } from '../types';

interface LineAppPreviewProps {
  customers: CustomerProfile[];
  activeCustomer: CustomerProfile;
  onSelectCustomer: (cust: CustomerProfile) => void;
  pushLogs: PushMessageLog[];
  onLinkCustomer: (crmId: string, lineUid: string, name: string) => void;
}

export const LineAppPreview: React.FC<LineAppPreviewProps> = ({
  customers,
  activeCustomer,
  onSelectCustomer,
  pushLogs,
  onLinkCustomer,
}) => {
  const [showLiffBindModal, setShowLiffBindModal] = useState(false);
  const [bindPhone, setBindPhone] = useState(activeCustomer.phone || '081-445-9821');
  const [bindCard, setBindCard] = useState(activeCustomer.the1CardNo || '');
  const [pdpaAgreed, setPdpaAgreed] = useState(true);
  const [claimedPromos, setClaimedPromos] = useState<string[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Hybrid Mode: Customer view vs. Staff 1-on-1 Chat Mode with Option C Slash Bot & LIFF Drawer
  const [simulatorMode, setSimulatorMode] = useState<'CUSTOMER' | 'STAFF_BOT'>('STAFF_BOT');
  const [showLiffDetailDrawer, setShowLiffDetailDrawer] = useState(false);
  const [activeSlashCommand, setActiveSlashCommand] = useState<string>('/crm profile');
  const [copiedStaffText, setCopiedStaffText] = useState<string | null>(null);

  // Approximate The 1 points balance from lifetime spend (8 points per 25 THB spent benchmark)
  const the1Points = Math.round((activeCustomer.totalSpendLtv / 25) * 8);

  const sampleStaffScriptTh = activeCustomer.dietaryPreferences.includes('Organic')
    ? `สวัสดีค่ะคุณ${activeCustomer.fullName.split(' ')[0]} วันนี้มีผักสลัดโครงการหลวงและแซลมอนสดนอร์เวย์เข้าใหม่นะคะ รับคู่กับน้ำสลัดญี่ปุ่นเลยไหมคะ?`
    : `สวัสดีค่ะคุณ${activeCustomer.fullName.split(' ')[0]} วันนี้สเต็กเนื้อริบอายออสเตรเลียตัดหนาพิเศษเข้าใหม่นะคะ รับซอสสุกี้คิคโคแมนคู่กันเลยไหมคะ?`;

  const handleCopyStaffScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStaffText(text);
    setActionNotice('Tailored staff response copied to chat input!');
    setTimeout(() => {
      setCopiedStaffText(null);
      setActionNotice(null);
    }, 3000);
  };

  // Filter logs for this customer or generic
  const customerLogs = pushLogs.filter(
    log => log.customerLineUid === activeCustomer.lineUid || log.crmId === activeCustomer.crmCustomerId
  );

  const handleClaim = (promoCode: string) => {
    if (!claimedPromos.includes(promoCode)) {
      setClaimedPromos([...claimedPromos, promoCode]);
    }
    setActionNotice(`Coupon ${promoCode} added to LINE My Coupons! Present at checkout.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handlePerformBind = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdpaAgreed) {
      alert('Please accept PDPA terms to link your membership.');
      return;
    }
    const simulatedLineUid = `U${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`.padEnd(33, '0');
    const lineName = activeCustomer.fullName.split(' ')[0] + '_LINE';
    onLinkCustomer(activeCustomer.crmCustomerId, simulatedLineUid, lineName);
    setShowLiffBindModal(false);
    setActionNotice('Successfully bound The 1 Card to LINE! ฿100 Welcome Coupon credited.');
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="w-full lg:w-[380px] xl:w-[410px] shrink-0 flex flex-col bg-[#141b26] border border-slate-800 rounded-2xl p-4 shadow-xl">
      
      {/* Simulation Header & Customer Switcher */}
      <div className="mb-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06c755] animate-pulse" />
            <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
              Customer LINE OA Preview
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
            LIFF v2.21
          </span>
        </div>

        {/* Customer Select dropdown to test different personas */}
        <div className="mt-2 space-y-2">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Simulating Customer Persona:
            </label>
            <select
              id="line-preview-customer-select"
              value={activeCustomer.crmCustomerId}
              onChange={(e) => {
                const found = customers.find(c => c.crmCustomerId === e.target.value);
                if (found) onSelectCustomer(found);
              }}
              className="w-full bg-[#0b0f17] border border-slate-700 text-xs text-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {customers.map(c => (
                <option key={c.crmCustomerId} value={c.crmCustomerId}>
                  {c.fullName} ({c.lineUid ? 'Mapped' : 'UNMAPPED'} - {c.tier})
                </option>
              ))}
            </select>
          </div>

          {/* Simulator View Toggle: Staff Option C (Slash + LIFF) vs. End-Customer View */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0b0f17] rounded-xl border border-slate-800">
            <button
              onClick={() => setSimulatorMode('STAFF_BOT')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                simulatorMode === 'STAFF_BOT'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Staff Mode (Option C + LIFF)</span>
            </button>

            <button
              onClick={() => setSimulatorMode('CUSTOMER')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                simulatorMode === 'CUSTOMER'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Realistic Smartphone Shell */}
      <div className="relative mx-auto w-full max-w-[340px] bg-[#1a212e] rounded-[38px] p-2.5 shadow-2xl border-[6px] border-slate-700 flex flex-col h-[650px] overflow-hidden">
        
        {/* Phone Notch / Island & Status Bar */}
        <div className="bg-slate-900 rounded-t-[28px] pt-1.5 pb-2 px-5 flex items-center justify-between text-[10px] text-slate-400">
          <span>09:41</span>
          <div className="w-20 h-3.5 bg-slate-800 rounded-full flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950/80 mr-2" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
          </div>
          <div className="flex items-center gap-1 font-mono text-[9px]">
            <span>5G</span>
            <span>100%</span>
          </div>
        </div>

        {/* Action toast inside simulator */}
        {actionNotice && (
          <div className="absolute top-16 left-4 right-4 z-40 bg-[#06c755] text-slate-950 text-xs font-semibold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* EITHER STAFF MODE (Option C Slash Command + LIFF Drawer) OR CUSTOMER VIEW */}
        {simulatorMode === 'STAFF_BOT' ? (
          <div className="flex-1 flex flex-col bg-[#697f99] relative overflow-hidden text-xs">
            
            {/* Staff Chat Navigation Bar */}
            <div className="bg-[#242e3f] px-3 py-2 border-b border-slate-700/80 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-xs shadow">
                  T
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold leading-tight">
                      {activeCustomer.fullName.split(' ')[0]} (Chat)
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[9px] text-purple-300 font-medium">
                    Staff 1-on-1 · {activeCustomer.preferredBranch}
                  </span>
                </div>
              </div>

              {/* Instant Drawer Launcher Button */}
              <button
                onClick={() => setShowLiffDetailDrawer(!showLiffDetailDrawer)}
                className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95"
              >
                <Layers className="w-3 h-3 text-white" />
                <span>{showLiffDetailDrawer ? 'Hide LIFF' : 'Open LIFF'}</span>
              </button>
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto text-[11px] bg-[#5a718c]/70">
              <div className="text-center">
                <span className="bg-black/25 text-white px-2 py-0.5 rounded text-[9px] font-mono">
                  Today 14:28
                </span>
              </div>

              {/* Customer message */}
              <div className="flex items-end gap-1.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {activeCustomer.fullName.charAt(0)}
                </div>
                <div className="bg-white text-slate-900 p-2.5 rounded-2xl rounded-bl-xs shadow-md text-[11px] leading-snug">
                  สวัสดีค่ะ มีสินค้าตามแคตตาล็อกที่ส่งมาจัดส่งเย็นนี้ที่คอนโดได้ไหมคะ?
                </div>
              </div>

              {/* Staff runs Slash Command */}
              <div className="flex items-end justify-end gap-1.5 ml-auto max-w-[85%]">
                <div className="bg-purple-950/90 text-purple-200 font-mono px-2.5 py-1 rounded-2xl rounded-br-xs text-[10px] border border-purple-500/50 shadow">
                  {activeSlashCommand}
                </div>
              </div>

              {/* Bot Whisper Card (Option C) */}
              <div className="bg-[#141b27] border border-purple-500/60 rounded-2xl p-2.5 text-white space-y-2 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-slate-700/80">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-bold text-purple-300">Tops CRM Whisper (Staff Only)</span>
                  </div>
                  <span className="text-[9px] font-mono bg-purple-950 text-purple-200 px-1.5 py-0.5 rounded border border-purple-800">
                    ID: {activeCustomer.crmCustomerId}
                  </span>
                </div>

                {/* Quick Info Matrix */}
                <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-[#1a2332] p-2 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[9px]">The 1 Card & Points</span>
                    <strong className="text-amber-400">{the1Points.toLocaleString()} pts</strong>
                    <span className="text-[9px] text-slate-400 ml-1">({activeCustomer.tier})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Lifetime AOV</span>
                    <strong className="text-emerald-400">฿{activeCustomer.aov}</strong>
                    <span className="text-[9px] text-slate-400 ml-1">({activeCustomer.orderCount} orders)</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[9px]">Dietary & Affinities:</span>
                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                      {activeCustomer.dietaryPreferences.map(pref => (
                        <span key={pref} className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[9px] font-medium">
                          #{pref}
                        </span>
                      ))}
                      <span className="text-[9px] text-slate-400">
                        Top: {activeCustomer.topCategories.slice(0, 2).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1-Tap Talking Point / Script Copy */}
                <div className="space-y-1">
                  <div className="text-[9px] text-slate-400 flex items-center justify-between">
                    <span>AI Suggested Reply (Thai):</span>
                    {copiedStaffText && <span className="text-emerald-400 font-bold">✓ Copied!</span>}
                  </div>
                  <button
                    onClick={() => handleCopyStaffScript(sampleStaffScriptTh)}
                    className="w-full text-left p-2 rounded-xl bg-[#0e141e] border border-purple-500/30 hover:border-purple-400 text-slate-200 text-[10px] leading-relaxed transition-all cursor-pointer group"
                  >
                    <p className="line-clamp-2 italic text-slate-300 group-hover:text-white">
                      &quot;{sampleStaffScriptTh}&quot;
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[9px] text-purple-400 font-semibold">
                      <Copy className="w-2.5 h-2.5" />
                      <span>Tap to Copy Response</span>
                    </div>
                  </button>
                </div>

                {/* Call-to-action to trigger LIFF Drawer for deeper details (Option C + A Hybrid) */}
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800">
                  <button
                    id="btn-trigger-liff-drawer"
                    onClick={() => setShowLiffDetailDrawer(true)}
                    className="flex-1 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[10px] rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <ChevronUp className="w-3.5 h-3.5 animate-bounce" />
                    <span>Explore Full Profile in LIFF Drawer</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Bottom Slash Command Input Helper */}
            <div className="p-2 bg-[#1f2837] border-t border-slate-700/80 flex flex-col gap-1.5 shrink-0">
              <div className="flex items-center gap-1 text-[9px] overflow-x-auto pb-0.5 text-slate-300">
                <span className="text-slate-400 shrink-0 font-mono">Shortcuts:</span>
                <button
                  onClick={() => setActiveSlashCommand('/crm profile')}
                  className={`px-1.5 py-0.5 rounded font-mono shrink-0 cursor-pointer ${
                    activeSlashCommand === '/crm profile'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  /crm profile
                </button>
                <button
                  onClick={() => setActiveSlashCommand('/crm promo')}
                  className={`px-1.5 py-0.5 rounded font-mono shrink-0 cursor-pointer ${
                    activeSlashCommand === '/crm promo'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  /crm promo
                </button>
                <button
                  onClick={() => setActiveSlashCommand('/crm history')}
                  className={`px-1.5 py-0.5 rounded font-mono shrink-0 cursor-pointer ${
                    activeSlashCommand === '/crm history'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  /crm history
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={copiedStaffText || activeSlashCommand}
                  onChange={(e) => setActiveSlashCommand(e.target.value)}
                  placeholder="Type /crm or message..."
                  className="flex-1 bg-[#101724] border border-slate-600 text-[10px] text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-400 font-mono"
                />
                <button
                  onClick={() => {
                    setActionNotice(`Executed command: ${activeSlashCommand}`);
                    setTimeout(() => setActionNotice(null), 2500);
                  }}
                  className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* THE LIFF BOTTOM DRAWER (Option A drill-down called from Option C)   */}
            {/* ------------------------------------------------------------------- */}
            {showLiffDetailDrawer && (
              <div className="absolute inset-x-0 bottom-0 bg-[#121824] border-t-2 border-[#06c755] rounded-t-3xl shadow-2xl p-3 flex flex-col gap-2 max-h-[78%] overflow-y-auto z-30 animate-in slide-in-from-bottom duration-200">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#06c755] animate-pulse" />
                    <span className="text-[11px] font-black text-white uppercase tracking-wider">
                      Tops LIFF Deep Copilot
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold">
                      {activeCustomer.tier}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowLiffDetailDrawer(false)}
                    className="text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* The 1 & Financial Glance */}
                <div className="bg-[#1a2332] p-2 rounded-xl border border-slate-800 text-[10px] grid grid-cols-3 gap-1 text-center">
                  <div>
                    <span className="text-slate-400 block text-[9px]">The 1 Balance</span>
                    <span className="font-bold text-amber-300 text-[11px]">{the1Points.toLocaleString()} pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Avg Basket</span>
                    <span className="font-bold text-emerald-400 text-[11px]">฿{activeCustomer.aov}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">RFM Segment</span>
                    <span className="font-bold text-purple-300 text-[10px] truncate block">{activeCustomer.rfmSegment}</span>
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 block font-semibold">Dietary & Health Attributes:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {activeCustomer.dietaryPreferences.map(pref => (
                      <span key={pref} className="px-2 py-0.5 rounded-md bg-[#18202d] border border-slate-700 text-slate-200 text-[9px] font-medium">
                        🌿 {pref}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-md bg-[#18202d] border border-slate-700 text-slate-200 text-[9px]">
                      📍 {activeCustomer.preferredBranch}
                    </span>
                  </div>
                </div>

                {/* Last Purchased Category & Products */}
                <div className="bg-[#0e141f] p-2 rounded-xl border border-slate-800 text-[10px] space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Last Order: {activeCustomer.lastPurchaseDate}</span>
                    </span>
                    <span className="text-emerald-400 font-bold font-mono">฿{activeCustomer.totalSpendLtv.toLocaleString()} LTV</span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Favorite Departments: {activeCustomer.topCategories.join(', ')}
                  </div>
                </div>

                {/* 1-Tap Recommend Cross-Sell Vouchers */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-semibold block">
                    Recommended Upsell Offer (Send directly to chat):
                  </span>
                  <button
                    onClick={() => {
                      setActionNotice(`Sent voucher coupon directly to ${activeCustomer.fullName}!`);
                      setShowLiffDetailDrawer(false);
                    }}
                    className="w-full py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-[10px] rounded-xl flex items-center justify-center gap-1 shadow cursor-pointer transition-all active:scale-95"
                  >
                    <Tag className="w-3 h-3" />
                    <span>Dispatch 15% VIP Grocery Coupon to LINE</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowLiffDetailDrawer(false)}
                  className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] text-center cursor-pointer"
                >
                  Return to Chat Thread
                </button>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* LINE Chat Header */}
        <div className="bg-[#242e3f] px-3 py-2 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white font-extrabold text-xs shadow">
                Tops
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#06c755] rounded-full border-2 border-slate-900 flex items-center justify-center">
                <CheckCircle2 className="w-2 h-2 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-white">Tops Thailand</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-medium">
                  Verified
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Official Account</span>
            </div>
          </div>
          
          <div className="text-right">
            {activeCustomer.lineUid ? (
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> Mapped
              </span>
            ) : (
              <button
                id="btn-liff-open-bind"
                onClick={() => setShowLiffBindModal(true)}
                className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full hover:bg-amber-400 transition-all cursor-pointer animate-bounce"
              >
                + Link The 1
              </button>
            )}
          </div>
        </div>

        {/* Action toast inside simulator */}
        {actionNotice && (
          <div className="absolute top-16 left-4 right-4 z-30 bg-[#06c755] text-slate-950 text-xs font-semibold px-3 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Chat Messages Feed */}
        <div className="flex-1 bg-[#161d28] p-3 overflow-y-auto space-y-3 text-xs">
          
          {/* Welcome / Identity Bubble */}
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              T
            </div>
            <div className="max-w-[85%] bg-[#243042] text-slate-100 rounded-2xl rounded-tl-sm p-3 shadow-md border border-slate-700/50">
              <p className="text-[11px] font-semibold text-emerald-400 mb-1">
                ยินดีต้อนรับสู่ Tops LINE Official Account 🛒
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {activeCustomer.lineUid ? (
                  <>
                    สวัสดีคุณ <strong>{activeCustomer.fullName.split(' ')[0]}</strong>! สถานะสมาชิก The 1 ของคุณคือ 
                    <span className="text-amber-400 font-semibold ml-1">[{activeCustomer.tier}]</span> สาขาประจำของคุณคือ {activeCustomer.preferredBranch}
                  </>
                ) : (
                  <>
                    สวัสดีครับ! บัญชี LINE นี้ยังไม่ได้ผูกกับบัตร The 1 กรุณากดปุ่ม <strong>&quot;Link The 1 Card&quot;</strong> เพื่อรับคูปองเงินสด ฿100 ทันที
                  </>
                )}
              </p>
            </div>
          </div>

          {/* If unmapped, show prominent binding card */}
          {!activeCustomer.lineUid && (
            <div className="bg-gradient-to-br from-blue-900/60 to-indigo-950/80 border border-blue-600/40 rounded-2xl p-3 shadow-lg text-white">
              <div className="flex items-center gap-2 mb-1 text-blue-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Special Welcome Gift: ฿100</span>
              </div>
              <p className="text-[10px] text-blue-100 mb-2">
                ผูกบัตร The 1 กับ LINE รับส่วนลด 100 บาท ทันที พร้อมสะสมคะแนนอัตโนมัติไม่ต้องบอกเบอร์ทุกครั้งที่ชำระเงิน
              </p>
              <button
                id="btn-liff-quick-bind"
                onClick={() => setShowLiffBindModal(true)}
                className="w-full py-1.5 bg-[#06c755] hover:bg-[#05b34c] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>1-Tap Link Membership (LIFF)</span>
              </button>
            </div>
          )}

          {/* Render Push Messages / Flex Messages sent to this customer */}
          {customerLogs.map((log) => {
            const p = log.payload;
            const isClaimed = claimedPromos.includes(p.promoCode);

            return (
              <div key={log.id} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  T
                </div>
                
                {/* LINE Flex Message Card Rendering */}
                <div className="max-w-[92%] bg-[#1f2937] rounded-2xl rounded-tl-sm overflow-hidden border border-slate-700 shadow-xl">
                  {/* Card Banner Header */}
                  <div 
                    className="p-3 text-white"
                    style={{ backgroundColor: p.flexColor || '#10b981' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold tracking-wider bg-black/30 px-1.5 py-0.5 rounded">
                        Tops Personalized
                      </span>
                      <span className="text-[9px] opacity-80">{log.timestamp}</span>
                    </div>
                    <h4 className="font-extrabold text-xs mt-1 text-white leading-snug">
                      {p.titleTh}
                    </h4>
                    <p className="text-[10px] opacity-90">{p.titleEn}</p>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 space-y-2 bg-[#1b2331]">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {p.bodyTh}
                    </p>

                    {p.discountValue && (
                      <div className="bg-[#111722] p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-slate-400 block">Privilege Offer:</span>
                          <span className="text-xs font-bold text-amber-400">{p.discountValue}</span>
                        </div>
                        <span className="font-mono text-[10px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
                          {p.promoCode}
                        </span>
                      </div>
                    )}

                    {/* CTA Button */}
                    <button
                      id={`claim-${log.id}`}
                      disabled={isClaimed}
                      onClick={() => handleClaim(p.promoCode)}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow ${
                        isClaimed
                          ? 'bg-slate-700 text-slate-400 cursor-default'
                          : 'bg-[#06c755] hover:bg-[#05b34c] text-white cursor-pointer active:scale-98'
                      }`}
                    >
                      {isClaimed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Coupon Saved in LINE</span>
                        </>
                      ) : (
                        <>
                          <Tag className="w-3.5 h-3.5" />
                          <span>{p.ctaText || 'Claim Voucher'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        </div>

        {/* LINE Rich Menu (Authentic 6-grid / 4-grid native style) */}
        <div className="bg-[#1f2838] border-t border-slate-700/80 p-1.5">
          <div className="text-[9px] font-semibold text-slate-400 px-1 pb-1 flex items-center justify-between">
            <span>TOPS RICH MENU</span>
            <span className="text-[#06c755] font-mono">LIFF Active</span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center">
            
            {/* Tile 1: Member Card QR */}
            <button
              id="rm-member-qr"
              onClick={() => setActionNotice(`Member Card: ${activeCustomer.the1CardNo || 'Not linked yet'}`)}
              className="bg-[#2a364a] hover:bg-[#324058] p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-400 mb-0.5" />
              <span className="text-[9px] font-medium text-slate-200 leading-tight">My The 1 Card</span>
            </button>

            {/* Tile 2: Weekly Promotions */}
            <button
              id="rm-promotions"
              onClick={() => setActionNotice('Opening Tops Weekly Red Hot Deals catalog...')}
              className="bg-[#2a364a] hover:bg-[#324058] p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
            >
              <Tag className="w-4 h-4 text-rose-400 mb-0.5" />
              <span className="text-[9px] font-medium text-slate-200 leading-tight">Weekly Deals</span>
            </button>

            {/* Tile 3: Quick Reorder Favorites */}
            <button
              id="rm-reorder"
              onClick={() => setActionNotice(`Loading favorites: ${activeCustomer.topCategories[0] || 'Produce'}`)}
              className="bg-[#2a364a] hover:bg-[#324058] p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400 mb-0.5" />
              <span className="text-[9px] font-medium text-slate-200 leading-tight">Reorder</span>
            </button>

            {/* Tile 4: Store Staff Direct Chat */}
            <button
              id="rm-staff-chat"
              onClick={() => setActionNotice(`Connected to ${activeCustomer.preferredBranch} Store Staff!`)}
              className="bg-[#2a364a] hover:bg-[#324058] p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4 text-blue-400 mb-0.5" />
              <span className="text-[9px] font-medium text-slate-200 leading-tight">Staff Chat</span>
            </button>

            {/* Tile 5: E-Receipts & Purchase History */}
            <button
              id="rm-receipts"
              onClick={() => setActionNotice(`Found ${activeCustomer.orderCount} past e-receipts for The 1`)}
              className="bg-[#2a364a] hover:bg-[#324058] p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-purple-400 mb-0.5" />
              <span className="text-[9px] font-medium text-slate-200 leading-tight">E-Receipts</span>
            </button>

            {/* Tile 6: LIFF Binding / Profile */}
            <button
              id="rm-link-account"
              onClick={() => setShowLiffBindModal(true)}
              className={`p-1.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                activeCustomer.lineUid
                  ? 'bg-[#2a364a] hover:bg-[#324058]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <UserCheck className={`w-4 h-4 mb-0.5 ${activeCustomer.lineUid ? 'text-emerald-400' : 'text-white'}`} />
              <span className="text-[9px] font-medium leading-tight">
                {activeCustomer.lineUid ? 'Bound Profile' : 'Link The 1'}
              </span>
            </button>

          </div>
        </div>

          </div>
        )}

      </div>

      {/* LIFF Account Binding Modal Simulation */}
      {showLiffBindModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1c2433] border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold">Tops LIFF Account Binding</h4>
              </div>
              <button
                id="btn-close-liff-modal"
                onClick={() => setShowLiffBindModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePerformBind} className="p-4 space-y-3 text-xs">
              <p className="text-slate-300">
                Link your LINE profile with your Tops / The 1 membership to enjoy personalized grocery deals, e-receipts, and member privileges.
              </p>

              {/* LINE UID Profile Info */}
              <div className="bg-[#111722] p-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center text-white font-bold shrink-0">
                  {activeCustomer.fullName.charAt(0)}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">LINE Identity:</span>
                  <span className="text-xs font-bold text-white">
                    {activeCustomer.lineDisplayName || activeCustomer.fullName}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono block">
                    {activeCustomer.lineUid || 'New LINE OA Follower'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  Mobile Number (เบอร์โทรศัพท์):
                </label>
                <input
                  type="text"
                  value={bindPhone}
                  onChange={(e) => setBindPhone(e.target.value)}
                  className="w-full bg-[#111722] border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  The 1 Card Number (or CRM ID):
                </label>
                <input
                  type="text"
                  value={bindCard || activeCustomer.crmCustomerId}
                  onChange={(e) => setBindCard(e.target.value)}
                  className="w-full bg-[#111722] border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  placeholder="6271-xxxx-xxxx"
                />
              </div>

              {/* PDPA Consent Checkbox (Critical for Thailand!) */}
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdpaAgreed}
                    onChange={(e) => setPdpaAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-300 leading-snug">
                    I consent to Tops (Central Food Retail) processing my transaction history to provide personalized discounts and notifications under Thailand PDPA law.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLiffBindModal(false)}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-liff-binding"
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
