import React, { useState } from 'react';
import { 
  Link2, 
  Unlink, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  Layers,
  Database,
  Smartphone,
  Server,
  UserCheck
} from 'lucide-react';
import { CustomerProfile } from '../types';

interface CrmLineMappingViewProps {
  customers: CustomerProfile[];
  onLink: (crmId: string, lineUid: string, name: string) => void;
  onUnlink: (crmId: string) => void;
}

export const CrmLineMappingView: React.FC<CrmLineMappingViewProps> = ({
  customers,
  onLink,
  onUnlink,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'MAPPED' | 'UNMAPPED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [incomingWebhookSim, setIncomingWebhookSim] = useState<{
    lineUid: string;
    displayName: string;
    phone: string;
  } | null>(null);
  const [matchNotice, setMatchNotice] = useState<string | null>(null);

  const mappedCount = customers.filter(c => c.lineUid).length;
  const unmappedCount = customers.length - mappedCount;
  const mappingRate = customers.length > 0 ? Math.round((mappedCount / customers.length) * 100) : 0;

  const filtered = customers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQ = 
      !q ||
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.the1CardNo.includes(q) ||
      (c.lineUid && c.lineUid.toLowerCase().includes(q));

    if (filterMode === 'MAPPED') return matchesQ && Boolean(c.lineUid);
    if (filterMode === 'UNMAPPED') return matchesQ && !c.lineUid;
    return matchesQ;
  });

  const simulateIncomingWebhook = () => {
    // Generate simulated incoming LINE UID follow event
    const randomHex = Math.random().toString(16).substring(2, 8);
    const unmappedCust = customers.find(c => !c.lineUid);
    const phone = unmappedCust ? unmappedCust.phone : `08${Math.floor(10000000 + Math.random() * 90000000)}`;

    setIncomingWebhookSim({
      lineUid: `U4a89bc${randomHex}99ee7711aa00ff9821`,
      displayName: unmappedCust ? unmappedCust.fullName.split(' ')[0] + '_LINE' : 'LineCustomer_' + randomHex,
      phone,
    });
  };

  const executeAutoMatch = () => {
    if (!incomingWebhookSim) return;
    // Find customer by phone in CRM
    const matched = customers.find(c => c.phone === incomingWebhookSim.phone || c.phone.replace(/-/g, '') === incomingWebhookSim.phone.replace(/-/g, ''));
    
    if (matched) {
      onLink(matched.crmCustomerId, incomingWebhookSim.lineUid, incomingWebhookSim.displayName);
      setMatchNotice(`Automated Identity Match Succeeded: Linked LINE UID to CRM Customer [${matched.fullName}] via verified mobile phone!`);
      setIncomingWebhookSim(null);
    } else {
      setMatchNotice(`No existing CRM account found for phone ${incomingWebhookSim.phone}. Prompted to register new The 1 membership.`);
    }
    setTimeout(() => setMatchNotice(null), 5000);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[750px] pr-1">
      
      {/* Identity Resolution Architecture Diagram */}
      <div className="bg-[#141b26] border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              LINE UID ↔ In-House CRM Identity Resolution Flow
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Deterministic Match via Verified Phone & The 1 Card</span>
        </div>

        {/* Visual Architecture Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          
          <div className="bg-[#192230] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <Smartphone className="w-4 h-4" />
              <span>1. LINE Touchpoint</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Customer adds LINE OA, clicks Rich Menu, or scans store QR code. Emits Webhook with persistent <strong>LINE UID</strong> (33 chars).
            </p>
            <span className="text-[10px] font-mono text-slate-400 mt-2 bg-[#0e141f] p-1 rounded">
              U7c89f0123...
            </span>
          </div>

          <div className="bg-[#192230] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-blue-400 font-bold mb-1">
              <Server className="w-4 h-4" />
              <span>2. LIFF / OTP Match</span>
            </div>
            <p className="text-[11px] text-slate-300">
              LIFF verifies mobile phone number or The 1 membership credentials with SMS OTP and records Thailand <strong>PDPA Consent</strong>.
            </p>
            <span className="text-[10px] font-mono text-emerald-400 mt-2 bg-[#0e141f] p-1 rounded flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> PDPA Consent Logged
            </span>
          </div>

          <div className="bg-[#192230] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-purple-400 font-bold mb-1">
              <Database className="w-4 h-4" />
              <span>3. In-House CRM</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Maps LINE UID to Master Customer ID, pulling lifetime spend, category affinity, preferred branch, and RFM scores.
            </p>
            <span className="text-[10px] font-mono text-slate-400 mt-2 bg-[#0e141f] p-1 rounded">
              CRM-ID: T1-892401
            </span>
          </div>

          <div className="bg-[#192230] p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
              <Zap className="w-4 h-4" />
              <span>4. Targeted Action</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Powers Store Staff upsell recommendations, replenishment alerts, and automated Flex Message push campaigns.
            </p>
            <span className="text-[10px] font-mono text-amber-300 mt-2 bg-[#0e141f] p-1 rounded">
              High-ROI Targeted Push
            </span>
          </div>

        </div>
      </div>

      {/* Webhook Ingestion Simulator & Real-Time Resolution */}
      <div className="bg-[#141b26] border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>LINE Webhook & Identity Matching Simulator</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Test how an incoming LINE follow/scan event matches with in-house customer records
            </p>
          </div>

          <button
            id="btn-simulate-webhook-event"
            onClick={simulateIncomingWebhook}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Simulate Incoming LINE Follow Webhook</span>
          </button>
        </div>

        {/* Active Incoming Webhook Event Simulation Box */}
        {incomingWebhookSim && (
          <div className="mt-3 bg-[#192230] border border-amber-500/40 rounded-xl p-3.5 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Incoming Webhook: event=&apos;follow&apos; / &apos;postback_link&apos;</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">200 OK</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#0f1520] p-2.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">RAW LINE UID:</span>
                <span className="font-mono text-emerald-400 font-bold">{incomingWebhookSim.lineUid}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">LINE DISPLAY NAME:</span>
                <span className="text-white font-semibold">{incomingWebhookSim.displayName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">SUBMITTED PHONE (LIFF):</span>
                <span className="font-mono text-amber-300 font-bold">{incomingWebhookSim.phone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-300">
                Ready to execute deterministic identity resolution against CRM customer table.
              </span>
              <button
                id="btn-execute-automatch"
                onClick={executeAutoMatch}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Execute Deterministic Match</span>
              </button>
            </div>
          </div>
        )}

        {matchNotice && (
          <div className="mt-3 bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{matchNotice}</span>
          </div>
        )}
      </div>

      {/* Customer Mapping Table & Resolution Queue */}
      <div className="bg-[#141b26] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        
        {/* Filter and Metrics Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">
                Customer Identity Resolution Directory
              </h3>
              <p className="text-xs text-slate-400">
                {mappedCount} Linked · {unmappedCount} Unlinked · {mappingRate}% Mapped Coverage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter by Name, Phone, UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0b0f17] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex bg-[#0b0f17] p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterMode === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({customers.length})
              </button>
              <button
                onClick={() => setFilterMode('MAPPED')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterMode === 'MAPPED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mapped ({mappedCount})
              </button>
              <button
                onClick={() => setFilterMode('UNMAPPED')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterMode === 'UNMAPPED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unmapped ({unmappedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#101622] text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">CRM Customer</th>
                <th className="p-3">The 1 Card / Phone</th>
                <th className="p-3">LINE UID Status</th>
                <th className="p-3">PDPA Consent</th>
                <th className="p-3">RFM Segment</th>
                <th className="p-3">Lifetime Spend</th>
                <th className="p-3 text-right">Mapping Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-[#161f2d]">
              {filtered.map(c => (
                <tr key={c.crmCustomerId} className="hover:bg-[#1c2738] transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-white">{c.fullName}</div>
                    <span className="text-[10px] text-slate-400 font-mono">{c.crmCustomerId}</span>
                  </td>

                  <td className="p-3">
                    <div className="font-mono text-slate-200">{c.the1CardNo}</div>
                    <span className="text-[10px] text-slate-400 font-mono">{c.phone}</span>
                  </td>

                  <td className="p-3">
                    {c.lineUid ? (
                      <div>
                        <div className="flex items-center gap-1 text-[#06c755] font-bold text-[11px]">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Bound</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px] block" title={c.lineUid}>
                          {c.lineUid.slice(0, 16)}...
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        Unmapped
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {c.pdpaConsent ? (
                      <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Authorized
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Pending</span>
                    )}
                  </td>

                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                      {c.rfmSegment}
                    </span>
                  </td>

                  <td className="p-3 font-mono font-bold text-slate-200">
                    ฿{c.totalSpendLtv.toLocaleString()}
                  </td>

                  <td className="p-3 text-right">
                    {c.lineUid ? (
                      <button
                        onClick={() => onUnlink(c.crmCustomerId)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 text-[11px] font-semibold border border-slate-700 transition-all cursor-pointer"
                        title="Unlink LINE UID"
                      >
                        <Unlink className="w-3 h-3 inline mr-1" />
                        Unlink
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const mockUid = `U${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`.padEnd(33, '0');
                          onLink(c.crmCustomerId, mockUid, c.fullName.split(' ')[0] + '_LINE');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow inline-flex items-center gap-1"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>Link LINE</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
