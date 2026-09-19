/**
 * Sprint 11 — Performance tab: KPI cards, per-staff + per-branch tables
 * (TanStack Table) and the 14-day response-trend chart (Recharts).
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { flexRender } from '@tanstack/react-table';
import {
  getCoreRowModel,
  useLegacyTable as useReactTable,
  type LegacyColumnDef as ColumnDef,
} from '@tanstack/react-table/legacy';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, Store, Users } from 'lucide-react';
import { adminApi, type AdminMetrics } from './api';

type StaffRow = AdminMetrics['perStaff'][number];
type BranchRow = AdminMetrics['perBranch'][number];

const KpiCard: React.FC<{ label: string; value: string | number; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <div className="bg-[#0d131f] border border-slate-800 rounded-xl p-4">
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`text-2xl font-extrabold mt-1 ${accent ? 'text-[#06c755]' : 'text-white'}`}>
      {value}
    </div>
  </div>
);

function DataTable<T extends object>({
  columns,
  data,
  emptyNote,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  emptyNote?: string;
}) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  if (data.length === 0 && emptyNote) {
    return <div className="text-xs text-slate-500 py-6 text-center">{emptyNote}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[560px]">
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
  );
}

export const Dashboard: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: adminApi.metrics,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
        Failed to load metrics: {error instanceof Error ? error.message : 'unknown error'}
      </div>
    );
  }

  const { kpis, perStaff, perBranch, responseTrend } = data;

  const staffColumns: ColumnDef<StaffRow>[] = [
    {
      accessorKey: 'name',
      header: 'Staff',
      cell: info => <span className="font-bold text-white">{String(info.getValue())}</span>,
    },
    { accessorKey: 'branch', header: 'Branch' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'messages24h', header: 'Msgs 24h' },
    { accessorKey: 'threadsHandled', header: 'Threads' },
    { accessorKey: 'resolved', header: 'Resolved' },
    {
      accessorKey: 'avgFirstResponseMin',
      header: 'Avg 1st resp (min)',
      cell: info => (info.getValue() == null ? '—' : info.getValue()),
    },
  ];

  const branchColumns: ColumnDef<BranchRow>[] = [
    {
      accessorKey: 'branch',
      header: 'Branch',
      cell: info => <span className="font-bold text-white">{String(info.getValue())}</span>,
    },
    { accessorKey: 'threads', header: 'Threads' },
    { accessorKey: 'resolved', header: 'Resolved' },
    {
      accessorKey: 'avgFirstResponseMin',
      header: 'Avg 1st resp (min)',
      cell: info => (info.getValue() == null ? '—' : info.getValue()),
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <KpiCard label="Total threads" value={kpis.totalThreads} />
        <KpiCard label="Active threads" value={kpis.activeThreads} />
        <KpiCard label="Unread" value={kpis.unread} />
        <KpiCard label="Resolved today" value={kpis.resolvedToday} />
        <KpiCard label="Avg first response (min)" value={kpis.avgFirstResponseMin ?? '—'} accent />
        <KpiCard label="Staff messages 24h" value={kpis.staffMessages24h} />
        <KpiCard label="Open tickets" value={kpis.openTickets} accent={kpis.openTickets > 0} />
      </div>

      {/* 14-day response trend */}
      <section className="bg-[#0d131f] border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white mb-3">14-day response trend</h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={responseTrend} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#2a2f3a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tickFormatter={(d: string) => d.slice(5)}
                stroke="#2a2f3a"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="resp"
                stroke="#2a2f3a"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={34}
              />
              <YAxis
                yAxisId="msgs"
                orientation="right"
                stroke="#2a2f3a"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  background: '#0d131f',
                  border: '1px solid #1e293b',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                labelFormatter={(d) => `Day ${String(d).slice(5)}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                yAxisId="resp"
                type="monotone"
                dataKey="avgFirstResponseMin"
                name="Avg first response (min)"
                stroke="#06c755"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="msgs"
                type="monotone"
                dataKey="messages"
                name="Staff messages"
                stroke="#38bdf8"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Per-staff */}
      <section className="bg-[#0d131f] border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          Per-staff performance
        </h3>
        <DataTable
          columns={staffColumns}
          data={perStaff}
          emptyNote="No staff activity yet — replies from the staff inbox will show up here."
        />
      </section>

      {/* Per-branch */}
      <section className="bg-[#0d131f] border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-emerald-400" />
          Per-branch performance
        </h3>
        <DataTable
          columns={branchColumns}
          data={perBranch}
          emptyNote="No branch activity yet."
        />
      </section>
    </div>
  );
};
