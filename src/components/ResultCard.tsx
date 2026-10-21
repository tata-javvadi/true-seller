import { AlertTriangle, Phone, CreditCard, Calendar, Users, TrendingDown, X } from 'lucide-react';
import { FRAUD_TYPE_LABELS, FRAUD_TYPE_COLORS, type FraudReport } from '@/lib/supabase';

export function ResultCard({ report }: { report: FraudReport }) {
  return (
    <div className="bg-white border-2 border-red-300 rounded-2xl overflow-hidden shadow-xl shadow-red-200/50 animate-[fadeIn_0.4s_ease]">
      {/* Warning header */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Fraud Warning</h3>
          <p className="text-red-100 text-sm">This seller has been reported for fraudulent activity</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Identifier info */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2">
            {report.identifier_type === 'phone' ? (
              <Phone className="w-4 h-4 text-slate-500" />
            ) : (
              <CreditCard className="w-4 h-4 text-slate-500" />
            )}
            <span className="font-mono font-semibold text-slate-800">{report.identifier}</span>
          </div>
          <span className={`px-3 py-2 rounded-lg text-sm font-semibold border ${FRAUD_TYPE_COLORS[report.fraud_type]}`}>
            {FRAUD_TYPE_LABELS[report.fraud_type]}
          </span>
        </div>

        {/* Description */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reported Activity</p>
          <p className="text-slate-700 leading-relaxed">{report.description}</p>
        </div>

        {/* Screenshots */}
        {report.screenshot_urls && report.screenshot_urls.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Evidence Screenshots</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.screenshot_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-400 transition-colors group"
                >
                  <img
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      <p className="font-bold text-slate-800 text-sm">{value}</p>
    </div>
  );
}
