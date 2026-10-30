import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertCircle, ArrowDownWideNarrow, Check, ChevronLeft, ChevronRight, Clock,
  CreditCard, FileCheck2, FileClock, Filter, LayoutDashboard, LogOut, Phone,
  RefreshCw, Search, Shield, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  supabase,
  FRAUD_TYPE_LABELS,
  FRAUD_TYPE_COLORS,
  STATUS_COLORS,
  type FraudReport,
} from '@/lib/supabase';
import { AdminAuth, ADMIN_SESSION_KEY } from './AdminAuth';
import { AdminAnalytics } from './AdminAnalytics';
import { ContactInbox } from './ContactInbox';

const ADMIN_REVIEWER = 'admin';
const REPORTS_PER_PAGE = 8;
type DashboardSection = 'overview' | 'reports' | 'messages';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export function AdminPanel() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === '1');

  const handleLock = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    void supabase.auth.signOut();
    setUnlocked(false);
  }, []);

  if (!unlocked) return <AdminAuth onSuccess={() => setUnlocked(true)} />;
  return <AdminDashboard onLock={handleLock} />;
}

function AdminDashboard({ onLock }: { onLock: () => void }) {
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState<DashboardSection>('overview');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [fraudTypeFilter, setFraudTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortOldestFirst, setSortOldestFirst] = useState(false);
  const [page, setPage] = useState(0);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const { data, error: requestError } = await supabase
      .from('fraud_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (requestError) {
      setError('Could not load fraud reports. Sign in with an authorized admin account and try again.');
    } else {
      setReports((data ?? []) as FraudReport[]);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const counts = useMemo(() => ({
    all: reports.length,
    pending: reports.filter((report) => report.status === 'pending').length,
    approved: reports.filter((report) => report.status === 'approved').length,
    rejected: reports.filter((report) => report.status === 'rejected').length,
  }), [reports]);

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reports
      .filter((report) => statusFilter === 'all' || report.status === statusFilter)
      .filter((report) => fraudTypeFilter === 'all' || report.fraud_type === fraudTypeFilter)
      .filter((report) => !normalizedQuery || [report.identifier, report.description, report.reporter_name ?? ''].some((value) => value.toLowerCase().includes(normalizedQuery)))
      .sort((a, b) => sortOldestFirst
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reports, statusFilter, fraudTypeFilter, query, sortOldestFirst]);

  const pageCount = Math.max(1, Math.ceil(filteredReports.length / REPORTS_PER_PAGE));
  const visibleReports = filteredReports.slice(page * REPORTS_PER_PAGE, (page + 1) * REPORTS_PER_PAGE);

  const changeFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(0);
  };

  const review = async (id: string, decision: 'approve' | 'reject') => {
    setAction(id);
    setError('');
    const { error: actionError } = await supabase.rpc(decision === 'approve' ? 'approve_fraud_report' : 'reject_fraud_report', {
      p_report_id: id,
      p_admin_email: ADMIN_REVIEWER,
    });
    if (actionError) {
      setError(`Could not ${decision} this report. Please try again.`);
      setAction(null);
      return;
    }
    await loadReports();
    setAction(null);
  };

  const navItems: { id: DashboardSection; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'reports', label: 'Fraud reports', icon: FileCheck2, count: counts.pending },
    { id: 'messages', label: 'Contact inbox', icon: Clock },
  ];

  return (
    <div className="min-w-0 space-y-6 pb-10">
      <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg shadow-slate-900/10">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950"><Shield className="h-6 w-6" /></div>
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Trust & Safety</p><h1 className="mt-0.5 text-xl font-bold sm:text-2xl">Admin workspace</h1><p className="mt-1 text-xs text-slate-400">Review reports, monitor searches and respond to users.</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadReports()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span></button>
            <button type="button" onClick={onLock} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-2 sm:px-5" aria-label="Admin sections">
          {navItems.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" onClick={() => setSection(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${section === id ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="h-4 w-4" />{label}{count !== undefined && <span className={`rounded-full px-2 py-0.5 text-[11px] ${section === id ? 'bg-amber-100 text-amber-900' : 'bg-white/10 text-white'}`}>{count}</span>}</button>)}
        </nav>
      </header>

      {error && <div role="alert" className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {section === 'overview' && <>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Report status summary">
          <SummaryCard label="Awaiting review" value={counts.pending} icon={FileClock} tone="amber" onClick={() => { changeFilter('pending'); setSection('reports'); }} />
          <SummaryCard label="Approved" value={counts.approved} icon={Check} tone="emerald" onClick={() => { changeFilter('approved'); setSection('reports'); }} />
          <SummaryCard label="Rejected" value={counts.rejected} icon={X} tone="rose" onClick={() => { changeFilter('rejected'); setSection('reports'); }} />
          <SummaryCard label="All reports" value={counts.all} icon={FileCheck2} tone="indigo" onClick={() => { changeFilter('all'); setSection('reports'); }} />
        </section>
        <AdminAnalytics />
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Action needed</p><h2 className="mt-1 text-lg font-bold text-slate-900">Reports awaiting review</h2></div><button type="button" onClick={() => { changeFilter('pending'); setSection('reports'); }} className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">View review queue <ChevronRight className="ml-1 inline h-4 w-4" /></button></div>
          {loading ? <LoadingState /> : counts.pending === 0 ? <EmptyState text="You’re all caught up. No reports need review." /> : <div className="grid gap-3 lg:grid-cols-2">{reports.filter((report) => report.status === 'pending').slice(0, 4).map((report) => <ReportCard key={report.id} report={report} onReview={review} isActioning={action === report.id} compact />)}</div>}
        </section>
      </>}

      {section === 'reports' && <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Moderation</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Fraud report queue</h2><p className="mt-1 text-sm text-slate-500">Search, filter, review evidence, then approve or reject each report.</p></div>
          <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">{numberFormat.format(filteredReports.length)} results</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block"><span className="sr-only">Search reports</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search phone, UPI ID, description or reporter" className="h-11 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm text-slate-500"><Filter className="h-4 w-4" /><select aria-label="Filter by fraud type" value={fraudTypeFilter} onChange={(event) => { setFraudTypeFilter(event.target.value); setPage(0); }} className="min-w-28 bg-transparent font-medium text-slate-700 outline-none"><option value="all">All types</option>{Object.entries(FRAUD_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <button type="button" onClick={() => setSortOldestFirst((current) => !current)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowDownWideNarrow className="h-4 w-4" />{sortOldestFirst ? 'Oldest first' : 'Newest first'}</button>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto border-b border-slate-100 pb-2">{(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map((filter) => <button key={filter} type="button" onClick={() => changeFilter(filter)} className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold capitalize ${statusFilter === filter ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{filter === 'all' ? 'All reports' : filter}<span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${statusFilter === filter ? 'bg-white/15' : 'bg-slate-200/70'}`}>{counts[filter]}</span></button>)}</div>
        </div>
        {loading ? <LoadingState /> : visibleReports.length === 0 ? <EmptyState text="No reports match these filters." /> : <div className="grid gap-3 xl:grid-cols-2">{visibleReports.map((report) => <ReportCard key={report.id} report={report} onReview={review} isActioning={action === report.id} />)}</div>}
        {!loading && filteredReports.length > 0 && <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="text-xs text-slate-500">Showing {page * REPORTS_PER_PAGE + 1}–{Math.min((page + 1) * REPORTS_PER_PAGE, filteredReports.length)} of {filteredReports.length}</span><div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button><span className="grid min-w-10 place-items-center text-sm font-semibold text-slate-700">{page + 1}/{pageCount}</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page + 1 >= pageCount} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div></div>}
      </section>}

      {section === 'messages' && <div><div className="mb-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Support</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Contact inbox</h2><p className="mt-1 text-sm text-slate-500">Read user messages and follow up directly.</p></div><ContactInbox /></div>}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone, onClick }: { label: string; value: number; icon: LucideIcon; tone: 'amber' | 'emerald' | 'rose' | 'indigo'; onClick: () => void }) {
  const tones = { amber: 'text-amber-700 bg-amber-50 border-amber-200', emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200', rose: 'text-rose-700 bg-rose-50 border-rose-200', indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
  return <button type="button" onClick={onClick} className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tones[tone].split(' ').pop()}`}><span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone].split(' ').slice(0, 2).join(' ')}`}><Icon className="h-4 w-4" /></span><span className="mt-3 block text-2xl font-bold tabular-nums text-slate-950">{numberFormat.format(value)}</span><span className="mt-0.5 block text-xs font-medium text-slate-500">{label}</span></button>;
}

function ReportCard({ report, onReview, isActioning, compact = false }: { report: FraudReport; onReview: (id: string, decision: 'approve' | 'reject') => void; isActioning: boolean; compact?: boolean }) {
  return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-sm font-semibold text-slate-800">{report.identifier_type === 'phone' ? <Phone className="h-4 w-4 shrink-0 text-slate-500" /> : <CreditCard className="h-4 w-4 shrink-0 text-slate-500" />}<span className="break-all">{report.identifier}</span></span>
        <span className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${FRAUD_TYPE_COLORS[report.fraud_type]}`}>{FRAUD_TYPE_LABELS[report.fraud_type]}</span>
      </div>
      <span className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${STATUS_COLORS[report.status]}`}>{report.status}</span>
    </div>
    <p className={`mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 ${compact ? 'line-clamp-3' : ''}`}>{report.description}</p>
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span>{new Date(report.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>{report.reporter_name && <span>From {report.reporter_name}</span>}{report.amount_lost !== null && Number(report.amount_lost) > 0 && <span className="font-semibold text-slate-700">Loss ₹{Number(report.amount_lost).toLocaleString('en-IN')}</span>}</div>
    {report.screenshot_urls?.length ? <div className="mt-3 flex flex-wrap gap-2">{report.screenshot_urls.map((url, index) => <a key={`${report.id}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="block h-14 w-14 overflow-hidden rounded-lg border border-slate-200 hover:border-indigo-400"><img src={url} alt={`Evidence ${index + 1}`} className="h-full w-full object-cover" /></a>)}<span className="self-center text-xs text-slate-500">Evidence</span></div> : <p className="mt-3 text-xs text-slate-400">No evidence attached</p>}
    {report.status === 'pending' && <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => onReview(report.id, 'reject')} disabled={isActioning} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X className="h-4 w-4" />Reject</button><button type="button" onClick={() => onReview(report.id, 'approve')} disabled={isActioning} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{isActioning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Approve</button></div>}
    {report.status !== 'pending' && report.reviewed_at && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">Reviewed {new Date(report.reviewed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{report.reviewed_by ? ` · ${report.reviewed_by}` : ''}</p>}
  </article>;
}

function LoadingState() { return <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" /></div>; }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Check className="h-5 w-5" /></div><p className="mt-3 text-sm font-medium text-slate-600">{text}</p></div>; }
const numberFormat = new Intl.NumberFormat('en-IN');
