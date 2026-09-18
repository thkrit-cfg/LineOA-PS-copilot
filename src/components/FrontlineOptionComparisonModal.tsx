import React, { useState } from 'react';
import { 
  Smartphone, 
  Layers, 
  Terminal, 
  Compass, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Copy, 
  Send, 
  ExternalLink, 
  Sparkles, 
  User, 
  Clock, 
  ThumbsUp,
  ArrowRight,
  Tag
} from 'lucide-react';
import { CustomerProfile } from '../types';

interface FrontlineOptionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile;
  onSelectOption?: (optionId: 'OPTION_A' | 'OPTION_B' | 'OPTION_C') => void;
}

export const FrontlineOptionComparisonModal: React.FC<FrontlineOptionComparisonModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [selectedOption, setSelectedOption] = useState<'OPTION_A' | 'OPTION_B' | 'OPTION_C'>('OPTION_C');
  const [activeChatTab, setActiveChatTab] = useState<'CHAT' | 'DRAWER'>('DRAWER'); // for Option A
  const [showOptionCLiffDrawer, setShowOptionCLiffDrawer] = useState(false); // for Option C + A Hybrid
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  if (!isOpen) return null;

  // Approximate The 1 points balance from lifetime spend (8 points per 25 THB spent benchmark)
  const the1Points = Math.round((customer.totalSpendLtv / 25) * 8);

  const sampleStaffScriptTh = customer.dietaryPreferences.includes('Organic')
    ? `สวัสดีค่ะคุณ${customer.fullName.split(' ')[0]} วันนี้มีผักสลัดโครงการหลวงและแซลมอนสดนอร์เวย์เข้าใหม่ รับคู่กับน้ำสลัดญี่ปุ่นเลยไหมคะ?`
    : `สวัสดีค่ะคุณ${customer.fullName.split(' ')[0]} วันนี้สเต็กเนื้อริบอายออสเตรเลียตัดหนาพิเศษเข้าใหม่นะคะ รับซอสสุกี้คิคโคแมนคู่กันเลยไหมคะ?`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(text);
    setTimeout(() => setCopiedScript(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0e141f] border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Top Header Bar */}
        <div className="bg-[#141b26] border-b border-slate-800 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#06c755] to-emerald-600 flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  Frontline Store Staff Mobile UX Architecture
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#06c755]/20 text-[#06c755] border border-[#06c755]/30 text-[10px] font-bold">
                  Interactive 3-Option Comparison
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evaluating real mobile workflow for 1-on-1 LINE OA chatting at Tops branches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Way Selector Pills */}
        <div className="bg-[#101724] border-b border-slate-800 px-5 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setSelectedOption('OPTION_A')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              selectedOption === 'OPTION_A'
                ? 'bg-[#06c755] text-slate-950 shadow-md shadow-emerald-950 font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Option A: LIFF Slide-Up Drawer (In-App)</span>
            <span className="px-1.5 py-0.2 rounded bg-black/20 text-[10px]">Recommended</span>
          </button>

          <button
            onClick={() => setSelectedOption('OPTION_B')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              selectedOption === 'OPTION_B'
                ? 'bg-blue-600 text-white shadow-md font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Option B: Floating Staff Web Companion</span>
            <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px]">Dual-App</span>
          </button>

          <button
            onClick={() => setSelectedOption('OPTION_C')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              selectedOption === 'OPTION_C'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Option C: LINE Bot Quick Commands (/crm)</span>
            <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px]">Text Slash</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (5 Cols): Interactive Mobile Mockup Frame */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            
            <div className="w-[310px] sm:w-[330px] h-[640px] bg-[#121620] border-4 border-slate-700 rounded-[44px] shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-slate-600/50">
              
              {/* Phone Speaker Notch */}
              <div className="w-full bg-[#1c2230] pt-2 pb-1.5 px-6 flex items-center justify-between z-20">
                <span className="text-[11px] font-bold text-slate-300 font-mono">09:41</span>
                <div className="w-16 h-3 bg-[#0a0d14] rounded-full mx-auto" />
                <span className="text-[10px] text-slate-400 font-bold">5G 100%</span>
              </div>

              {/* ---------------------------------------------------- */}
              {/* OPTION A: In-Chat LIFF Slide-Up Drawer Simulation   */}
              {/* ---------------------------------------------------- */}
              {selectedOption === 'OPTION_A' && (
                <div className="flex-1 flex flex-col bg-[#7288a2] relative overflow-hidden">
                  
                  {/* LINE OA Chat Header (Staff View) */}
                  <div className="bg-[#2c3645] px-3 py-2 flex items-center justify-between text-white shrink-0 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                        {customer.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight flex items-center gap-1">
                          <span>{customer.fullName.split(' ')[0]} (Chat)</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <span className="text-[9px] text-slate-300">Tops CentralWorld OA · 1-on-1 Chat</span>
                      </div>
                    </div>

                    {/* LIFF Trigger Button in LINE OA Chat */}
                    <button
                      onClick={() => setActiveChatTab(activeChatTab === 'DRAWER' ? 'CHAT' : 'DRAWER')}
                      className="px-2 py-1 bg-[#06c755] hover:bg-[#05b34c] text-slate-950 font-extrabold rounded-lg text-[10px] flex items-center gap-1 shadow cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-slate-950" />
                      <span>{activeChatTab === 'DRAWER' ? 'Close Card' : 'Tops CRM'}</span>
                    </button>
                  </div>

                  {/* Chat Messages Behind */}
                  <div className="flex-1 p-3 space-y-2.5 overflow-y-auto text-[11px]">
                    <div className="text-center">
                      <span className="bg-black/20 text-white px-2 py-0.5 rounded text-[9px]">Today 14:20</span>
                    </div>

                    {/* Customer bubble */}
                    <div className="flex items-end gap-1.5 max-w-[85%]">
                      <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {customer.fullName.charAt(0)}
                      </div>
                      <div className="bg-white text-slate-800 p-2 rounded-2xl rounded-bl-xs shadow-xs text-[11px]">
                        สวัสดีค่ะ สอบถามมีเนื้อสเต็กออสเตรเลียตัดหนาพร้อมส่งวันนี้ไหมคะ?
                      </div>
                    </div>

                    {/* Staff bubble */}
                    <div className="flex items-end justify-end gap-1.5 ml-auto max-w-[85%]">
                      <div className="bg-[#06c755] text-slate-950 font-medium p-2 rounded-2xl rounded-br-xs shadow-xs text-[11px]">
                        สวัสดีค่ะคุณ{customer.fullName.split(' ')[0]} สักครู่นะคะ เช็กตู้เนื้อสดให้ค่ะ
                      </div>
                    </div>
                  </div>

                  {/* SLIDE-UP LIFF BOTTOM DRAWER (The Core Innovation) */}
                  {activeChatTab === 'DRAWER' && (
                    <div className="absolute inset-x-0 bottom-0 bg-[#141c28] border-t-2 border-[#06c755] rounded-t-3xl shadow-2xl p-3 flex flex-col gap-2 max-h-[72%] overflow-y-auto animate-in slide-in-from-bottom duration-200 z-30">
                      
                      {/* Drawer Handle & Title */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#06c755] animate-pulse" />
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            Tops Frontline Copilot
                          </span>
                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold">
                            {customer.tier}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveChatTab('CHAT')}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 3-Second Essential Glance Strip */}
                      <div className="bg-[#1b2535] p-2 rounded-xl border border-slate-800 text-[10px] grid grid-cols-3 gap-1 text-center">
                        <div>
                          <span className="text-slate-400 block text-[9px]">The 1 Balance</span>
                          <span className="font-bold text-amber-300 text-[11px]">{the1Points.toLocaleString()} pts</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">AOV / Spend</span>
                          <span className="font-bold text-emerald-400 text-[11px]">฿{customer.aov}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">RFM Status</span>
                          <span className="font-bold text-purple-300 text-[10px] truncate block">{customer.rfmSegment}</span>
                        </div>
                      </div>

                      {/* Dietary / Preference Tags */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {customer.dietaryPreferences.map(pref => (
                          <span key={pref} className="px-1.5 py-0.5 rounded-md bg-[#0f1522] border border-slate-700 text-slate-300 text-[9px] font-medium">
                            #{pref}
                          </span>
                        ))}
                      </div>

                      {/* Last Bought Item Reminder */}
                      <div className="bg-[#101724] p-2 rounded-xl border border-slate-800 text-[10px] flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate max-w-[170px]">
                            Last: {customer.transactions[0]?.items[0]?.nameEn || 'Fresh Salmon'}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[9px] font-mono">
                          {customer.transactions[0]?.date.slice(5, 10) || '03-12'}
                        </span>
                      </div>

                      {/* Recommended 1-Tap Upsell Script */}
                      <div className="bg-emerald-950/40 border border-emerald-500/40 p-2 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-emerald-300 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Staff Talking Point (TH)
                          </span>
                          <button
                            onClick={() => handleCopy(sampleStaffScriptTh)}
                            className="text-[#06c755] hover:underline font-bold text-[9px] flex items-center gap-0.5 cursor-pointer"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            {copiedScript ? 'Copied!' : 'Copy to Chat'}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-200 leading-tight">
                          &quot;{sampleStaffScriptTh}&quot;
                        </p>
                      </div>

                      {/* 1-Tap Action: Send Curated Flex Card */}
                      <button
                        onClick={() => handleCopy(`[Tops Special Offer] Gourmet Fresh Salmon + Salad Set for ฿480 (Save ฿100)`)}
                        className="w-full py-1.5 rounded-xl bg-gradient-to-r from-[#06c755] to-emerald-600 text-slate-950 font-black text-[11px] shadow flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-95"
                      >
                        <Send className="w-3 h-3 text-slate-950" />
                        <span>Send Recommended Flex Card to Chat</span>
                      </button>

                    </div>
                  )}

                  {/* Simulated Typing Input */}
                  <div className="p-2 bg-[#1f2837] border-t border-slate-700 flex items-center gap-1.5 shrink-0">
                    <input
                      type="text"
                      readOnly
                      value={copiedScript ? copiedScript : "Type reply to customer..."}
                      className="flex-1 bg-[#10151f] text-slate-200 text-[10px] px-2.5 py-1.5 rounded-full border border-slate-700 outline-none truncate"
                    />
                    <button className="w-7 h-7 rounded-full bg-[#06c755] text-slate-950 flex items-center justify-center shrink-0">
                      <Send className="w-3 h-3" />
                    </button>
                  </div>

                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* OPTION B: Floating Mobile Web Companion Simulation  */}
              {/* ---------------------------------------------------- */}
              {selectedOption === 'OPTION_B' && (
                <div className="flex-1 flex flex-col bg-[#0b0f17] text-white p-3 space-y-2.5 overflow-y-auto">
                  
                  {/* Web Companion Top Header */}
                  <div className="bg-[#141b26] p-2.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-black">
                        T1
                      </div>
                      <div>
                        <div className="text-[11px] font-bold">Tops Staff PWA</div>
                        <span className="text-[9px] text-blue-400 font-mono">tops.internal/staff-copilot</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-bold">
                      Companion Web
                    </span>
                  </div>

                  {/* Fast Customer Mobile Search */}
                  <div className="bg-[#141c28] p-2 rounded-xl border border-slate-800">
                    <span className="text-[9px] text-slate-400 block mb-1">LOOKUP ACTIVE CHATTER:</span>
                    <div className="flex items-center gap-1 bg-[#0b0f17] px-2 py-1 rounded-lg border border-slate-700">
                      <User className="w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        value={`${customer.fullName} (${customer.phone})`}
                        className="bg-transparent text-[10px] text-white font-mono w-full outline-none"
                      />
                    </div>
                  </div>

                  {/* Customer 360 Compact Card */}
                  <div className="bg-[#141c28] border border-slate-800 rounded-2xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-white">{customer.fullName}</div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[9px]">
                        {customer.tier}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="bg-[#0b0f17] p-1.5 rounded-lg">
                        <span className="text-slate-400 block text-[8px]">The 1 Card</span>
                        <span className="font-mono text-slate-200">{customer.the1CardNo}</span>
                      </div>
                      <div className="bg-[#0b0f17] p-1.5 rounded-lg">
                        <span className="text-slate-400 block text-[8px]">Points Balance</span>
                        <span className="font-bold text-amber-300">{the1Points.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-[#0b0f17] p-1.5 rounded-lg text-[9px] text-slate-300 space-y-0.5">
                      <span className="text-slate-400 block text-[8px]">Top Purchased Categories:</span>
                      <div className="font-semibold text-emerald-400 truncate">
                        {customer.topCategories.join(' • ')}
                      </div>
                    </div>
                  </div>

                  {/* Pre-written Copy Responses */}
                  <div className="bg-[#141c28] border border-slate-800 rounded-2xl p-2.5 space-y-2">
                    <span className="text-[10px] font-bold text-blue-400 block">QUICK CHAT SNIPPETS:</span>
                    
                    <button
                      onClick={() => handleCopy(`เรียนคุณ${customer.fullName.split(' ')[0]} ตอนนี้คะแนน The 1 ของคุณมี ${the1Points.toLocaleString()} คะแนน แลกส่วนลดเงินสดได้ ฿${Math.floor(the1Points / 8)} นะคะ`)}
                      className="w-full text-left p-2 rounded-xl bg-[#0b0f17] hover:bg-slate-800 border border-slate-800 text-[9px] text-slate-200 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate pr-1">คะแนนแลกส่วนลดเงินสด</span>
                      <Copy className="w-3 h-3 text-blue-400 shrink-0" />
                    </button>

                    <button
                      onClick={() => handleCopy(sampleStaffScriptTh)}
                      className="w-full text-left p-2 rounded-xl bg-[#0b0f17] hover:bg-slate-800 border border-slate-800 text-[9px] text-slate-200 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate pr-1">แนะนำสินค้าคู่สดใหม่</span>
                      <Copy className="w-3 h-3 text-blue-400 shrink-0" />
                    </button>
                  </div>

                  <div className="text-[9px] text-slate-400 text-center italic mt-auto">
                    Requires staff to switch apps between LINE OA and Safari/Chrome
                  </div>

                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* OPTION C: LINE OA Chat Bot / Quick Slash Command    */}
              {/* ---------------------------------------------------- */}
              {selectedOption === 'OPTION_C' && (
                <div className="flex-1 flex flex-col bg-[#7288a2] relative overflow-hidden">
                  
                  {/* Chat Header */}
                  <div className="bg-[#2c3645] px-3 py-2 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-xs">
                        T
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">Tops CentralWorld (Admin)</div>
                        <span className="text-[9px] text-slate-300">Staff Mode Enabled</span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Thread with Slash Command Bot */}
                  <div className="flex-1 p-3 space-y-2.5 overflow-y-auto text-[11px]">
                    <div className="text-center">
                      <span className="bg-black/20 text-white px-2 py-0.5 rounded text-[9px]">Today 14:21</span>
                    </div>

                    {/* Customer question */}
                    <div className="flex items-end gap-1.5 max-w-[85%]">
                      <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {customer.fullName.charAt(0)}
                      </div>
                      <div className="bg-white text-slate-800 p-2 rounded-2xl rounded-bl-xs shadow-xs text-[11px]">
                        วันนี้มีสลัดโครงการหลวงไหมคะ?
                      </div>
                    </div>

                    {/* Staff types internal command */}
                    <div className="flex items-end justify-end gap-1.5 ml-auto max-w-[85%]">
                      <div className="bg-purple-900 text-purple-100 font-mono p-1.5 rounded-2xl rounded-br-xs text-[10px] border border-purple-500/40">
                        /crm profile
                      </div>
                    </div>

                    {/* Bot Whisper Reply (Only visible to Staff) */}
                    <div className="bg-[#18202d] border border-purple-500/50 rounded-2xl p-2.5 text-white space-y-1.5 shadow-lg">
                      <div className="flex items-center justify-between text-[10px] pb-1 border-b border-slate-700">
                        <span className="font-bold text-purple-400 flex items-center gap-1">
                          <Terminal className="w-3 h-3" /> Bot Whisper (Staff Only)
                        </span>
                        <span className="text-[9px] text-slate-400">ID: {customer.crmCustomerId}</span>
                      </div>

                      <div className="text-[10px] leading-tight space-y-1">
                        <div>
                          <strong className="text-emerald-400">{customer.fullName}</strong> ({customer.tier})
                        </div>
                        <div className="text-slate-300">
                          The 1: <span className="text-amber-300 font-mono">{the1Points.toLocaleString()} pts</span> · LTV: ฿{customer.totalSpendLtv.toLocaleString()}
                        </div>
                        <div className="text-slate-300">
                          Affinity: <span className="text-emerald-300">{customer.dietaryPreferences.join(', ')}</span>
                        </div>
                        <div className="text-slate-300">
                          Top Categories: {customer.topCategories.slice(0, 2).join(', ')}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopy(`เรียนคุณ${customer.fullName.split(' ')[0]} สลัดโครงการหลวงมีสดๆ เข้ามาเช้านี้ค่ะ รับพร้อมน้ำสลัดงาญี่ปุ่นเลยไหมคะ?`)}
                        className="w-full mt-1 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[9px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>Insert Tailored Reply</span>
                      </button>

                      {/* Request: Button to call for LIFF drawer for more detail exploring */}
                      <button
                        onClick={() => setShowOptionCLiffDrawer(true)}
                        className="w-full mt-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-[9px] flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        <Layers className="w-3 h-3 text-slate-950" />
                        <span>Open LIFF Drawer for Deeper Insights</span>
                      </button>
                    </div>

                  </div>

                  {/* LIFF Slide-up Drawer within Option C */}
                  {showOptionCLiffDrawer && (
                    <div className="absolute inset-x-0 bottom-0 bg-[#141c28] border-t-2 border-[#06c755] rounded-t-3xl shadow-2xl p-3 flex flex-col gap-2 max-h-[75%] overflow-y-auto z-30 animate-in slide-in-from-bottom duration-200">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#06c755] animate-pulse" />
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            Tops LIFF Deep Copilot
                          </span>
                          <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-bold">
                            {customer.tier}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowOptionCLiffDrawer(false)}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="bg-[#1b2535] p-2 rounded-xl border border-slate-800 text-[10px] grid grid-cols-3 gap-1 text-center">
                        <div>
                          <span className="text-slate-400 block text-[9px]">The 1 Balance</span>
                          <span className="font-bold text-amber-300 text-[11px]">{the1Points.toLocaleString()} pts</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">AOV / Spend</span>
                          <span className="font-bold text-emerald-400 text-[11px]">฿{customer.aov}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">RFM Status</span>
                          <span className="font-bold text-purple-300 text-[10px] truncate block">{customer.rfmSegment}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {customer.dietaryPreferences.map(pref => (
                          <span key={pref} className="px-1.5 py-0.5 rounded-md bg-[#0f1522] border border-slate-700 text-slate-300 text-[9px] font-medium">
                            🌿 #{pref}
                          </span>
                        ))}
                      </div>

                      <div className="bg-[#101724] p-2 rounded-xl border border-slate-800 text-[10px] flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Last Purchased: {customer.lastPurchaseDate}</span>
                        </div>
                        <span className="text-emerald-400 font-bold font-mono">฿{customer.totalSpendLtv.toLocaleString()} LTV</span>
                      </div>

                      <button
                        onClick={() => {
                          handleCopy(`เรียนคุณ${customer.fullName.split(' ')[0]} Tops ขอมอบคูปองส่วนลดพิเศษ 15% ให้คุณลูกค้านะคะ!`);
                          setShowOptionCLiffDrawer(false);
                        }}
                        className="w-full py-1.5 rounded-xl bg-[#06c755] hover:bg-[#05b34c] text-slate-950 font-black text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Tag className="w-3 h-3" />
                        <span>Dispatch VIP Voucher to Customer</span>
                      </button>
                    </div>
                  )}

                  {/* Typing input */}
                  <div className="p-2 bg-[#1f2837] border-t border-slate-700 flex items-center gap-1.5 shrink-0">
                    <input
                      type="text"
                      readOnly
                      value="/crm profile"
                      className="flex-1 bg-[#10151f] text-purple-300 font-mono text-[10px] px-2.5 py-1.5 rounded-full border border-purple-700/50 outline-none"
                    />
                    <button className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Send className="w-3 h-3" />
                    </button>
                  </div>

                </div>
              )}

            </div>

            <div className="mt-3 text-center">
              <span className="text-[11px] text-slate-400">
                Simulating Mobile View for customer: <strong className="text-white">{customer.fullName}</strong>
              </span>
            </div>
          </div>

          {/* Right Column (7 Cols): Architectural Pros, Cons & Trade-Offs Matrix */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Selected Option Analysis Card */}
            <div className="bg-[#141b26] border border-slate-800 rounded-2xl p-5 space-y-4">
              
              {/* Option Title Banner */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Architecture Evaluation
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-0.5">
                    {selectedOption === 'OPTION_A' && 'Option A: LIFF Slide-Up Drawer Inside LINE OA'}
                    {selectedOption === 'OPTION_B' && 'Option B: Floating Staff Mobile Web Companion (PWA)'}
                    {selectedOption === 'OPTION_C' && 'Option C: LINE OA Chat Bot Slash Command (/crm)'}
                  </h3>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                  selectedOption === 'OPTION_A' ? 'bg-[#06c755]/20 text-[#06c755] border border-[#06c755]/40' :
                  selectedOption === 'OPTION_B' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                  'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}>
                  {selectedOption === 'OPTION_A' && '⭐⭐⭐⭐⭐ Highest Adoption'}
                  {selectedOption === 'OPTION_B' && '⭐⭐⭐ Needs App-Switching'}
                  {selectedOption === 'OPTION_C' && '⭐⭐⭐⭐ Keyboard Heavy'}
                </span>
              </div>

              {/* How Frontline Staff Uses It */}
              <div className="bg-[#101724] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>How Store Staff Uses This on the Shop Floor:</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedOption === 'OPTION_A' && 
                    'Staff is inside the LINE OA Official App chatting 1-on-1 with a customer. They tap a tiny "Tops CRM" button in the chat header or action bar. A clean card slides up from the bottom showing The 1 points, tier, dietary tags, and 1-tap copyable replies without ever leaving the LINE app.'}
                  {selectedOption === 'OPTION_B' && 
                    'Staff keeps a separate browser tab or PWA icon open on their store iPhone/Android. When chatting in LINE OA, they double-tap to switch apps to Tops Staff PWA to view the customer card or search by phone, then copy text and switch back to LINE OA.'}
                  {selectedOption === 'OPTION_C' && 
                    'Staff stays strictly in the LINE OA chat window. They type a slash command (e.g., "/crm" or "/recom"). A Tops webhook bot intercepts the command and returns a private chat whisper card with points, past orders, and instant response buttons.'}
                </p>
              </div>

              {/* Pros and Cons Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Pros */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Operational Advantages</span>
                  </div>
                  <ul className="text-slate-300 space-y-1.5 text-[11px]">
                    {selectedOption === 'OPTION_A' && (
                      <>
                        <li>• <strong>Zero App Switching:</strong> 100% contained within the official LINE app.</li>
                        <li>• <strong>Automatic Customer Context:</strong> Passes the active chatter&apos;s LINE UID automatically.</li>
                        <li>• <strong>Direct Flex Message Dispatch:</strong> 1-click sends rich voucher/product cards straight to customer.</li>
                        <li>• <strong>Super Fast:</strong> Opens in &lt;1 second as a native bottom sheet.</li>
                      </>
                    )}
                    {selectedOption === 'OPTION_B' && (
                      <>
                        <li>• <strong>Independent of LINE App:</strong> Works on any browser or tablet.</li>
                        <li>• <strong>Manual Search Flexibility:</strong> Staff can look up customers by phone or The 1 Card even if not on LINE.</li>
                        <li>• <strong>Simpler Initial Setup:</strong> No LINE Front-end Framework (LIFF) binding required.</li>
                      </>
                    )}
                    {selectedOption === 'OPTION_C' && (
                      <>
                        <li>• <strong>Pure Chat UI:</strong> No web pages, no slide-ups; behaves like a Slack or Discord bot.</li>
                        <li>• <strong>Fast for Power Users:</strong> Staff who type fast can quickly fetch data with keyboard shortcuts.</li>
                        <li>• <strong>Works on Old Phones:</strong> Extremely low memory and CPU requirements.</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Cons / Limitations */}
                <div className="bg-rose-950/20 border border-rose-500/30 p-3 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Operational Trade-offs</span>
                  </div>
                  <ul className="text-slate-300 space-y-1.5 text-[11px]">
                    {selectedOption === 'OPTION_A' && (
                      <>
                        <li>• Requires registering a LIFF App ID in LINE Developers Console.</li>
                        <li>• Only works for customers who initiated chat via LINE OA.</li>
                        <li>• Requires stable mobile data/WiFi on the shop floor.</li>
                      </>
                    )}
                    {selectedOption === 'OPTION_B' && (
                      <>
                        <li>• <strong>App-Switching Fatigue:</strong> Staff hate toggling between LINE and Chrome 40 times a day.</li>
                        <li>• <strong>Manual Typing:</strong> Staff has to type phone number or name instead of auto-detecting chatter.</li>
                        <li>• Higher drop-off in frontline usage.</li>
                      </>
                    )}
                    {selectedOption === 'OPTION_C' && (
                      <>
                        <li>• <strong>Chat Thread Clutter:</strong> Slash commands fill up the chat history.</li>
                        <li>• <strong>Risk of Accidental Disclosure:</strong> Staff must ensure commands are hidden from the customer.</li>
                        <li>• Difficult to display visual product images and complex vouchers.</li>
                      </>
                    )}
                  </ul>
                </div>

              </div>

              {/* Recommendation Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/50 via-emerald-950/40 to-[#141b26] border border-purple-500/40 flex items-start gap-3">
                <ThumbsUp className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-white block">
                    Selected Architecture: Hybrid Option C (Quick Slash Bot) + Option A (LIFF Drawer Drill-Down)
                  </span>
                  <p className="text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                    Staff types <strong>/crm</strong> or uses 1-tap quick command chips right in the 1-on-1 chat for instantaneous customer glance and talking points, with the built-in <strong>&quot;Open LIFF Drawer&quot;</strong> button to slide up the complete customer card, RFM metrics, and basket recommendations when deeper exploration is required.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Quick-Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Click any option pill above to test the interactive phone simulator.
              </span>

              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#06c755] hover:bg-[#05b34c] text-slate-950 font-black text-xs transition-all shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                <span>Confirm Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
