/**
 * Sprint 11 — Admin Portal shell: login gate (GET /api/admin/me), header bar,
 * tab nav (Performance / Promotions / Tickets). Dark chrome matching StaffInbox.
 */
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { adminApi, type User } from './api';
import { Dashboard } from './Dashboard';
import { Promotions } from './Promotions';
import { Tickets } from './Tickets';

type AdminTab = 'performance' | 'promotions' | 'tickets';

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: 'performance', label: 'Performance' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'tickets', label: 'Tickets' },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

export const AdminPortal: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AdminPortalInner />
  </QueryClientProvider>
);

const AdminPortalInner: React.FC = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('performance');

  const meQuery = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: adminApi.me,
    retry: false,
  });

  if (meQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  const user = meQuery.data?.user ?? null;

  if (!user) {
    return <LoginScreen onLogin={u => qc.setQueryData(['admin', 'me'], { user: u })} />;
  }

  const signOut = async () => {
    try {
      await adminApi.logout();
    } catch {
      /* session already gone */
    }
    qc.setQueryData(['admin', 'me'], null);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-[#0d131f]">
        <div className="px-4 lg:px-6 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-white text-base leading-none truncate">
              Tops LINE CRM — Admin
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">HQ operations console</p>
          </div>
          <div className="hidden md:flex flex-col items-end shrink-0">
            <span className="text-xs font-bold text-white">{user.name}</span>
            <span className="text-[10px] text-slate-500">
              {user.role} · {user.branch}
            </span>
          </div>
          <button
            onClick={signOut}
            className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-[11px] font-bold hover:bg-slate-800 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
        <div className="px-4 lg:px-6 pb-3 overflow-x-auto">
          <div className="flex items-center rounded-lg bg-[#0b0f17] border border-slate-800 p-0.5 w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 lg:p-6">
        {tab === 'performance' && <Dashboard />}
        {tab === 'promotions' && <Promotions />}
        {tab === 'tickets' && <Tickets />}
      </main>
    </div>
  );
};

// ---- Login screen ----------------------------------------------------------------

const LoginScreen: React.FC<{ onLogin: (u: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Demo credentials hint — fetched from a dev-only endpoint that 404s in
  // production, so the /admin page source never contains the email/password.
  const [demo, setDemo] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/demo-credentials')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!cancelled && j && j.email && j.password) setDemo(j);
      })
      .catch(() => {
        /* production or offline — no hint */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const j = await adminApi.login(email.trim(), password);
      onLogin(j.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0d131f] border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base leading-none">
              Tops LINE CRM — Admin
            </h1>
            <p className="text-[10px] text-slate-500 mt-1">HQ operations console</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="username"
            className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="w-full px-4 py-2.5 rounded-lg bg-[#06c755] hover:bg-[#05b34c] disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </button>
        </form>
        {/* Demo-credentials hint: fetched from /api/admin/demo-credentials,
            which 404s in production — so it renders only in local dev and
            the /admin page source never contains the email/password. */}
        {demo && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/30">
            <div className="text-[10px] font-bold text-emerald-300 mb-1">Demo account</div>
            <div className="text-[11px] text-slate-300 font-mono break-all">
              {demo.email} / {demo.password}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
