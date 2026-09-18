import React from 'react';
import { 
  AlertTriangle, 
  X, 
  CheckCircle2, 
  DollarSign, 
  ShieldCheck, 
  MapPin, 
  Users, 
  Flame, 
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';

interface OpsStrategicAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpsStrategicAuditModal: React.FC<OpsStrategicAuditModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#161e2b] border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 px-6 py-4 flex items-center justify-between text-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Operations Manager Strategic Audit: &quot;Grill Me&quot; Checklist
              </h3>
              <p className="text-xs text-amber-100 opacity-90">
                6 Critical Operational Blindspots in Thai LINE OA Grocery Retail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-300 text-sm">
                Executive Operations Evaluation
              </h4>
              <p className="text-slate-300 mt-1 leading-relaxed">
                You smartly parked full order integration to focus on <strong>LINE UID to In-House CRM Mapping</strong> and an <strong>Automated Audience Segmentation Engine</strong>. However, executing grocery retail over LINE Official Account in Thailand has unique economic and regulatory pitfalls:
              </p>
            </div>
          </div>

          {/* 6 Key Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. LINE Thailand Billing Economics */}
            <div className="bg-[#111724] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <DollarSign className="w-4 h-4" />
                <span>1. The LINE Broadcast Billing Trap</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>The Risk:</strong> LINE Thailand charges ฿0.04 - ฿0.08 per extra message beyond Pro plan quota. Blasting 500,000 followers blindly costs ฿25,000+ per push.
              </p>
              <div className="bg-[#0b0f17] p-2 rounded-xl text-[10px] text-emerald-400 font-medium">
                ✅ <strong>Solution:</strong> The segmentation engine we built keeps broadcast sizes under 5,000 high-propensity shoppers, slashing LINE bills by &gt;90% while doubling conversions.
              </div>
            </div>

            {/* 2. Thailand PDPA Compliance */}
            <div className="bg-[#111724] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>2. Thailand PDPA Compliance</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>The Risk:</strong> Mapping LINE UID with offline in-store POS baskets and phone numbers creates sensitive behavioral marketing records under Thailand Personal Data Protection Act.
              </p>
              <div className="bg-[#0b0f17] p-2 rounded-xl text-[10px] text-emerald-400 font-medium">
                ✅ <strong>Solution:</strong> Explicit opt-in consent checkboxes and audit timestamps are integrated into the LIFF account binding flow and Data Lake schema.
              </div>
            </div>

            {/* 3. In-Store LIFF Binding Friction */}
            <div className="bg-[#111724] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>3. Checkout Queue LIFF Friction</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>The Risk:</strong> At busy supermarkets like Tops CentralWorld, cashiers cannot hold up the queue for long forms. Long binding steps cause 70% customer drop-off.
              </p>
              <div className="bg-[#0b0f17] p-2 rounded-xl text-[10px] text-emerald-400 font-medium">
                ✅ <strong>Solution:</strong> 15-second fast OTP binding with ฿100 instant cash discount applied directly to the current checkout basket.
              </div>
            </div>

            {/* 4. Hyperlocal Branch & Perishables Inventory Sync */}
            <div className="bg-[#111724] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <MapPin className="w-4 h-4" />
                <span>4. Perishables Inventory & Branch Routing</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>The Risk:</strong> Fresh produce (Royal Project salad, sashimi salmon, Wagyu) has a 3-5 day shelf life. Pushing deals when the customer&apos;s branch is stock-depleted causes churn.
              </p>
              <div className="bg-[#0b0f17] p-2 rounded-xl text-[10px] text-emerald-400 font-medium">
                ✅ <strong>Solution:</strong> The segment engine supports branch-specific triggers so customers only receive deals available at their preferred local branch.
              </div>
            </div>

            {/* 5. Store Staff Attribution & Incentives */}
            <div className="bg-[#111724] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Users className="w-4 h-4" />
                <span>5. Store Staff Referral Attribution</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>The Risk:</strong> If store staff have no incentive or commission tracking, they will forget to invite in-store shoppers to scan the LINE OA QR code.
              </p>
              <div className="bg-[#0b0f17] p-2 rounded-xl text-[10px] text-emerald-400 font-medium">
                ✅ <strong>Solution:</strong> QR codes and link actions embed the Store Staff ID (e.g., STF-BKK-104) to attribute KPI bonuses for account linking.
              </div>
            </div>

            {/* 6. Push Saturation & Unfriend/Block Rates */}
            <div className="bg-[#111724] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                <FileText className="w-4 h-4" />
                <span>6. Push Fatigue & Unfriend Rate (&gt;12%)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong>The Risk:</strong> Customers who receive more than 2-3 push messages per week will block Tops on LINE. Blocked users can never be messaged again.
              </p>
              <div className="bg-[#0b0f17] p-2 rounded-xl text-[10px] text-emerald-400 font-medium">
                ✅ <strong>Solution:</strong> Strict frequency capping: maximum 1 personalized trigger push per customer per 7 days.
              </div>
            </div>

          </div>

          {/* Transition to Enterprise Datalake Checklist */}
          <div className="bg-[#111724] border border-slate-800 rounded-2xl p-4">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Phase 2: Transitioning from Excel POC to Enterprise Cloud Data Lake</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
              <div className="bg-[#0b0f17] p-2.5 rounded-xl border border-slate-800">
                <strong className="text-emerald-400 block mb-1">1. BigQuery / Snowflake CDC</strong>
                Stream POS transactions in near-real-time via Kafka or Cloud Pub/Sub into master tables.
              </div>
              <div className="bg-[#0b0f17] p-2.5 rounded-xl border border-slate-800">
                <strong className="text-emerald-400 block mb-1">2. LINE Messaging Webhooks</strong>
                Deploy Cloud Functions / Cloud Run to process `follow`, `unfollow`, and `beacon` events.
              </div>
              <div className="bg-[#0b0f17] p-2.5 rounded-xl border border-slate-800">
                <strong className="text-emerald-400 block mb-1">3. Automated ML Scoring</strong>
                Train churn prediction & basket affinity models to auto-feed the audience segment engine.
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#111724] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow cursor-pointer"
          >
            Acknowledge & Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
