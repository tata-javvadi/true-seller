import { useCallback, useEffect, useState } from 'react';
import { Activity, CalendarClock, CircleCheck, Eye, RefreshCw, Search, ShieldAlert, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type DailyActivity = { day: string; visits: number; searches: number; fraud_matches: number };
type TopSearch = { identifier: string; identifier_type: 'phone' | 'upi'; searches: number; fraud_matches: number; last_searched_at: string };
type RecentSearch = { identifier: string; identifier_type: 'phone' | 'upi'; search_source: 'phone' | 'upi' | 'qr'; result: 'found' | 'not_found'; created_at: string };
type TimeRange = '1h' | '24h' | '3d' | '7d' | '30d';
type SearchMetrics = { searches: number; fraud_matches: number; no_matches: number; site_visits: number };
type Analytics = {
  generated_at: string;
  site_visits: number;
  searches: number;
  fraud_matches: number;
  no_matches: number;
  reports: { total: number; pending: number; approved: number; rejected: number };
  search_sources: { phone: number; upi: number; qr: number };
  daily_activity: DailyActivity[];
  top_searches: TopSearch[];
  recent_searches: RecentSearch[];
};

const numberFormat = new Intl.NumberFormat('en-IN');
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const PAGE_SIZE = 10;
const TIME_RANGES: { value: TimeRange; label: string; milliseconds: number }[] = [
  { value: '1h', label: 'Past 1 hour', milliseconds: 60 * 60 * 1000 },
  { value: '24h', label: 'Past 24 hours', milliseconds: 24 * 60 * 60 * 1000 },
  { value: '3d', label: 'Past 3 days', milliseconds: 3 * 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Past 1 week', milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'Past 1 month', milliseconds: 30 * 24 * 60 * 60 * 1000 },
];

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [page, setPage] = useState(0);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [totalRecentSearches, setTotalRecentSearches] = useState(0);
  const [filteredMetrics, setFilteredMetrics] = useState<SearchMetrics>({ searches: 0, fraud_matches: 0, no_matches: 0, site_visits: 0 });
  const [rangeLoading, setRangeLoading] = useState(true);
  const [rangeError, setRangeError] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: requestError } = await supabase.rpc('get_admin_analytics');
    if (requestError) {
      setError('Could not load analytics. Apply the site visits and admin analytics migration, then refresh.');
      setAnalytics(null);
    } else {
      setAnalytics(data as Analytics);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  const loadFilteredData = useCallback(async () => {
    setRangeLoading(true);
    const selectedRange = TIME_RANGES.find((range) => range.value === timeRange)!;
    const since = new Date(Date.now() - selectedRange.milliseconds).toISOString();
    const start = page * PAGE_SIZE;
    const [searchCount, fraudCount, noMatchCount, visitCount, pageResult] = await Promise.all([
      supabase.from('search_logs').select('id', { count: 'exact', head: true }).gte('created_at', since),
      supabase.from('search_logs').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('result', 'found'),
      supabase.from('search_logs').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('result', 'not_found'),
      supabase.from('site_visits').select('id', { count: 'exact', head: true }).gte('created_at', since),
      supabase.from('search_logs').select('identifier, identifier_type, search_source, result, created_at').gte('created_at', since).order('created_at', { ascending: false }).range(start, start + PAGE_SIZE - 1),
    ]);

    const requestError = searchCount.error || fraudCount.error || noMatchCount.error || visitCount.error || pageResult.error;
    if (requestError) {
      setRangeError('Could not load search activity for this time range. Try refreshing.');
      setRecentSearches([]);
      setTotalRecentSearches(0);
    } else {
      setRangeError('');
      const total = searchCount.count ?? 0;
      setFilteredMetrics({ searches: total, fraud_matches: fraudCount.count ?? 0, no_matches: noMatchCount.count ?? 0, site_visits: visitCount.count ?? 0 });
      setTotalRecentSearches(total);
      setRecentSearches((pageResult.data ?? []) as RecentSearch[]);
      if (start >= total && total > 0) setPage(Math.max(0, Math.ceil(total / PAGE_SIZE) - 1));
    }
    setRangeLoading(false);
  }, [timeRange, page]);

  useEffect(() => { void loadFilteredData(); }, [loadFilteredData]);

  if (loading && !analytics) return <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-12"><span className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (error || !analytics) return <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><div className="flex items-center justify-between gap-3"><span>{error || 'Analytics are unavailable.'}</span><button onClick={() => void loadAnalytics()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-rose-800 border border-rose-200"><RefreshCw className="w-4 h-4" /> Retry</button></div></div>;

  const kpis = [
    { label: 'Website opens', value: filteredMetrics.site_visits, icon: Eye, tone: 'indigo' },
    { label: 'Number searches', value: filteredMetrics.searches, icon: Search, tone: 'blue' },
    { label: 'Fraud matches', value: filteredMetrics.fraud_matches, icon: ShieldAlert, tone: 'rose' },
    { label: 'No fraud found', value: filteredMetrics.no_matches, icon: CircleCheck, tone: 'emerald' },
  ];
  const selectedRangeLabel = TIME_RANGES.find((range) => range.value === timeRange)?.label ?? 'Past 24 hours';
  const maxDaily = Math.max(1, ...analytics.daily_activity.flatMap((item) => [item.visits, item.searches, item.fraud_matches]));

  return (
    <section className="mb-7 space-y-4" aria-labelledby="analytics-title">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Traffic & activity</p><h2 id="analytics-title" className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">Dashboard overview</h2><p className="mt-1 text-xs text-slate-500">Search metrics and recent searches: {selectedRangeLabel.toLowerCase()}.</p></div>
        <button onClick={() => { void loadAnalytics(); void loadFilteredData(); }} disabled={loading || rangeLoading} aria-label="Refresh analytics" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading || rangeLoading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`rounded-2xl border bg-white p-4 shadow-sm ${tone === 'rose' ? 'border-rose-200' : tone === 'emerald' ? 'border-emerald-200' : 'border-indigo-200'}`}>
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">{label}</span><Icon className={`h-4 w-4 ${tone === 'rose' ? 'text-rose-600' : tone === 'emerald' ? 'text-emerald-700' : 'text-indigo-600'}`} /></div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{numberFormat.format(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Last 30 days</h3><p className="text-xs text-slate-500 mt-0.5">Daily site opens and searches</p></div><Activity className="w-5 h-5 text-indigo-600" /></div>
          <div className="mt-5 flex h-36 items-end gap-1" role="img" aria-label="Daily site visits, searches and fraud matches for the last 30 days">
            {analytics.daily_activity.map((item, index) => <div key={item.day} title={`${item.day}: ${item.visits} opens, ${item.searches} searches, ${item.fraud_matches} matches`} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] border-b border-slate-200">
              <span className="w-1/3 rounded-t bg-indigo-300" style={{ height: `${Math.max(2, item.visits / maxDaily * 100)}%` }} />
              <span className="w-1/3 rounded-t bg-blue-500" style={{ height: `${Math.max(2, item.searches / maxDaily * 100)}%` }} />
              <span className="w-1/3 rounded-t bg-rose-500" style={{ height: `${Math.max(2, item.fraud_matches / maxDaily * 100)}%` }} />
              {index % 5 === 0 && <span className="sr-only">{item.day}</span>}
            </div>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600"><Legend color="bg-indigo-300" label="Opens" /><Legend color="bg-blue-500" label="Searches" /><Legend color="bg-rose-500" label="Fraud matches" /></div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center"><MiniMetric label="Phone" value={analytics.search_sources.phone} /><MiniMetric label="UPI ID" value={analytics.search_sources.upi} /><MiniMetric label="QR" value={analytics.search_sources.qr} icon={<Smartphone className="inline w-3 h-3 mr-1" />} /></div>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Fraud reports</h3><p className="text-xs text-slate-500 mt-0.5">Community submissions and review status</p></div><CalendarClock className="w-5 h-5 text-indigo-600" /></div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{numberFormat.format(analytics.reports.total)} <span className="text-sm font-medium text-slate-500">total reports</span></p>
          <div className="mt-4 grid grid-cols-3 gap-2">{[
            ['Pending', analytics.reports.pending, 'bg-amber-50 border-amber-200 text-amber-800'],
            ['Approved', analytics.reports.approved, 'bg-emerald-50 border-emerald-200 text-emerald-800'],
            ['Rejected', analytics.reports.rejected, 'bg-rose-50 border-rose-200 text-rose-800'],
          ].map(([label, value, style]) => <div key={label} className={`rounded-xl border p-3 ${style}`}><p className="text-[11px] font-semibold">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{numberFormat.format(Number(value))}</p></div>)}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
          <h3 className="font-semibold text-slate-900">Most searched identifiers</h3><p className="mt-0.5 text-xs text-slate-500">Ranked by total recorded searches</p>
          {analytics.top_searches.length ? <div className="mt-3 divide-y divide-slate-100">{analytics.top_searches.map((item) => <div key={`${item.identifier_type}-${item.identifier}`} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate font-mono text-sm font-semibold text-slate-800">{item.identifier}</p><p className="text-[11px] text-slate-500">{item.identifier_type === 'upi' ? 'UPI ID' : 'Phone'} · {numberFormat.format(item.fraud_matches)} fraud matches</p></div><span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-800">{numberFormat.format(item.searches)} searches</span></div>)}</div> : <EmptyState text="No searches recorded yet." />}
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-semibold text-slate-900">Recent searches</h3><p className="mt-0.5 text-xs text-slate-500">{numberFormat.format(totalRecentSearches)} searches in the selected period, newest first</p></div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">Time range
              <select value={timeRange} onChange={(event) => { setTimeRange(event.target.value as TimeRange); setPage(0); }} className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {TIME_RANGES.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
              </select>
            </label>
          </div>
          {rangeError ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-4 text-center text-sm text-rose-700">{rangeError}<button type="button" onClick={() => void loadFilteredData()} className="ml-2 font-semibold underline">Retry</button></div> : rangeLoading ? <div className="flex items-center justify-center py-10"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" /></div> : recentSearches.length ? <>
            <div className="mt-3 divide-y divide-slate-100">{recentSearches.map((item, index) => <div key={`${item.identifier}-${item.created_at}-${index}`} className="flex items-center justify-between gap-3 py-2.5"><div className="min-w-0"><p className="truncate font-mono text-sm font-medium text-slate-800">{item.identifier}</p><p className="text-[11px] text-slate-500">{item.search_source.toUpperCase()} · {dateFormat.format(new Date(item.created_at))}</p></div><span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${item.result === 'found' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.result === 'found' ? 'Fraud match' : 'No match'}</span></div>)}</div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">Page {page + 1} of {Math.max(1, Math.ceil(totalRecentSearches / PAGE_SIZE))}</p>
              <div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button type="button" onClick={() => setPage((current) => current + 1)} disabled={(page + 1) * PAGE_SIZE >= totalRecentSearches} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div>
            </div>
          </> : <EmptyState text="No searches in this time range." />}
        </div>
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>; }
function MiniMetric({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) { return <div><p className="text-[11px] text-slate-500">{icon}{label}</p><p className="font-bold tabular-nums text-slate-800">{numberFormat.format(value)}</p></div>; }
function EmptyState({ text }: { text: string }) { return <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">{text}</p>; }
