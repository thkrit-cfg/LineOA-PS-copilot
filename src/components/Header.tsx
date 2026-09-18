import React from 'react';
import { 
  Store, 
  UserCheck, 
  Database, 
  Users, 
  Sparkles, 
  Smartphone, 
  AlertTriangle,
  FileSpreadsheet,
  Link2
} from 'lucide-react';
import { THAI_BRANCHES, CURRENT_STAFF } from '../data/mockGroceryDataLake';

export type ActiveTab = 'staff_console' | 'segmentation' | 'mapping' | 'datalake';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  showPhonePreview: boolean;
  setShowPhonePreview: (show: boolean) => void;
  onOpenAuditModal: () => void;
  onOpenFrontlineComparison: () => void;
  onOpenLiffView?: () => void;
  mappingRate: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedBranch,
  setSelectedBranch,
  showPhonePreview,
  setShowPhonePreview,
  onOpenAuditModal,
  onOpenFrontlineComparison,
  onOpenLiffView,
  mappingRate,
}) => {
  return (
    <header className="bg-[#141b26] border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-3 shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 max-w-[1600px] mx-auto">
        
        {/* Brand and Context */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 text-white font-bold text-lg">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base lg:text-lg">Tops</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold tracking-wide">
                LINE OA Hub
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] font-medium border border-slate-700">
                POC Data Lake
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Operations & Store Staff Personalization Engine · Thailand
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center overflow-x-auto py-1 scrollbar-none gap-1.5 bg-[#0b0f17] p-1.5 rounded-xl border border-slate-800/80">
          <button
            id="tab-staff-console"
            onClick={() => setActiveTab('staff_console')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'staff_console'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Store Staff Console</span>
          </button>

          <button
            id="tab-segmentation"
            onClick={() => setActiveTab('segmentation')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'segmentation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Audience Segments & Triggers</span>
          </button>

          <button
            id="tab-mapping"
            onClick={() => setActiveTab('mapping')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'mapping'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>LINE UID ↔ CRM Mapping</span>
            <span className="bg-slate-700/80 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {mappingRate}%
            </span>
          </button>

          <button
            id="tab-datalake"
            onClick={() => setActiveTab('datalake')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'datalake'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Data Lake POC</span>
          </button>
        </div>

        {/* Right Actions: Branch selector, Frontline Staff UX, Grill Me audit, and Phone Preview toggle */}
        <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap sm:flex-nowrap">
          {/* Frontline Mobile Comparison Button */}
          <button
            id="btn-frontline-ux-comparison"
            onClick={onOpenFrontlineComparison}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06c755]/15 hover:bg-[#06c755]/25 text-[#06c755] border border-[#06c755]/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Compare Option A, B, and C for frontline staff on mobile phones"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Staff UX (Option A / B / C)</span>
          </button>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-[#0b0f17] px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="branch-selector"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
            >
              {THAI_BRANCHES.map(b => (
                <option key={b} value={b} className="bg-slate-900 text-slate-200">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* "Grill Me" Strategic Ops Audit button */}
          <button
            id="btn-grill-me-audit"
            onClick={onOpenAuditModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
            title="Operational gaps & architect checklist requested in prompt"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Ops Advisory & Grill Me</span>
            <span className="sm:hidden">Audit</span>
          </button>

          {/* Open Native LIFF Mobile View */}
          {onOpenLiffView && (
            <button
              id="btn-open-liff-view"
              onClick={onOpenLiffView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Launch full-screen Tops Digital Member Card & LIFF Drawer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>LIFF Mobile App</span>
            </button>
          )}

          {/* Toggle Customer LINE Phone Simulator */}
          <button
            id="toggle-phone-preview"
            onClick={() => setShowPhonePreview(!showPhonePreview)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
              showPhonePreview 
                ? 'bg-[#06c755]/20 text-[#06c755] border-[#06c755]/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">LINE App Simulator</span>
            <span className={`w-2 h-2 rounded-full ${showPhonePreview ? 'bg-[#06c755]' : 'bg-slate-500'}`} />
          </button>
        </div>

      </div>
    </header>
  );
};
