import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  X,
  Copy,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Store,
  CreditCard,
  Tag,
  TrendingUp,
  ShoppingBag,
  CalendarClock,
  Layers,
  Utensils,
  StickyNote,
  History,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Link2,
} from 'lucide-react';
import { CustomerProfile, CustomerTier } from '../types';

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

// ---- Visual mapping helpers -------------------------------------------------

const TIER_STYLES: Record<CustomerTier, { badge: string; card: string; label: string }> = {
  PLATINUM_VIP: {
    badge: 'bg-gradient-to-r from-amber-400/20 to-amber-500/20 text-amber-300 border-amber-400/40',
    card: 'from-[#2a2416] via-[#1c1a12] to-[#111622] border-amber-500/40',
    label: 'Platinum VIP',
  },
  GOLD: {
    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    card: 'from-[#241f12] via-[#1a1810] to-[#111622] border-yellow-500/30',
    label: 'Gold',
  },
  SILVER: {
    badge: 'bg-slate-400/15 text-slate-200 border-slate-400/30',
    card: 'from-[#1e232e] via-[#1a2130] to-[#111622] border-slate-400/30',
    label: 'Silver',
  },
  MEMBER: {
    badge: 'bg-slate-600/20 text-slate-300 border-slate-500/30',
    card: 'from-[#1e232e] via-[#1a2130] to-[#111622] border-slate-600/40',
    label: 'Member',
  },
};

const SEGMENT_STYLES: Record<string, string> = {
  Champions: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Loyal Shoppers': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'Potential Loyalist': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  'At Risk': 'bg-red-500/15 text-red-300 border-red-500/30',
  'Need Attention': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'New Follower': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const TIER_SHORT: Record<CustomerTier, string> = {
  PLATINUM_VIP: 'PLAT',
  GOLD: 'GOLD',
  SILVER: 'SILV',
  MEMBER: 'MEMB',
};

// ---- Search helpers ---------------------------------------------------------

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName;
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

const SegmentBadge: React.FC<{ segment: string; className?: string }> = ({ segment, className = '' }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      SEGMENT_STYLES[segment] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
    } ${className}`}
  >
    {segment}
  </span>
);

const Metric: React.FC<{ label: string; value: React.ReactNode; sub?: string; accent?: string }> = ({
  label,
  value,
  sub,
  accent = 'text-white',
}) => (
  <div className="bg-[#0b0f17] rounded-xl p-3 border border-slate-800">
    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
    <div className={`text-lg font-black mt-0.5 ${accent}`}>{value}</div>
    {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
  </div>
);

const CopyRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono = true }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
      <button
        onClick={copy}
        className="flex items-center gap-1.5 min-w-0 group"
        title="Tap to copy"
      >
        <span className={`text-xs text-slate-100 truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
        {copied ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
        )}
      </button>
    </div>
  );
};

// ---- Main drawer ------------------------------------------------------------

