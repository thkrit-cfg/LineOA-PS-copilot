/**
 * Sprint 11 — Promotions tab: TanStack Table of all promos with row actions
 * (Edit / Activate-Deactivate / Delete) and a create/edit form (modal).
 */
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { flexRender } from '@tanstack/react-table';
import {
  getCoreRowModel,
  useLegacyTable as useReactTable,
  type LegacyColumnDef as ColumnDef,
} from '@tanstack/react-table/legacy';
import { Loader2, Pencil, Plus, Power, Tag, Trash2, X } from 'lucide-react';
import { adminApi, type Promotion, type PromotionInput } from './api';
import { fmtDay, fmtDateTime, localDayStr, splitCsv } from './format';

const PROMO_TYPE_OPTIONS = [
  'PERCENTAGE_10',
  'PERCENTAGE_15',
  'CATEGORY_DISCOUNT_15PCT',
  'BUY_X_GET_Y',
  'FREE_SHIPPING',
];

const PROMO_TYPE_LABEL: Record<string, string> = {
  PERCENTAGE_10: '10% off',
  PERCENTAGE_15: '15% off',
  CATEGORY_DISCOUNT_15PCT: '15% category discount',
  BUY_X_GET_Y: 'Buy X get Y',
  FREE_SHIPPING: 'Free shipping',
  // legacy/seed types (display only)
  ONE_GET_ONE_FREE: 'Buy 1 get 1 free',
  FREE_EXPRESS_DELIVERY: 'Free express delivery',
  INSTANT_CASH_VOUCHER: 'Instant cash voucher',
  BUNDLE_CROSS_SELL: 'Bundle deal',
  THE_1_POINTS_X5: 'The 1 Points x5',
};

const typeLabel = (t: string) => PROMO_TYPE_LABEL[t] ?? t;

const inputCls =
  'w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500';
const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1';

// ---- Create / edit form ---------------------------------------------------------

