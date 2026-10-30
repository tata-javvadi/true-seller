import { AlertTriangle, Phone, CreditCard, Calendar, Users, TrendingDown } from 'lucide-react';
import { FRAUD_TYPE_LABELS, FRAUD_TYPE_COLORS, type FraudReport } from '@/lib/supabase';

export function ResultCard({ report }: { report: FraudReport }) {
  return (
    <div className="w-full min-w-0 max-w-full bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm animate-[fadeIn_0.4s_ease]">
      {/* Warning header */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 px-4 sm:px-5 py-3.5 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Fraud Warning</h3>
          <p className="text-red-100 text-xs sm:text-sm">This seller has been reported for fraudulent activity</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        {/* Identifier info */}
        <div className="flex flex-wrap items-center gap-2 mb-4 min-w-0">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 min-w-0 max-w-full">
            {report.identifier_type === 'phone' ? (
              <Phone className="w-4 h-4 text-slate-500" />
            ) : (
              <CreditCard className="w-4 h-4 text-slate-500" />
            )}
            <span className="font-mono font-semibold text-slate-800 text-sm break-all">{report.identifier}</span>
          </div>
          <span className={`px-3 py-2 rounded-lg text-sm font-semibold border ${FRAUD_TYPE_COLORS[report.fraud_type]}`}>
            {FRAUD_TYPE_LABELS[report.fraud_type]}
          </span>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reported Activity</p>
          <p className="text-slate-700 leading-relaxed">{report.description}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard
            icon={<Users className="w-4 h-4 text-red-500" />}
            label="Reports"
            value={String(report.report_count)}
            bg="bg-red-50"
          />
          {report.amount_lost !== null && Number(report.amount_lost) > 0 && (
            <StatCard
              icon={<TrendingDown className="w-4 h-4 text-amber-500" />}
              label="Amount Lost"
              value={`₹${Number(report.amount_lost).toLocaleString('en-IN')}`}
              bg="bg-amber-50"
            />
          )}
          <StatCard
            icon={<Calendar className="w-4 h-4 text-slate-500" />}
            label="First Report"
            value={new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            bg="bg-slate-100"
          />
          <StatCard
            icon={<Calendar className="w-4 h-4 text-slate-500" />}
            label="Latest"
            value={new Date(report.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            bg="bg-slate-100"
          />
        </div>

        {report.report_count > 1 && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-3 text-center">
            <p className="text-sm text-red-700 font-medium">
              {report.report_count} people have reported this seller — exercise extreme caution
            </p>
          </div>
        )}

        {/* Reporter */}
        {report.reporter_name && (
          <p className="text-xs text-slate-400 mt-4">Reported by {report.reporter_name}</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className={`${bg} rounded-lg p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="font-bold text-slate-800 text-sm break-words">{value}</p>
    </div>
  );
}
