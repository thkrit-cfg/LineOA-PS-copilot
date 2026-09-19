import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Send,
  Search,
  MessageSquare,
  User,
  Check,
  CheckCheck,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Inbox,
  RefreshCw,
  Wifi,
  WifiOff,
  Link2,
  Sparkles,
  Zap,
  Flame,
  Crown,
  PenLine,
  X,
  Tag,
  Clock,
} from 'lucide-react';
import { CustomerProfile, CustomerTier, UpsellRecommendation, ActivePromotion, PromoType } from '../types';
import { CustomerCrmDrawer } from './CustomerCrmDrawer';
import { ProfilePanel } from './ProfilePanel';
import { RecCard } from './RecCard';
import { getPersonalizedRecommendations } from '../services/recommendationEngine';
import { classifyIntent, nextBestAction, NextBestAction } from '../services/intentEngine';
import { generateReplyDraft } from '../services/replyDraftEngine';
import { DataLakeService } from '../services/dataLakeService';

// ---- API types (mirror docs/inbox-api-contract.md) --------------------------
interface InboxMessage {
  id: string;
  from: 'customer' | 'staff';
  text: string;
  ts: number;
}
interface ThreadSummary {
  lineUid: string;
  customerCrmId: string | null;
  displayName: string;
  avatarUrl?: string;
  isLineFriend: boolean;
  lastText: string;
  lastTs: number;
  unread: number;
  status?: 'active' | 'snoozed' | 'done';
  snoozeUntil?: number;
  rfmSegment?: string;
  tier?: CustomerTier;
  ltv?: number;
  priority?: number;
  priorityFlags?: Array<'high_value' | 'at_risk'>;
}
interface ThreadDetail {
  lineUid: string;
  customerCrmId: string | null;
  displayName: string;
  avatarUrl?: string;
  isLineFriend: boolean;
  messages: InboxMessage[];
  unread: number;
  customer: CustomerProfile | null;
}

const TIER_LABEL: Record<CustomerTier, string> = {
  PLATINUM_VIP: 'Platinum VIP',
  GOLD: 'Gold',
  SILVER: 'Silver',
  MEMBER: 'Member',
};
const TIER_BADGE: Record<CustomerTier, string> = {
  PLATINUM_VIP: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
  GOLD: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',
  SILVER: 'bg-slate-400/15 text-slate-200 border-slate-400/30',
  MEMBER: 'bg-slate-600/20 text-slate-300 border-slate-500/30',
};
const SEGMENT_BADGE: Record<string, string> = {
  Champions: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  'Loyal Shoppers': 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  'Potential Loyalist': 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  'At Risk': 'bg-red-500/15 text-red-300 border-red-400/30',
  'Need Attention': 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  'New Follower': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};
const PROMO_LABEL: Record<PromoType, string> = {
  INSTANT_CASH_VOUCHER: 'Instant cash voucher',
  ONE_GET_ONE_FREE: 'Buy 1 Get 1 Free',
  THE_1_POINTS_X5: 'The 1 Points x5',
  FREE_EXPRESS_DELIVERY: 'Free express delivery',
  BUNDLE_CROSS_SELL: 'Bundle deal',
  CATEGORY_DISCOUNT_15PCT: '15% category discount',
};

function fmtTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function fmtFull(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const fmtBaht = (n: number) => `฿${n.toLocaleString()}`;

// ---- Compact CRM strip (single scrollable row under the thread header) ------
// Tap anywhere → ProfilePanel. Tap the card chip → copy The 1 card number.
const CrmCompactStrip: React.FC<{ customer: CustomerProfile; onOpen: () => void }> = ({
  customer,
  onOpen,
}) => {
  const [copied, setCopied] = useState(false);
  const copyCard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(customer.the1CardNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div
      onClick={onOpen}
      role="button"
      title="Open customer profile"
      className="px-3 pb-2.5 pt-1 shrink-0 cursor-pointer"
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span
          className={`shrink-0 px-2 py-1 rounded-full text-[10px] font-bold border ${
            SEGMENT_BADGE[customer.rfmSegment] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
          }`}
        >
          {customer.rfmSegment}
        </span>
        <button
          onClick={copyCard}
          title="Copy The 1 card number"
          className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#0b0f17] border border-slate-800 text-slate-300 flex items-center gap-1"
        >
          {copied ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          ) : (
            <CreditCard className="w-3 h-3 text-slate-500" />
          )}
          <span className="font-mono">{customer.the1CardNo}</span>
        </button>
        <span className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-500">LTV</span>
          <span className="font-bold text-white">{fmtBaht(customer.totalSpendLtv)}</span>
        </span>
        <span className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400">
          <span className="text-slate-500">Last</span>
          <span className={`font-bold ${customer.daysSinceLastPurchase > 21 ? 'text-red-400' : 'text-white'}`}>
            {customer.daysSinceLastPurchase}d
          </span>
        </span>
        {customer.dietaryPreferences?.slice(0, 2).map(tag => (
          <span
            key={tag}
            className="shrink-0 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-[10px] font-medium border border-emerald-500/20"
          >
            {tag}
          </span>
        ))}
        <span className="shrink-0 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-[10px] font-medium border border-amber-500/20">
          prefers: {PROMO_LABEL[customer.preferredPromoType]}
        </span>
      </div>
    </div>
  );
};

