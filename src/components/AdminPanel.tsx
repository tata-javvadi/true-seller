import { useEffect, useState, useCallback } from 'react';
import {
  Check,
  X,
  Clock,
  Phone,
  CreditCard,
  AlertCircle,
  LogOut,
  Shield,
} from 'lucide-react';
import {
  supabase,
  FRAUD_TYPE_LABELS,
  FRAUD_TYPE_COLORS,
  STATUS_COLORS,
  type FraudReport,
} from '@/lib/supabase';
import { AdminAuth, ADMIN_SESSION_KEY } from './AdminAuth';

const ADMIN_REVIEWER = 'admin';

export function AdminPanel() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === '1');

  const handleLock = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    void supabase.auth.signOut();
    setUnlocked(false);
  }, []);

  if (!unlocked) {
    return <AdminAuth onSuccess={() => setUnlocked(true)} />;
  }

  return <AdminDashboard onLock={handleLock} />;
}

function AdminDashboard({ onLock }: { onLock: () => void }) {
  const [pending, setPending] = useState<FraudReport[]>([]);
  const [reviewed, setReviewed] = useState<FraudReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');

  const loadReports = useCallback(async () => {
    const [{ data: pendingData, error: pendingError }, { data: reviewedData, error: reviewedError }] = await Promise.all([
      supabase.from('fraud_reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase
        .from('fraud_reports')
        .select('*')
        .in('status', ['approved', 'rejected'])
        .order('updated_at', { ascending: false }),
    ]);
    if (pendingError || reviewedError) {
      setError('Could not load reports. Sign in with an authorized admin account and try again.');
    } else {
      setError('');
    }
    setPending((pendingData ?? []) as FraudReport[]);
    setReviewed((reviewedData ?? []) as FraudReport[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleApprove = async (id: string) => {
    setAction(id);
    setError('');
    const { error } = await supabase.rpc('approve_fraud_report', {
      p_report_id: id,
      p_admin_email: ADMIN_REVIEWER,
    });
    if (error) {
      setError('Could not approve report. Please try again.');
      setAction(null);
      return;
    }
    await loadReports();
    setAction(null);
  };

  const handleReject = async (id: string) => {
    setAction(id);
    setError('');
    const { error } = await supabase.rpc('reject_fraud_report', {
      p_report_id: id,
      p_admin_email: ADMIN_REVIEWER,
    });
    if (error) {
      setError('Could not reject report. Please try again.');
      setAction(null);
      return;
    }
    await loadReports();
    setAction(null);
  };

  const reports = tab === 'pending' ? pending : reviewed;

  return (
    <div className="animate-fade-in">
      {/* Admin header bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-5 sm:mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center flex-shrink-0 shadow-md shadow-slate-900/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold text-slate-800 truncate">Admin Panel</p>
            <p className="text-xs text-slate-400">Review community fraud reports</p>
          </div>
        </div>
        <button
          onClick={onLock}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Lock</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3.5 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 p-1 bg-slate-100/80 rounded-xl">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'pending'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Pending
          <span className="ml-1.5 tabular-nums opacity-80">({pending.length})</span>
        </button>
        <button
          onClick={() => setTab('reviewed')}
          className={`flex-1 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'reviewed'
              ? 'bg-white text-slate-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Reviewed
          <span className="ml-1.5 tabular-nums opacity-80">({reviewed.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-12 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm sm:text-base">
            {tab === 'pending' ? 'No pending reports to review.' : 'No reviewed reports yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {reports.map((report) => (
            <AdminReportCard
              key={report.id}
              report={report}
              onApprove={handleApprove}
              onReject={handleReject}
              isActioning={action === report.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminReportCard({
  report,
  onApprove,
  onReject,
  isActioning,
}: {
  report: FraudReport;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isActioning: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm shadow-slate-900/[0.02]">
      <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 max-w-full">
          {report.identifier_type === 'phone' ? (
            <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
          ) : (
            <CreditCard className="w-4 h-4 text-slate-500 flex-shrink-0" />
          )}
          <span className="font-mono font-semibold text-slate-800 text-sm truncate">{report.identifier}</span>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${FRAUD_TYPE_COLORS[report.fraud_type]}`}>
          {FRAUD_TYPE_LABELS[report.fraud_type]}
        </span>
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${STATUS_COLORS[report.status]}`}>
          {report.status === 'pending' ? 'Pending' : report.status === 'approved' ? 'Approved' : 'Rejected'}
        </span>
      </div>

      <p className="text-slate-700 text-sm mb-3 leading-relaxed">{report.description}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 mb-3">
        <span>
          Submitted{' '}
          {new Date(report.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        {report.amount_lost !== null && Number(report.amount_lost) > 0 && (
          <span>Amount lost: ₹{Number(report.amount_lost).toLocaleString('en-IN')}</span>
        )}
        {report.reporter_name && <span>By: {report.reporter_name}</span>}
        {report.status !== 'pending' && report.reviewed_by && (
          <span>
            Reviewed by {report.reviewed_by} on{' '}
            {report.reviewed_at
              ? new Date(report.reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : ''}
          </span>
        )}
      </div>

      {report.screenshot_urls && report.screenshot_urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {report.screenshot_urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors"
            >
              <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {report.status === 'pending' && (
        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
          <button
            onClick={() => onReject(report.id)}
            disabled={isActioning}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={() => onApprove(report.id)}
            disabled={isActioning}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm shadow-emerald-600/20"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>
          {isActioning && (
            <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin self-center mx-auto sm:mx-0" />
          )}
        </div>
      )}
    </div>
  );
}