export const CustomerCrmDrawer: React.FC<CustomerCrmDrawerProps> = ({
  open,
  onClose,
  customers,
  onOpenCustomer,
  activeLine,
}) => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedCard, setCopiedCard] = useState(false);

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

  const copyCardNo = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.the1CardNo);
      setCopiedCard(true);
      setTimeout(() => setCopiedCard(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handlePick = (id: string) => setSelectedId(id);

  const handleSetActive = () => {
    if (selected && onOpenCustomer) {
      onOpenCustomer(selected.crmCustomerId);
    }
    onClose();
  };

  const tier = selected ? TIER_STYLES[selected.tier] || TIER_STYLES.MEMBER : TIER_STYLES.MEMBER;

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
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[61] bg-[#0d131f] border-t border-x border-slate-800 rounded-t-3xl shadow-2xl flex flex-col max-h-[55vh]"
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
                {activeLine ? 'Link LINE Account to CRM' : 'Customer CRM Lookup'}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {activeLine
                  ? `Link a customer to ${activeLine.displayName} (${activeLine.lineUid.slice(0, 8)}…)`
                  : selected
                    ? 'Customer profile'
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

        {/* Search bar (list view only) */}
        {!selected && (
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
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* ---- LIST VIEW ---- */}
          {!selected && (
            <div className="p-3 space-y-2">
              {results.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No customers found</p>
                  <p className="text-xs mt-1">Try a different name, phone, or card number.</p>
                </div>
              ) : (
                results.map(c => (
                  <button
                    key={c.crmCustomerId}
                    onClick={() => handlePick(c.crmCustomerId)}
                    className="w-full text-left p-3 rounded-xl bg-[#141c2a] hover:bg-[#182234] border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-3"
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
                ))
              )}
            </div>
          )}

          {/* ---- DETAIL VIEW ---- */}
          {selected && (
            <div className="p-4 space-y-4 pb-2">
              {/* Back + identity */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Back to search"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {selected.lineAvatarUrl ? (
                  <img
                    src={selected.lineAvatarUrl}
                    alt={selected.fullName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-lg">
                    {firstName(selected.fullName).charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-white text-base truncate">{selected.fullName}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[11px] text-slate-400">{selected.crmCustomerId}</span>
                    <SegmentBadge segment={selected.rfmSegment} />
                  </div>
                </div>
              </div>

              {/* Loyalty / The 1 card */}
              <div className={`relative rounded-2xl overflow-hidden p-4 border bg-gradient-to-br ${tier.card}`}>
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs">
                      1
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">The 1 Loyalty Card</div>
                      <div className="text-[9px] text-amber-300/80 uppercase tracking-wider">
                        {tier.label}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={copyCardNo}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-[10px] text-slate-200 hover:bg-black/50"
                    title="Copy card number"
                  >
                    {copiedCard ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCard ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-xl text-white font-black tracking-widest mt-3">
                  {selected.the1CardNo}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-[#141c2a] rounded-2xl p-3.5 border border-slate-800 space-y-2.5">
                <CopyRow label="Phone" value={selected.phone} />
                <CopyRow label="Email" value={selected.email} mono={false} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 shrink-0">Home Store</span>
                  <span className="text-xs text-slate-100 flex items-center gap-1.5 truncate">
                    <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{selected.preferredBranch}</span>
                  </span>
                </div>
              </div>

              {/* CRM metrics */}
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Total Spend (LTV)" value={`฿${selected.totalSpendLtv.toLocaleString()}`} accent="text-emerald-400" />
                <Metric label="Avg Spend (AOV)" value={`฿${selected.aov.toLocaleString()}`} accent="text-amber-300" />
                <Metric label="Orders" value={selected.orderCount} sub="lifetime" />
                <Metric
                  label="Last Purchase"
                  value={`${selected.daysSinceLastPurchase}d`}
                  sub={selected.lastPurchaseDate}
                  accent={selected.daysSinceLastPurchase > 21 ? 'text-red-400' : 'text-white'}
                />
              </div>

              {/* Top categories */}
              <div className="bg-[#141c2a] rounded-2xl p-3.5 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-300">Top Categories</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.topCategories.map(cat => (
                    <span
                      key={cat}
                      className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-[11px] font-medium border border-amber-500/20"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dietary preferences */}
              <div className="bg-[#141c2a] rounded-2xl p-3.5 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2">
                  <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-slate-300">Dietary Preferences</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.dietaryPreferences.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-[11px] font-medium border border-emerald-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent transactions */}
              {selected.transactions.length > 0 && (
                <div className="bg-[#141c2a] rounded-2xl p-3.5 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-2">
                    <History className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-slate-300">Recent Purchases</span>
                  </div>
                  <div className="space-y-2">
                    {selected.transactions.slice(0, 3).map(t => (
                      <div key={t.orderId} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-mono text-slate-300">{t.orderId}</div>
                          <div className="text-[10px] text-slate-500">
                            {t.date} • {t.items.length} items
                          </div>
                        </div>
                        <span className="font-bold text-white shrink-0">฿{t.totalAmount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LINE status + PDPA */}
              <div className="bg-[#141c2a] rounded-2xl p-3.5 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-[#06c755]" />
                    LINE OA
                  </span>
                  {selected.isLineFriend ? (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {selected.lineDisplayName || 'Connected'}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500">Not connected</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    {selected.pdpaConsent ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    PDPA Consent
                  </span>
                  {selected.pdpaConsent ? (
                    <span className="text-[11px] font-bold text-emerald-400">
                      Granted {selected.pdpaConsentDate ? `• ${selected.pdpaConsentDate}` : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-400">Not granted</span>
                  )}
                </div>
              </div>

              {/* Staff notes */}
              {selected.staffNotes && (
                <div className="bg-amber-950/30 rounded-2xl p-3.5 border border-amber-800/40">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300 mb-1.5">
                    <StickyNote className="w-3.5 h-3.5" />
                    <span className="font-semibold">Staff Notes</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{selected.staffNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action bar (detail view only) */}
        {selected && (
          <div className="p-3 border-t border-slate-800 bg-[#0d131f] shrink-0">
            {activeLine ? (
              <button
                onClick={handleSetActive}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Link to {activeLine.displayName}
              </button>
            ) : (
              <button
                onClick={handleSetActive}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Set as Active Customer
              </button>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
};
