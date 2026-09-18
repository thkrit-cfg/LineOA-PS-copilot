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
  Loader2,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  ShoppingBag,
  Layers,
  Inbox,
  RefreshCw,
  Wifi,
  WifiOff,
  Link2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CustomerProfile, CustomerTier, UpsellRecommendation } from '../types';
import { CustomerCrmDrawer } from './CustomerCrmDrawer';
import { RecCard } from './RecCard';
import { getPersonalizedRecommendations } from '../services/recommendationEngine';
import { classifyIntent, nextBestAction, NextBestAction } from '../services/intentEngine';

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
  rfmSegment?: string;
  tier?: CustomerTier;
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

// ---- CRM chip row (compact, shown in thread header) -------------------------
const CrmStrip: React.FC<{ customer: CustomerProfile }> = ({ customer }) => (
  <div className="px-3 pb-2.5 pt-1 space-y-1.5 shrink-0">
    {/* Row 1: identity — segment, tier, The 1 card */}
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      <span
        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
          SEGMENT_BADGE[customer.rfmSegment] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
        }`}
      >
        {customer.rfmSegment}
      </span>
      <span
        className={`shrink-0 px-2 py-1 rounded-full text-[9px] font-black tracking-wider border ${
          TIER_BADGE[customer.tier] || TIER_BADGE.MEMBER
        }`}
      >
        {TIER_LABEL[customer.tier] || customer.tier}
      </span>
      <span className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#0b0f17] border border-slate-800 text-slate-300 flex items-center gap-1">
        <CreditCard className="w-3 h-3 text-slate-500" />
        <span className="font-mono">{customer.the1CardNo}</span>
      </span>
    </div>
    {/* Row 2: key metrics */}
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-[10px] text-slate-400">
      <span className="shrink-0 flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-emerald-400" />
        <span className="text-slate-500">LTV</span>
        <span className="font-bold text-white">{fmtBaht(customer.totalSpendLtv)}</span>
      </span>
      <span className="shrink-0 flex items-center gap-1">
        <ShoppingBag className="w-3 h-3 text-amber-400" />
        <span className="text-slate-500">AOV</span>
        <span className="font-bold text-white">{fmtBaht(customer.aov)}</span>
      </span>
      <span className="shrink-0 flex items-center gap-1">
        <span className="text-slate-500">Orders</span>
        <span className="font-bold text-white">{customer.orderCount}</span>
      </span>
      <span className="shrink-0 flex items-center gap-1">
        <span className="text-slate-500">Last</span>
        <span className={`font-bold ${customer.daysSinceLastPurchase > 21 ? 'text-red-400' : 'text-white'}`}>
          {customer.daysSinceLastPurchase}d
        </span>
      </span>
      {customer.topCategories?.length > 0 && (
        <span className="shrink-0 flex items-center gap-1 text-slate-500">
          <Layers className="w-3 h-3" />
          {customer.topCategories.slice(0, 2).join(', ')}
        </span>
      )}
    </div>
  </div>
);

// ---- Main component ----------------------------------------------------------
export const StaffInbox: React.FC = () => {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [crmOpen, setCrmOpen] = useState(false);
  const [crmMode, setCrmMode] = useState<'view' | 'link'>('view');
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

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setListLoading(true);
    try {
      const res = await fetch('/api/inbox/health');
      const health = await res.json();
      setOnline(health.store === 'upstash' ? health.upstashReachable !== false : true);
      const r = await fetch('/api/inbox/threads');
      const j = await r.json();
      setThreads(Array.isArray(j?.data) ? j.data : []);
      setListError(null);
    } catch (e: any) {
      setOnline(false);
      setListError(e?.message || 'Failed to load inbox');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
    pollRef.current = window.setInterval(() => loadThreads(true), 15000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [loadThreads]);

  const openThread = useCallback(async (lineUid: string) => {
    setActiveUid(lineUid);
    setDetailLoading(true);
    setSendState(null);
    setCrmOpen(false);
    setCrmMode('view');
    setLinkState(null);
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

  const openCrm = useCallback(
    (mode: 'view' | 'link') => {
      setCrmMode(mode);
      setLinkState(null);
      setCrmOpen(true);
    },
    []
  );

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
              <div className="font-bold text-sm text-white truncate">{detail.displayName}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">{detail.lineUid}</div>
            </div>
            {c ? (
              <button
                onClick={() => openCrm('view')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                CRM
              </button>
            ) : (
              <button
                onClick={() => openCrm('link')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1"
              >
                <Link2 className="w-3.5 h-3.5" />
                Link CRM
              </button>
            )}
          </div>
          {c && <CrmStrip customer={c} />}
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
          {detail.messages.length === 0 && (
            <div className="text-center text-slate-600 text-xs py-10">No messages yet</div>
          )}
          {detail.messages.map((m, i) => {
            const mine = m.from === 'staff';
            const prev = detail.messages[i - 1];
            const showTime = !prev || m.ts - prev.ts > 60000;
            const isLastCustomer = !mine && lastCustomerMsg?.id === m.id;
            return (
              <div key={m.id}>
                {showTime && (
                  <div className="text-center text-[10px] text-slate-600 my-2">{fmtFull(m.ts)}</div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${
                      mine
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-[#1a2130] text-slate-100 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <div
                      className={`text-[9px] mt-0.5 flex items-center gap-1 ${
                        mine ? 'text-emerald-200/80 justify-end' : 'text-slate-500'
                      }`}
                    >
                      {fmtTime(m.ts)}
                      {mine && <CheckCheck className="w-3 h-3" />}
                    </div>
                    {isLastCustomer && intentResult && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-400/40 text-indigo-300 text-[9px] font-bold">
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
          <div className="flex items-end gap-2">
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
              className="w-11 h-11 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center"
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
          onOpenCustomer={crmMode === 'link' ? linkCustomer : undefined}
          activeLine={
            crmMode === 'link'
              ? { lineUid: activeUid, displayName: detail.displayName }
              : null
          }
        />
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
        <button
          onClick={() => loadThreads()}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${listLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
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
              {threads.map(t => (
                <button
                  key={t.lineUid}
                  onClick={() => openThread(t.lineUid)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/40 flex items-center gap-3"
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
                      <span className="text-[10px] text-slate-500 shrink-0">{fmtTime(t.lastTs)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 truncate">{t.lastText || '—'}</span>
                      {t.unread > 0 && (
                        <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {t.unread}
                        </span>
                      )}
                    </div>
                    {t.rfmSegment && (
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          SEGMENT_BADGE[t.rfmSegment] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                        }`}
                      >
                        {t.rfmSegment}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