// ---- Main component ----------------------------------------------------------
export const StaffInbox: React.FC = () => {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'snoozed' | 'done'>('all');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [crmOpen, setCrmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkState, setLinkState] = useState<{ ok: boolean; msg?: string } | null>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendState, setSendState] = useState<{ ok: boolean; line: boolean; msg?: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);

  // Load CRM customers once (for the full CRM drawer)
  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(j => setCustomers(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setCustomers([]));
  }, []);

  const loadThreads = useCallback(async (silent = false): Promise<ThreadSummary[]> => {
    if (!silent) setListLoading(true);
    try {
      const res = await fetch('/api/inbox/health');
      const health = await res.json();
      setOnline(health.store === 'neon' ? health.reachable !== false : true);
      const r = await fetch('/api/inbox/threads');
      const j = await r.json();
      const data: ThreadSummary[] = Array.isArray(j?.data) ? j.data : [];
      setThreads(data);
      setListError(null);
      return data;
    } catch (e: any) {
      setOnline(false);
      setListError(e?.message || 'Failed to load inbox');
      return [];
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    // Remember which thread is open so a refresh resumes it.
    // (Only write when set — never clear on mount, or we'd wipe the saved
    //  thread before the mount effect below gets a chance to resume it.)
    if (activeUid) localStorage.setItem('ps-inbox-active', activeUid);
  }, [activeUid]);

  // Persist the unsent composer draft per thread so a refresh keeps it.
  useEffect(() => {
    if (!activeUid) return;
    const key = `ps-inbox-draft:${activeUid}`;
    if (draft) localStorage.setItem(key, draft);
    else localStorage.removeItem(key);
  }, [draft, activeUid]);

  const openThread = useCallback(async (lineUid: string) => {
    setActiveUid(lineUid);
    setDetailLoading(true);
    setSendState(null);
    setCrmOpen(false);
    setProfileOpen(false);
    setLinkState(null);
    setDraftPreview(null);
    // Restore any unsent draft saved for this thread (survives refresh).
    setDraft(localStorage.getItem(`ps-inbox-draft:${lineUid}`) || '');
    try {
      const r = await fetch(`/api/inbox/threads/${lineUid}`);
      const j = await r.json();
      setDetail(j?.data || null);
    } catch (e: any) {
      setDetail(null);
      setListError(e?.message || 'Failed to open thread');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Mount: load the list, then resume the last-open thread after a refresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadThreads();
      if (cancelled) return;
      const saved = localStorage.getItem('ps-inbox-active');
      if (saved) {
        if (data.some(t => t.lineUid === saved)) {
          openThread(saved);
        } else {
          // Saved thread no longer exists — drop the stale reference.
          localStorage.removeItem('ps-inbox-active');
        }
      }
    })();
    pollRef.current = window.setInterval(() => loadThreads(true), 15000);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [loadThreads, openThread]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [detail?.messages.length, activeUid]);

  const sendReply = useCallback(async () => {
    const text = draft.trim();
    if (!text || !activeUid || sending) return;
    setSending(true);
    setSendState(null);
    try {
      const r = await fetch(`/api/inbox/threads/${activeUid}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      if (j?.success) {
        setDraft('');
        setSendState({ ok: true, line: Boolean(j.realLineSuccess) });
        // optimistically append + refresh detail
        setDetail(prev =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  { id: `local-${Date.now()}`, from: 'staff', text, ts: Date.now() },
                ],
              }
            : prev
        );
        loadThreads(true);
      } else {
        setSendState({ ok: false, line: false, msg: j?.error || 'Send failed' });
      }
    } catch (e: any) {
      setSendState({ ok: false, line: false, msg: e?.message || 'Network error' });
    } finally {
      setSending(false);
    }
  }, [draft, activeUid, sending, loadThreads]);

  const totalUnread = useMemo(() => threads.reduce((s, t) => s + (t.unread || 0), 0), [threads]);

  // ---- Sprint 3: value-priority sort (LTV + risk + recency) -----------------
  const [sortMode, setSortMode] = useState<'priority' | 'top_value' | 'recent'>('priority');

  const sortedThreads = useMemo(() => {
    const arr = [...threads];
    if (sortMode === 'top_value') {
      arr.sort((a, b) => (b.ltv ?? 0) - (a.ltv ?? 0) || b.lastTs - a.lastTs);
    } else if (sortMode === 'recent') {
      arr.sort((a, b) => b.lastTs - a.lastTs);
    } else {
      arr.sort((a, b) => {
        const pa = a.priority ?? 0;
        const pb = b.priority ?? 0;
        if (pb !== pa) return pb - pa;
        return b.lastTs - a.lastTs;
      });
    }
    // Status filter (the snooze/done queue).
    if (statusFilter !== 'all') {
      const filtered = arr.filter(t => (t.status || 'active') === statusFilter);
      arr.length = 0;
      arr.push(...filtered);
    }
    // Search: name, LINE uid, CRM id, or last message.
    const q = query.trim().toLowerCase();
    if (q) {
      return arr.filter(t =>
        t.displayName?.toLowerCase().includes(q) ||
        t.lineUid.toLowerCase().includes(q) ||
        (t.customerCrmId && t.customerCrmId.toLowerCase().includes(q)) ||
        t.lastText?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [threads, sortMode, statusFilter, query]);

  // Keyboard nav on the list view: ↑/↓ move, Enter opens, Esc clears search.
  useEffect(() => {
    if (activeUid) return; // only on the list view
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = sortedThreads.length;
        if (!n) return;
        setHighlightIdx(i => {
          const next =
            e.key === 'ArrowDown' ? Math.min(i + 1, n - 1) : Math.max(i - 1, 0);
          // Keep the highlighted row in view.
          requestAnimationFrame(() => {
            listScrollRef.current
              ?.querySelector('[data-hl="1"]')
              ?.scrollIntoView({ block: 'nearest' });
          });
          return next;
        });
      } else if (e.key === 'Enter') {
        if (highlightIdx >= 0 && sortedThreads[highlightIdx]) {
          openThread(sortedThreads[highlightIdx].lineUid);
        }
      } else if (e.key === 'Escape') {
        setQuery('');
        setHighlightIdx(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeUid, sortedThreads, highlightIdx, openThread]);

  // Reset highlight when the visible list changes shape.
  useEffect(() => {
    setHighlightIdx(-1);
  }, [query, statusFilter, sortMode]);

  // ---- Sprint 2: intent + next-best-action (last customer message) ---------
  const lastCustomerMsg = useMemo(() => {
    if (!detail) return null;
    for (let i = detail.messages.length - 1; i >= 0; i--) {
      if (detail.messages[i].from === 'customer') return detail.messages[i];
    }
    return null;
  }, [detail]);

  const intentResult = useMemo(
    () => (lastCustomerMsg ? classifyIntent(lastCustomerMsg.text) : null),
    [lastCustomerMsg]
  );

  const nba: NextBestAction | null = useMemo(
    () => (intentResult ? nextBestAction(intentResult.intent, detail?.customer ?? null) : null),
    [intentResult, detail?.customer]
  );

  // ---- Sprint 1: in-chat copilot recs (mapped customers only) ---------------
  const recs = useMemo(
    () => (detail?.customer ? getPersonalizedRecommendations(detail.customer).slice(0, 3) : []),
    [detail?.customer]
  );

  const insertRec = useCallback((rec: UpsellRecommendation) => {
    const p = rec.product;
    const msg =
      `✨ Suggestion for you: ${p.nameEn} — ${fmtBaht(p.price)}\n` +
      `💡 ${rec.reason}\n` +
      `🏷️ ${rec.suggestedPromo}\n\n` +
      `Reply "YES" and I'll add it to your next order!`;
    setDraft(prev => (prev.trim() ? `${prev.trim()}\n\n${msg}` : msg));
  }, []);

  // ---- On-going promo suggestions (matched to this customer) ---------------
  const promoSuggestions = useMemo(
    () => DataLakeService.suggestPromotions(detail?.customer ?? null, 3),
    [detail?.customer]
  );

  const insertPromo = useCallback((promo: ActivePromotion) => {
    const ends = new Date(promo.endsAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
    const msg =
      `🎁 On-going promo: ${promo.title}\n` +
      `📝 ${promo.description}\n` +
      `🏷️ Code: ${promo.code} (valid until ${ends})\n\n` +
      `Want me to apply it to your next order?`;
    setDraft(prev => (prev.trim() ? `${prev.trim()}\n\n${msg}` : msg));
  }, []);

  // ---- Sprint 5: AI reply drafting (offline-first) --------------------------
  const [draftPreview, setDraftPreview] = useState<string | null>(null);
  const [draftSource, setDraftSource] = useState<'template' | 'llm'>('template');
  const [drafting, setDrafting] = useState(false);

  const makeDraft = useCallback(async () => {
    if (!detail || drafting) return;
    setDrafting(true);
    try {
      const intent = intentResult?.intent ?? 'other';
      // Offline template path — always works, no API key required.
      let result = generateReplyDraft(
        intent,
        detail.customer ?? null,
        lastCustomerMsg?.text || '',
        detail.displayName
      );
      // Optional server path: LLM only when OPENAI_API_KEY is configured,
      // otherwise the endpoint returns the same template draft.
      try {
        const r = await fetch(`/api/inbox/threads/${activeUid}/draft`, { method: 'POST' });
        const j = await r.json();
        if (j?.success && typeof j.text === 'string' && j.text.trim()) {
          result = { text: j.text.trim(), source: j.source === 'llm' ? 'llm' : 'template' };
        }
      } catch {
        // Network/server error → keep the offline template.
      }
      setDraftSource(result.source);
      setDraftPreview(result.text);
    } finally {
      setDrafting(false);
    }
  }, [detail, activeUid, intentResult, lastCustomerMsg, drafting]);

  // Link a CRM customer to the active LINE account (maps their lineUid).
  const linkCustomer = useCallback(
    async (crmCustomerId: string) => {
      if (!activeUid || linking) return;
      setLinking(true);
      setLinkState(null);
      try {
        const r = await fetch(`/api/inbox/threads/${activeUid}/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crmCustomerId }),
        });
        const j = await r.json();
        if (j?.success) {
          setLinkState({ ok: true, msg: 'Customer linked to this LINE account' });
          setCrmOpen(false);
          // refresh thread detail so CRM chips + button update
          await openThread(activeUid);
          loadThreads(true);
        } else {
          setLinkState({ ok: false, msg: j?.error || 'Link failed' });
        }
      } catch (e: any) {
        setLinkState({ ok: false, msg: e?.message || 'Network error' });
      } finally {
        setLinking(false);
      }
    },
    [activeUid, linking, openThread, loadThreads]
  );

  const openCrm = useCallback(() => {
    setLinkState(null);
    setCrmOpen(true);
  }, []);

  // ---- Thread detail view ----------------------------------------------------
  if (activeUid && detail) {
    const c = detail.customer;
    return (
      <div className="h-[100dvh] w-full max-w-md mx-auto flex flex-col bg-[#0b0f17] text-slate-100">
        {/* Header */}
        <div className="border-b border-slate-800 bg-[#0d131f] shrink-0">
          <div className="px-3 py-2.5 flex items-center gap-2.5">
            <button
              onClick={() => {
                setActiveUid(null);
                setDetail(null);
                loadThreads(true);
              }}
              className="p-1.5 -ml-1 rounded-lg hover:bg-slate-800 text-slate-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
              {detail.avatarUrl ? (
                <img src={detail.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-sm text-white truncate">{detail.displayName}</span>
                {c && (
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border ${
                      TIER_BADGE[c.tier] || TIER_BADGE.MEMBER
                    }`}
                  >
                    {TIER_LABEL[c.tier]}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{detail.lineUid}</div>
            </div>
            {!c && (
              <button
                onClick={openCrm}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1"
              >
                <Link2 className="w-3.5 h-3.5" />
                Link CRM
              </button>
            )}
          </div>
          {c && <CrmCompactStrip customer={c} onOpen={() => setProfileOpen(true)} />}
          {c && recs.length > 0 && (
            <div className="px-3 pb-2.5 pt-0.5 shrink-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 mb-1.5">
                <Sparkles className="w-3 h-3" />
                Copilot picks — tap to insert
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {recs.map(rec => (
                  <RecCard key={rec.product.sku} rec={rec} onInsert={insertRec} />
                ))}
              </div>
            </div>
          )}
          {promoSuggestions.length > 0 && (
            <div className="px-3 pb-2.5 pt-0.5 shrink-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 mb-1.5">
                <Tag className="w-3 h-3" />
                On-going promos — tap to offer
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {promoSuggestions.map(({ promo, reason }) => (
                  <button
                    key={promo.id}
                    onClick={() => insertPromo(promo)}
                    className="min-w-[150px] max-w-[170px] shrink-0 text-left rounded-xl bg-[#0b0f17] border border-amber-500/25 hover:border-amber-400/50 px-2.5 py-2 transition-colors"
                  >
                    <div className="text-[11px] font-bold text-white truncate">{promo.title}</div>
                    <div className="mt-0.5 text-[9px] text-slate-500 font-mono">
                      {promo.code} · ends{' '}
                      {new Date(promo.endsAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                    <div className="mt-1 text-[9px] text-amber-300/80 truncate">{reason}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {nba && (
            <div className="px-3 pb-2.5 shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${
                  nba.tone === 'urgent'
                    ? 'bg-red-500/15 text-red-300 border-red-500/40'
                    : nba.tone === 'opportunity'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-500/15 text-slate-300 border-slate-500/40'
                }`}
              >
                <Zap className="w-3 h-3 shrink-0" />
                Next best: {nba.label}
              </span>
            </div>
          )}
          {!c && (
            <div className="px-3 pb-2.5 flex items-center gap-1.5 text-[10px] text-amber-300/80 shrink-0">
              <Link2 className="w-3 h-3" />
              Not linked to CRM — tap “Link CRM” to find this customer by phone or name.
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-[#eae5dc]">
          {detail.messages.length === 0 && (
            <div className="text-center text-slate-500 text-xs py-10">No messages yet</div>
          )}
          {detail.messages.map((m, i) => {
            const mine = m.from === 'staff';
            const prev = detail.messages[i - 1];
            const showTime = !prev || m.ts - prev.ts > 60000;
            const isLastCustomer = !mine && lastCustomerMsg?.id === m.id;
            return (
              <div key={m.id}>
                {showTime && (
                  <div className="text-center text-[10px] text-slate-500 my-2">{fmtFull(m.ts)}</div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                      mine
                        ? 'bg-[#06c755] text-white rounded-br-md'
                        : 'bg-white text-slate-900 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <div
                      className={`text-[9px] mt-0.5 flex items-center gap-1 ${
                        mine ? 'text-white/70 justify-end' : 'text-slate-400'
                      }`}
                    >
                      {fmtTime(m.ts)}
                      {mine && <CheckCheck className="w-3 h-3" />}
                    </div>
                    {isLastCustomer && intentResult && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-300 text-indigo-700 text-[9px] font-bold">
                          {intentResult.label}
                        </span>
                        <span className="text-[9px] text-slate-500">{intentResult.confidence}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {detailLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-slate-800 bg-[#0d131f] px-3 py-2.5 shrink-0">
          {linkState && (
            <div
              className={`text-[11px] mb-2 flex items-center gap-1.5 ${
                linkState.ok ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {linkState.ok ? <Link2 className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {linkState.msg}
            </div>
          )}
          {sendState && (
            <div
              className={`text-[11px] mb-2 flex items-center gap-1.5 ${
                sendState.ok ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {sendState.ok ? <Check className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {sendState.ok
                ? sendState.line
                  ? 'Sent to customer via LINE'
                  : 'Saved (LINE push not configured locally)'
                : sendState.msg}
            </div>
          )}
          {/* Sprint 5: AI draft preview (editable) */}
          {draftPreview !== null && (
            <div className="mb-2 rounded-xl bg-[#0b0f17] border border-emerald-500/30 overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800 bg-emerald-500/[0.06]">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-300">AI draft</span>
                <span className="text-[9px] text-slate-500">{draftSource === 'llm' ? 'LLM' : 'template'}</span>
                <button
                  onClick={() => setDraftPreview(null)}
                  className="ml-auto p-1 rounded hover:bg-slate-800 text-slate-500"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={draftPreview}
                onChange={e => setDraftPreview(e.target.value)}
                rows={3}
                className="w-full resize-none bg-transparent px-3 py-2 text-[13px] text-slate-100 focus:outline-none"
              />
              <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setDraft(prev => (prev.trim() ? `${prev.trim()}\n\n${draftPreview}` : draftPreview));
                    setDraftPreview(null);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Use in composer
                </button>
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={makeDraft}
              disabled={drafting}
              className="w-11 h-11 shrink-0 rounded-full bg-[#0b0f17] border border-slate-700 hover:border-emerald-500 text-emerald-300 flex items-center justify-center disabled:opacity-40"
              title="Draft a reply"
            >
              {drafting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <PenLine className="w-5 h-5" />
              )}
            </button>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
              rows={1}
              placeholder="Type a reply…"
              className="flex-1 resize-none bg-[#0b0f17] border border-slate-700 rounded-2xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 max-h-28"
            />
            <button
              onClick={sendReply}
              disabled={!draft.trim() || sending}
              className="w-11 h-11 shrink-0 rounded-full bg-[#06c755] hover:bg-[#05b34c] disabled:opacity-40 flex items-center justify-center"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        <CustomerCrmDrawer
          open={crmOpen}
          onClose={() => setCrmOpen(false)}
          customers={customers}
          onOpenCustomer={linkCustomer}
          activeLine={{ lineUid: activeUid, displayName: detail.displayName }}
        />
        {c && (
          <ProfilePanel
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            customer={c}
          />
        )}
      </div>
    );
  }

  // ---- Thread list view ------------------------------------------------------
  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto flex flex-col bg-[#0b0f17] text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#0d131f] px-4 py-3 flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
          <Inbox className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="font-extrabold text-white text-base leading-none">Staff Inbox</h1>
          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            {online === false ? (
              <WifiOff className="w-3 h-3 text-amber-400" />
            ) : (
              <Wifi className="w-3 h-3 text-emerald-400" />
            )}
            {totalUnread > 0 ? `${totalUnread} unread` : 'Up to date'}
          </p>
        </div>
        <div className="flex items-center rounded-lg bg-[#0b0f17] border border-slate-800 p-0.5">
          {(
            [
              ['priority', 'Priority'],
              ['top_value', 'Top value'],
              ['recent', 'Recent'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                sortMode === mode
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => loadThreads()}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search + status filter */}
      <div className="border-b border-slate-800/60 bg-[#0b0f17] px-4 py-2 flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, LINE ID, CRM…"
            className="w-full bg-[#0d131f] border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center rounded-lg bg-[#0d131f] border border-slate-800 p-0.5">
          {(
            [
              ['all', 'All'],
              ['active', 'Active'],
              ['snoozed', 'Snoozed'],
              ['done', 'Done'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setStatusFilter(mode)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                statusFilter === mode
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" ref={listScrollRef}>
        {listError && (
          <div className="m-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {listError}
          </div>
        )}
        {listLoading && threads.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <MessageSquare className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-400 font-semibold">No conversations yet</p>
            <p className="text-xs text-slate-600 mt-1">
              When a customer messages your LINE OA, it appears here for you to reply.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            <AnimatePresence>
              {sortedThreads.map((t, idx) => {
                const flags = t.priorityFlags || [];
                const atRisk = flags.includes('at_risk');
                const highValue = flags.includes('high_value');
                const st = t.status || 'active';
                const hl = idx === highlightIdx;
                return (
                <button
                  key={t.lineUid}
                  data-hl={hl ? '1' : undefined}
                  onClick={() => openThread(t.lineUid)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/40 flex items-center gap-3 ${
                    hl ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40' : ''
                  } ${
                    atRisk && !hl ? 'border-l-2 border-l-red-500/70 bg-red-500/[0.04]' : ''
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 relative overflow-hidden">
                    {t.avatarUrl ? (
                      <img src={t.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-300" />
                    )}
                    {t.isLineFriend && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <ShieldCheck className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-white truncate">{t.displayName}</span>
                      <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1.5">
                        {typeof t.priority === 'number' && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-black ${
                              t.priority >= 60
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-400/40'
                                : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                            }`}
                            title="Priority score"
                          >
                            {t.priority}
                          </span>
                        )}
                        {fmtTime(t.lastTs)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 truncate">{t.lastText || '—'}</span>
                      {t.unread > 0 && (
                        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {t.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {st === 'snoozed' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-sky-500/15 text-sky-300 border-sky-400/40">
                          <Clock className="w-2.5 h-2.5" />
                          Snoozed
                        </span>
                      )}
                      {st === 'done' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-slate-500/15 text-slate-400 border-slate-500/30">
                          <CheckCheck className="w-2.5 h-2.5" />
                          Done
                        </span>
                      )}
                      {highValue && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-amber-500/15 text-amber-300 border-amber-400/40">
                          <Crown className="w-2.5 h-2.5" />
                          High value
                        </span>
                      )}
                      {atRisk && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-red-500/15 text-red-300 border-red-400/40">
                          <Flame className="w-2.5 h-2.5" />
                          At risk
                        </span>
                      )}
                      {t.rfmSegment && (
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                            SEGMENT_BADGE[t.rfmSegment] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                          }`}
                        >
                          {t.rfmSegment}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