const PromoForm: React.FC<{
  initial: Promotion | null;
  onSubmit: (input: PromotionInput) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
}> = ({ initial, onSubmit, busy, error, onClose }) => {
  const [code, setCode] = useState(initial?.code ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [promoType, setPromoType] = useState(initial?.promoType ?? 'PERCENTAGE_10');
  const [categories, setCategories] = useState(initial?.eligibleCategories.join(', ') ?? '');
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? localDayStr(0));
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? localDayStr(14));
  const [minSpend, setMinSpend] = useState(initial?.minSpend != null ? String(initial.minSpend) : '');
  const [maxDiscount, setMaxDiscount] = useState(
    initial?.maxDiscount != null ? String(initial.maxDiscount) : ''
  );
  const [minTier, setMinTier] = useState(initial?.minTier?.join(', ') ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [formError, setFormError] = useState<string | null>(null);

  const typeOptions = useMemo(() => {
    const opts = [...PROMO_TYPE_OPTIONS];
    if (initial && !opts.includes(initial.promoType)) opts.push(initial.promoType);
    return opts;
  }, [initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim() || !startsAt || !endsAt) {
      setFormError('Code, title, start date and end date are required.');
      return;
    }
    if (endsAt < startsAt) {
      setFormError('End date must be on or after the start date.');
      return;
    }
    const spend = minSpend.trim() === '' ? null : Number(minSpend);
    const disc = maxDiscount.trim() === '' ? null : Number(maxDiscount);
    if ((spend !== null && !Number.isFinite(spend)) || (disc !== null && !Number.isFinite(disc))) {
      setFormError('Min spend and max discount must be numbers.');
      return;
    }
    setFormError(null);
    onSubmit({
      code: code.trim(),
      title: title.trim(),
      description: description.trim(),
      promoType,
      eligibleCategories: splitCsv(categories),
      startsAt,
      endsAt,
      minSpend: spend,
      maxDiscount: disc,
      minTier: splitCsv(minTier),
      active,
    });
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Code *</label>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="FRESH15WED" className={`${inputCls} font-mono`} />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select value={promoType} onChange={e => setPromoType(e.target.value)} className={inputCls}>
            {typeOptions.map(t => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="15% Off Organic Vegetables" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="What the offer is, in one line for staff…"
          className={`${inputCls} resize-none`}
        />
      </div>
      <div>
        <label className={labelCls}>Eligible categories (comma-separated)</label>
        <input value={categories} onChange={e => setCategories(e.target.value)} placeholder="Fresh Produce, Dairy & Eggs" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Starts *</label>
          <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelCls}>Ends *</label>
          <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Min spend (฿)</label>
          <input type="number" min={0} value={minSpend} onChange={e => setMinSpend(e.target.value)} placeholder="200" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Max discount (฿)</label>
          <input type="number" min={0} value={maxDiscount} onChange={e => setMaxDiscount(e.target.value)} placeholder="150" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Min tier (comma-separated)</label>
        <input value={minTier} onChange={e => setMinTier(e.target.value)} placeholder="GOLD, PLATINUM_VIP" className={inputCls} />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={e => setActive(e.target.checked)}
          className="accent-[#06c755] w-4 h-4"
        />
        Active (live in the staff inbox)
      </label>
      {(formError || error) && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {formError || error}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-[#06c755] hover:bg-[#05b34c] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {initial ? 'Save changes' : 'Create promotion'}
        </button>
      </div>
    </form>
  );
};

// ---- Main tab ---------------------------------------------------------------------

export const Promotions: React.FC = () => {
  const qc = useQueryClient();
  const { data: promos = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'promotions'],
    queryFn: () => adminApi.listPromotions().then(j => j.data),
    refetchInterval: 15000,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: PromotionInput }) =>
      id ? adminApi.patchPromotion(id, input) : adminApi.createPromotion(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promotions'] }),
  });
  const toggleMutation = useMutation({
    mutationFn: (p: Promotion) => adminApi.patchPromotion(p.id, { active: !p.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promotions'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deletePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'promotions'] }),
  });

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Promotion) => {
    setEditing(p);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const columns: ColumnDef<Promotion>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: info => <span className="font-mono text-[11px] text-emerald-300">{String(info.getValue())}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: info => <span className="font-bold text-white">{String(info.getValue())}</span>,
    },
    {
      accessorKey: 'promoType',
      header: 'Type',
      cell: info => <span className="text-slate-400">{typeLabel(String(info.getValue()))}</span>,
    },
    {
      id: 'window',
      header: 'Window',
      cell: info => {
        const p = info.row.original;
        return (
          <span className="text-slate-400 whitespace-nowrap">
            {fmtDay(p.startsAt)} → {fmtDay(p.endsAt)}
          </span>
        );
      },
    },
    {
      id: 'eligibility',
      header: 'Eligibility',
      cell: info => {
        const p = info.row.original;
        const cats = p.eligibleCategories.length ? p.eligibleCategories.join(', ') : 'All';
        const tiers = p.minTier && p.minTier.length ? ` · min ${p.minTier.join('/')}` : '';
        return (
          <span className="text-slate-400">
            {cats}
            {tiers}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: info => {
        const p = info.row.original;
        return p.active ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/15 text-emerald-300 border-emerald-400/40">
            Active
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-500/15 text-slate-400 border-slate-500/30">
            Inactive
          </span>
        );
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: info => <span className="text-slate-500">{fmtDateTime(String(info.getValue()))}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: info => {
        const p = info.row.original;
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openEdit(p)}
              className="px-2 py-1 rounded-md text-[10px] font-bold border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => toggleMutation.mutate(p)}
              disabled={toggleMutation.isPending}
              className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 disabled:opacity-40 ${
                p.active
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              }`}
            >
              <Power className="w-3 h-3" />
              {p.active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete promo "${p.code}"? This cannot be undone.`)) {
                  deleteMutation.mutate(p.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="px-2 py-1 rounded-md text-[10px] font-bold border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 flex items-center gap-1 disabled:opacity-40"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({ data: promos, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-emerald-400" />
            Promotions
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {promos.length} total · active promos show in the staff inbox
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-3 py-2 rounded-lg bg-[#06c755] hover:bg-[#05b34c] text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New promotion
        </button>
      </div>

      {(saveMutation.isError || toggleMutation.isError || deleteMutation.isError) && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {(saveMutation.error ?? toggleMutation.error ?? deleteMutation.error) instanceof Error
            ? (saveMutation.error ?? toggleMutation.error ?? deleteMutation.error)!.message
            : 'Action failed'}
        </div>
      )}

      <section className="bg-[#0d131f] border border-slate-800 rounded-xl p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            Failed to load promotions: {error instanceof Error ? error.message : 'unknown error'}
          </div>
        ) : promos.length === 0 ? (
          <div className="text-xs text-slate-500 py-8 text-center">
            No promotions yet — create the first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[760px]">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} className="border-b border-slate-800">
                    {hg.headers.map(h => (
                      <th
                        key={h.id}
                        className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-3 py-2.5 whitespace-nowrap text-slate-300">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4">
            <div className="w-full max-w-lg bg-[#0d131f] border border-slate-800 rounded-2xl my-4 md:my-10">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  {editing ? `Edit promotion — ${editing.code}` : 'New promotion'}
                </h3>
                <button
                  onClick={closeForm}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <PromoForm
                key={editing?.id ?? 'new'}
                initial={editing}
                busy={saveMutation.isPending}
                error={saveMutation.isError ? saveMutation.error?.message ?? null : null}
                onClose={closeForm}
                onSubmit={input => saveMutation.mutate({ id: editing?.id ?? null, input })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
