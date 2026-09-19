import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  X,
  User,
  CheckCircle2,
  Link2,
  Sparkles,
} from 'lucide-react';
import { CustomerProfile, CustomerTier } from '../types';
import { TIER_STYLES, TIER_SHORT, SegmentBadge, firstName } from './ProfilePanel';

interface CustomerCrmDrawerProps {
  open: boolean;
  onClose: () => void;
  customers: CustomerProfile[];
  onOpenCustomer?: (crmCustomerId: string) => void;
  /**
   * When set, the drawer is in "link" mode: the primary action links the
   * chosen customer's CRM record to this LINE account (maps their lineUid).
   */
  activeLine?: { lineUid: string; displayName: string } | null;
}

// ---- Search helpers ---------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesQuery(c: CustomerProfile, q: string): boolean {
  if (!q) return true;
  const nq = normalize(q);
  const haystack = [
    c.fullName,
    c.crmCustomerId,
    c.the1CardNo,
    c.phone,
    c.email,
    c.lineDisplayName || '',
    c.lineUid || '',
    c.tier,
    c.rfmSegment,
  ]
    .map(normalize)
    .join('|');
  return haystack.includes(nq);
}

// ---- Sub-components ---------------------------------------------------------

const TierBadge: React.FC<{ tier: CustomerTier; className?: string }> = ({ tier, className = '' }) => {
  const s = TIER_STYLES[tier] || TIER_STYLES.MEMBER;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border ${s.badge} ${className}`}>
      {TIER_SHORT[tier]}
    </span>
  );
};

// ---- Main drawer ------------------------------------------------------------
//
// Link-mode sheet: search a customer, tap a candidate to select it, then hit
// the bottom action. No detail view — full profile lives in ProfilePanel,
// which is bound to the thread's own customer.

export const CustomerCrmDrawer: React.FC<CustomerCrmDrawerProps> = ({
  open,
  onClose,
  customers,
  onOpenCustomer,
  activeLine,
}) => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reset transient state each time the drawer opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedId(null);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(
    () => customers.filter(c => matchesQuery(c, query.trim())),
    [customers, query]
  );

  const selected = useMemo(
    () => customers.find(c => c.crmCustomerId === selectedId) || null,
    [customers, selectedId]
  );

  const canAct = Boolean(selected && onOpenCustomer);

  const handleAction = () => {
    if (selected && onOpenCustomer) {
      onOpenCustomer(selected.crmCustomerId);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
        />
      )}

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={open ? { y: 0 } : { y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[61] bg-[#0d131f] border-t border-x border-slate-800 rounded-t-3xl shadow-2xl flex flex-col max-h-[60vh]"
      >
        {/* Grab handle */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm leading-none">
                {activeLine ? 'Link LINE Account to CRM' : 'Find Customer'}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {activeLine
                  ? `Link a customer to ${activeLine.displayName} (${activeLine.lineUid.slice(0, 8)}…)`
                  : selected
                    ? selected.fullName
                    : `${results.length} of ${customers.length} customers`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search name, phone, The 1 card, or LINE ID…"
              className="w-full bg-[#0b0f17] border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No customers found</p>
              <p className="text-xs mt-1">Try a different name, phone, or card number.</p>
            </div>
          ) : (
            results.map(c => {
              const isSelected = c.crmCustomerId === selectedId;
              return (
                <button
                  key={c.crmCustomerId}
                  onClick={() => setSelectedId(c.crmCustomerId)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center gap-3 ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/60'
                      : 'bg-[#141c2a] border-slate-800 hover:bg-[#182234] hover:border-slate-700'
                  }`}
                >
                  <div className="relative shrink-0">
                    {c.lineAvatarUrl ? (
                      <img
                        src={c.lineAvatarUrl}
                        alt={c.fullName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-700"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                        {firstName(c.fullName).charAt(0)}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1">
                      <TierBadge tier={c.tier} />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">{c.fullName}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="font-mono">{c.the1CardNo}</span>
                      <span className="text-slate-600">•</span>
                      <span>{c.phone}</span>
                    </div>
                    <div className="mt-1.5">
                      <SegmentBadge segment={c.rfmSegment} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-emerald-400 font-black text-sm">
                      ฿{c.aov.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wide">Avg Spend</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Action bar */}
        {onOpenCustomer && (
          <div className="p-3 border-t border-slate-800 bg-[#0d131f] shrink-0">
            <button
              onClick={handleAction}
              disabled={!canAct}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                canAct
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {activeLine ? (
                <>
                  <Link2 className="w-4 h-4" />
                  {selected ? `Link to ${activeLine.displayName}` : 'Select a customer to link'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {selected ? 'Set as Active Customer' : 'Select a customer'}
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
};
