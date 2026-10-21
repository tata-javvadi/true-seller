import { useEffect, useState, useCallback } from 'react';
import { Check, X, Clock, Phone, CreditCard, AlertCircle, LogOut } from 'lucide-react';
import { supabase, FRAUD_TYPE_LABELS, FRAUD_TYPE_COLORS, STATUS_COLORS, type FraudReport } from '@/lib/supabase';
import { AdminAuth } from './AdminAuth';

export function AdminPanel() {
  const [session, setSession] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
      if (data.session?.user?.email) setAdminEmail(data.session.user.email);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(!!session);
        if (session?.user?.email) setAdminEmail(session.user.email);
      })();
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  if (session === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AdminAuth />;
  }

  return <AdminDashboard adminEmail={adminEmail} onSignOut={handleSignOut} />;
}

function AdminDashboard({ adminEmail, onSignOut }: { adminEmail: string; onSignOut: () => Promise<void> }) {
  const [pending, setPending] = useState<FraudReport[]>([]);
  const [reviewed, setReviewed] = useState<FraudReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'pending' | 'reviewed'>('pending');

  const loadReports = useCallback(async () => {
    const [{ data: pendingData }, { data: reviewedData }] = await Promise.all([
      supabase.from('fraud_reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('fraud_reports').select('*').in('status', ['approved', 'rejected']).order('updated_at', { ascending: false }),
    ]);
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
      p_admin_email: adminEmail,
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
      p_admin_email: adminEmail,
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
    <div>
      {/* Admin header bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 1.105-.895 2-2 2s-2-.895-2-2 .895-2 2-2 2 .895 2 2zm0 0c0 1.105.895 2 2 2s2-.895 2-2-.895-2-2-2-2 .895-2 2zm0 0V7m0 4v4m-7-2h14" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Signed in as {adminEmail}</p>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab('reviewed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'reviewed' ? 'bg-slate-100 text-slate-700' : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          Reviewed ({reviewed.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            {tab === 'pending' ? 'No pending reports to review.' : 'No reviewed reports yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      {/* Top row: identifier + type + status */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
          {report.identifier_type === 'phone' ? (
            <Phone className="w-4 h-4 text-slate-500" />
          ) : (
            <CreditCard className="w-4 h-4 text-slate-500" />
          )}
          <span className="font-mono font-semibold text-slate-800 text-sm">{report.identifier}</span>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${FRAUD_TYPE_COLORS[report.fraud_type]}`}>
          {FRAUD_TYPE_LABELS[report.fraud_type]}
        </span>
        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${STATUS_COLORS[report.status]}`}>
          {report.status === 'pending' ? 'Pending' : report.status === 'approved' ? 'Approved' : 'Rejected'}
        </span>
      </div>

      {/* Description */}
      <p className="text-slate-700 text-sm mb-3 leading-relaxed">{report.description}</p>

      {/* Meta */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-3">
        <span>Submitted {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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

      {/* Screenshots */}
      {report.screenshot_urls && report.screenshot_urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {report.screenshot_urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors"
            >
              <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      {report.status === 'pending' && (
        <div className="flex gap-3">
          <button
            onClick={() => onApprove(report.id)}
            disabled={isActioning}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={() => onReject(report.id)}
            disabled={isActioning}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
          {isActioning && (
            <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin self-center" />
          )}
        </div>
      )}
    </div>
  );
}
