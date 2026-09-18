import React, { useState } from 'react';
import { 
  Sparkles, 
  Users, 
  Send, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Play, 
  Plus, 
  Filter, 
  Calendar, 
  Tag, 
  AlertCircle,
  BarChart3,
  Layers,
  Percent,
  Check
} from 'lucide-react';
import { CustomerProfile, SegmentRule, PushMessageLog } from '../types';
import { evaluateSegmentRule, executeCampaignTrigger } from '../services/segmentationEngine';
import { DataLakeService } from '../services/dataLakeService';

interface SegmentationHubProps {
  customers: CustomerProfile[];
  rules: SegmentRule[];
  onRulesUpdate: (rules: SegmentRule[]) => void;
  onSendPush: (log: PushMessageLog) => void;
}

export const SegmentationHub: React.FC<SegmentationHubProps> = ({
  customers,
  rules,
  onRulesUpdate,
  onSendPush,
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(rules[0]?.id || '');
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerFeedback, setTriggerFeedback] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New rule form state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('Fresh Produce');
  const [newRuleInactivity, setNewRuleInactivity] = useState(14);
  const [newRuleMinSpend, setNewRuleMinSpend] = useState(1000);
  const [newRuleTitleTh, setNewRuleTitleTh] = useState('');
  const [newRuleBodyTh, setNewRuleBodyTh] = useState('');
  const [newRuleDiscount, setNewRuleDiscount] = useState('15% Off');
  const [newRulePromoCode, setNewRulePromoCode] = useState('FLASH15');

  const activeRule = rules.find(r => r.id === selectedRuleId) || rules[0];
  const evalResult = activeRule ? evaluateSegmentRule(activeRule, customers) : null;

  const handleRunTriggerSimulation = (rule: SegmentRule) => {
    setIsTriggering(true);
    const evaluation = evaluateSegmentRule(rule, customers);
    
    // Send to all matched reachable customers (or first 3 for demo)
    const targets = evaluation.matchedCustomers.slice(0, 3);
    let count = 0;

    targets.forEach((target, i) => {
      setTimeout(() => {
        const log = executeCampaignTrigger(rule, target);
        onSendPush(log);
        count++;
        if (count === targets.length) {
          setIsTriggering(false);
          setTriggerFeedback(
            `Automated trigger fired! Sent personalized LINE Flex card to ${targets.length} matched customers in this segment.`
          );
          setTimeout(() => setTriggerFeedback(null), 5000);
        }
      }, i * 400);
    });

    if (targets.length === 0) {
      setIsTriggering(false);
      setTriggerFeedback('No customers currently match these criteria in the Data Lake.');
      setTimeout(() => setTriggerFeedback(null), 4000);
    }
  };

  const handleToggleAuto = (ruleId: string) => {
    const updated = rules.map(r => {
      if (r.id === ruleId) {
        return { ...r, automatedPushEnabled: !r.automatedPushEnabled };
      }
      return r;
    });
    onRulesUpdate(updated);
    DataLakeService.saveSegments(updated);
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: SegmentRule = {
      id: `SEG-CUSTOM-${Date.now().toString().slice(-4)}`,
      name: newRuleName,
      description: newRuleDesc,
      targetCategory: newRuleCategory,
      minInactivityDays: Number(newRuleInactivity),
      minSpend: Number(newRuleMinSpend),
      triggerEvent: `AUTO_TRIGGER_${newRuleCategory.toUpperCase().replace(/\s+/g, '_')}`,
      automatedPushEnabled: true,
      pushTemplate: {
        titleEn: newRuleName,
        titleTh: newRuleTitleTh || newRuleName,
        bodyEn: `Exclusive offer for ${newRuleCategory} lovers.`,
        bodyTh: newRuleBodyTh || `รับส่วนลดพิเศษเมื่อช้อปสินค้าในหมวด ${newRuleCategory} วันนี้ที่ท็อปส์`,
        promoCode: newRulePromoCode.toUpperCase(),
        discountValue: newRuleDiscount,
        ctaText: 'Use Voucher',
        flexColor: '#10b981',
      }
    };

    const updated = [...rules, newRule];
    onRulesUpdate(updated);
    DataLakeService.saveSegments(updated);
    setSelectedRuleId(newRule.id);
    setShowCreateModal(false);
  };

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-4 overflow-hidden">
      
      {/* Left Column: Segment Rules List */}
      <div className="w-full xl:w-96 shrink-0 bg-[#141b26] border border-slate-800 rounded-2xl p-4 flex flex-col max-h-[750px] shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Automated Audience Segments</span>
            </h3>
            <p className="text-[11px] text-slate-400">Real-time triggers based on grocery behavior</p>
          </div>
          <button
            id="btn-add-segment-rule"
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow"
            title="Create Custom Segment"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Rules Selector */}
        <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
          {rules.map(rule => {
            const isSelected = rule.id === selectedRuleId;
            const evalSummary = evaluateSegmentRule(rule, customers);

            return (
              <div
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
                    : 'bg-[#182130]/70 border-slate-800 hover:bg-[#1e2a3c]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-xs text-white leading-snug">
                    {rule.name}
                  </h4>
                  <span className="bg-slate-800 text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">
                    {evalSummary.audienceSize} Matched
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                  {rule.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>Reachable: <strong className="text-[#06c755]">{evalSummary.lineReachableCount}</strong></span>
                    <span>Cost: <strong className="text-slate-200">฿{evalSummary.estimatedLineBroadcastCostThb}</strong></span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAuto(rule.id);
                    }}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                      rule.automatedPushEnabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {rule.automatedPushEnabled ? 'Auto Active' : 'Manual Only'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Broadcast Sizing Insight */}
        <div className="pt-3 border-t border-slate-800 bg-[#0e141e] -mx-4 -mb-4 p-4 rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
            <span className="font-semibold">LINE Cost Efficiency</span>
            <span className="text-emerald-400 font-bold">~98% Budget Saved</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Targeting dynamic behavioral segments instead of blasting all followers prevents LINE billing penalties and customer block rates.
          </p>
        </div>
      </div>

      {/* Center/Right: Selected Segment Details & Simulation */}
      {activeRule && evalResult && (
        <div className="flex-1 bg-[#141b26] border border-slate-800 rounded-2xl p-4 xl:p-5 overflow-y-auto max-h-[750px] shadow-lg space-y-5">
          
          {/* Top Banner with Trigger Action */}
          <div className="bg-gradient-to-r from-[#172230] to-[#1d2a3d] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  {activeRule.id}
                </span>
                <h2 className="text-base font-extrabold text-white">
                  {activeRule.name}
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {activeRule.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-simulate-trigger"
                onClick={() => handleRunTriggerSimulation(activeRule)}
                disabled={isTriggering}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Play className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
                <span>{isTriggering ? 'Simulating Broadcast...' : 'Fire Real-Time Trigger Now'}</span>
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {triggerFeedback && (
            <div className="bg-[#06c755]/20 border border-[#06c755]/50 text-slate-100 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#06c755] shrink-0" />
              <span>{triggerFeedback}</span>
            </div>
          )}

          {/* Segment Financial & Audience Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            <div className="bg-[#17202e] border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Audience Sizing</span>
              <div className="text-xl font-extrabold text-white mt-1">
                {evalResult.audienceSize} <span className="text-xs font-normal text-slate-400">Shoppers</span>
              </div>
              <span className="text-[10px] text-[#06c755]">{evalResult.lineReachableCount} Reachable via LINE UID</span>
            </div>

            <div className="bg-[#17202e] border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Targeted LINE Push Cost</span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1">
                ฿{evalResult.estimatedLineBroadcastCostThb}
              </div>
              <span className="text-[10px] text-slate-400">@ ฿0.05/message tier</span>
            </div>

            <div className="bg-[#17202e] border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Full Blast Cost (No Seg)</span>
              <div className="text-xl font-extrabold text-rose-400 mt-1">
                ฿{evalResult.sprayAndPrayCostComparisonThb}
              </div>
              <span className="text-[10px] text-slate-400">25,000 follower spray</span>
            </div>

            <div className="bg-[#17202e] border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Projected GMV Basket</span>
              <div className="text-xl font-extrabold text-amber-300 mt-1">
                ฿{evalResult.totalPotentialRevenueThb.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Avg AOV ฿{evalResult.estimatedAovThb.toLocaleString()}</span>
            </div>

          </div>

          {/* LINE Flex Message Template Configuration */}
          <div className="bg-[#182130] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Configured LINE Flex Message Payload
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">Dispatched upon event trigger</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">THAI HEADLINE</span>
                  <p className="font-bold text-slate-100">{activeRule.pushTemplate.titleTh}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">THAI COPYWRITING</span>
                  <p className="text-slate-300 leading-relaxed">{activeRule.pushTemplate.bodyTh}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">ENGLISH HEADLINE</span>
                  <p className="font-bold text-slate-100">{activeRule.pushTemplate.titleEn}</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="bg-[#0f1520] px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">PROMO CODE</span>
                    <span className="font-mono font-bold text-amber-400">{activeRule.pushTemplate.promoCode}</span>
                  </div>
                  <div className="bg-[#0f1520] px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 block">BENEFIT VALUE</span>
                    <span className="font-bold text-emerald-400">{activeRule.pushTemplate.discountValue}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matched Customer Audience Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Audience Members in this Segment ({evalResult.matchedCustomers.length})</span>
              </h3>
              <span className="text-xs text-slate-400">Live evaluation from Excel Data Lake</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#101622] text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">LINE Status</th>
                    <th className="p-3">Tier</th>
                    <th className="p-3">Days Inactive</th>
                    <th className="p-3">AOV</th>
                    <th className="p-3">Top Category</th>
                    <th className="p-3 text-right">Quick Push</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-[#161f2d]">
                  {evalResult.matchedCustomers.map(c => (
                    <tr key={c.crmCustomerId} className="hover:bg-[#1c2738] transition-colors">
                      <td className="p-3 font-semibold text-white">
                        <div>{c.fullName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">{c.crmCustomerId}</span>
                      </td>

                      <td className="p-3">
                        {c.lineUid ? (
                          <span className="text-[#06c755] font-mono text-[10px] flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#06c755]" />
                            {c.lineUid.slice(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[10px] font-medium">Unmapped</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                          {c.tier}
                        </span>
                      </td>

                      <td className="p-3 font-semibold">
                        {c.daysSinceLastPurchase} days
                      </td>

                      <td className="p-3 text-emerald-400 font-mono font-bold">
                        ฿{c.aov}
                      </td>

                      <td className="p-3 text-slate-400 text-[11px]">
                        {c.topCategories[0]}
                      </td>

                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            const log = executeCampaignTrigger(activeRule, c);
                            onSendPush(log);
                            setTriggerFeedback(`Sent 1-to-1 personalized Flex message to ${c.fullName}!`);
                            setTimeout(() => setTriggerFeedback(null), 3500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Push</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Modal to Create New Segment Rule */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1c2433] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between text-white">
              <h4 className="text-sm font-bold">Create Automated Audience Segment</h4>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRule} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Segment Name (EN & TH):</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lapsed Bakery & Dairy Shoppers"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full bg-[#111722] border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Operational Goal / Description:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Re-engage customers who haven't bought bakery goods in 10 days."
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  className="w-full bg-[#111722] border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Category:</label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    className="w-full bg-[#111722] border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                  >
                    <option value="Fresh Produce">Fresh Produce</option>
                    <option value="Butcher & Seafood">Butcher & Seafood</option>
                    <option value="Dairy & Eggs">Dairy & Eggs</option>
                    <option value="Pantry & Staples">Pantry & Staples</option>
                    <option value="Imported Gourmet">Imported Gourmet</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Inactivity Threshold (Days):</label>
                  <input
                    type="number"
                    min={1}
                    value={newRuleInactivity}
                    onChange={(e) => setNewRuleInactivity(Number(e.target.value))}
                    className="w-full bg-[#111722] border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Discount Offer Value:</label>
                  <input
                    type="text"
                    value={newRuleDiscount}
                    onChange={(e) => setNewRuleDiscount(e.target.value)}
                    className="w-full bg-[#111722] border border-slate-700 text-slate-200 rounded-lg p-2 text-xs"
                    placeholder="e.g. ฿80 Off"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Promo Code:</label>
                  <input
                    type="text"
                    value={newRulePromoCode}
                    onChange={(e) => setNewRulePromoCode(e.target.value)}
                    className="w-full bg-[#111722] border border-slate-700 text-slate-200 rounded-lg p-2 text-xs font-mono"
                    placeholder="e.g. FRESH80"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg"
                >
                  Save Segment Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
