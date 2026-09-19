/**
 * Sprint 11 — Tickets tab: staff→HQ question queue. Filter chips (client-side),
 * ticket cards with copyable LINE UID, answer flow (open) and close flow
 * (answered). Open tickets get an unread-style left border accent.
 */
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Clock, Copy, Loader2, Send, Ticket as TicketIcon } from 'lucide-react';
import { adminApi, type TicketStatus, type TicketWithStaff } from './api';
import { fmtDateTime } from './format';

const STATUS_BADGE: Record<TicketStatus, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-amber-500/15 text-amber-300 border-amber-400/40' },
  answered: { label: 'Answered', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40' },
  closed: { label: 'Closed', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};

type Filter = 'all' | TicketStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'answered', label: 'Answered' },
  { id: 'closed', label: 'Closed' },
];

// ---- Single ticket card ------------------------------------------------------------

const TicketCard: React.FC<{ ticket: TicketWithStaff }> = ({ ticket }) => {
  const qc = useQueryClient();
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);

  const answerMutation = useMutation({
    mutationFn: (text: string) => adminApi.answerTicket(ticket.id, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tickets'] }),
  });
  const closeMutation = useMutation({
    mutationFn: () => adminApi.closeTicket(ticket.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tickets'] }),
  });

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(ticket.threadLineUid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const badge = STATUS_BADGE[ticket.status];
  const actionError =
    answerMutation.isError || closeMutation.isError
      ? ((answerMutation.error ?? closeMutation.error) as Error)?.message
      : null;

  return (
    <div
      className={`bg-[#0d131f] border border-slate-800 rounded-xl p-4 ${
        ticket.status === 'open' ? 'border-l-2 border-l-[#06c755]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-white">{ticket.subject}</h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}
            >
              {ticket.status === 'open' && <Clock className="w-2.5 h-2.5" />}
              {ticket.status === 'answered' && <CheckCheck className="w-2.5 h-2.5" />}
              {badge.label}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {ticket.staffName ?? 'Unknown staff'} · {ticket.staffBranch ?? '—'}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">{ticket.body}</p>

      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        <button
          onClick={copyUid}
          title="Copy LINE UID"
          className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#0b0f17] border border-slate-800 text-slate-300 flex items-center gap-1"
        >
          {copied ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Copy className="w-3 h-3 text-slate-500" />
          )}
          <span className="font-mono">{ticket.threadLineUid}</span>
        </button>
        <span className="text-[10px] text-slate-500">Created {fmtDateTime(ticket.createdAt)}</span>
        {ticket.answeredAt && (
          <span className="text-[10px] text-slate-500">Answered {fmtDateTime(ticket.answeredAt)}</span>
        )}
      </div>

      {ticket.status === 'answered' && ticket.answer && (
        <div className="mt-3 rounded-lg bg-[#0b0f17] border border-emerald-500/25 p-3">
          <div className="text-[10px] font-bold text-emerald-300 mb-1">Answer</div>
          <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{ticket.answer}</p>
        </div>
      )}

      {actionError && (
        <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px]">
          {actionError}
        </div>
      )}

      {ticket.status === 'open' && (
        <div className="mt-3 space-y-2">
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={2}
            placeholder="Write an answer for the store…"
            className="w-full resize-none bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex justify-end">
            <button
              onClick={() => answerMutation.mutate(answer.trim())}
              disabled={!answer.trim() || answerMutation.isPending}
              className="px-3 py-1.5 rounded-lg bg-[#06c755] hover:bg-[#05b34c] disabled:opacity-40 text-white text-[11px] font-bold flex items-center gap-1.5"
            >
              {answerMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send answer
            </button>
          </div>
        </div>
      )}

      {ticket.status === 'answered' && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 text-[11px] font-bold flex items-center gap-1.5"
          >
            {closeMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Close ticket
          </button>
        </div>
      )}
    </div>
  );
};

// ---- Main tab -----------------------------------------------------------------------

export const Tickets: React.FC = () => {
  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'tickets'],
    queryFn: () => adminApi.listTickets().then(j => j.data),
    refetchInterval: 15000,
  });
  const [filter, setFilter] = useState<Filter>('all');

  const visible = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);
  const countFor = (f: Filter) =>
    f === 'all' ? tickets.length : tickets.filter(t => t.status === f).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <TicketIcon className="w-4 h-4 text-emerald-400" />
            Tickets
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Questions raised by store staff from the LINE inbox
          </p>
        </div>
        <div className="flex items-center rounded-lg bg-[#0d131f] border border-slate-800 p-0.5">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors whitespace-nowrap ${
                filter === f.id
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label} ({countFor(f.id)})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          Failed to load tickets: {error instanceof Error ? error.message : 'unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
          <TicketIcon className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm text-slate-400 font-semibold">No tickets here</p>
          <p className="text-xs text-slate-600 mt-1">
            When staff raise a question from the inbox, it lands in this queue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(t => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </div>
  );
};
