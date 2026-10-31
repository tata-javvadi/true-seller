import { ArrowRight, BadgeCheck, CalendarCheck, ShieldCheck, Sparkles } from 'lucide-react';
import type { PublicTrustedSeller } from '@/lib/supabase';

export function GenuineSellerCard({ seller, onCheckAnother }: { seller: PublicTrustedSeller; onCheckAnother: () => void }) {
  return (
    <section className="genuine-card-enter relative w-full min-w-0 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl shadow-emerald-900/10" aria-label="Genuine seller verification">
      <div className="genuine-card-glow absolute -right-8 -top-12 h-40 w-40 rounded-full bg-emerald-200/70 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 px-3.5 pb-5 pt-5 text-white sm:px-6 sm:pb-6">
        <div className="genuine-confetti" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 65}ms` }} />)}</div>
        <div className="relative flex items-start gap-3 sm:items-center sm:gap-4">
          <div className="genuine-seal relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/40 bg-white/15 shadow-lg shadow-emerald-950/20 backdrop-blur-sm sm:h-[72px] sm:w-[72px]">
            <span className="absolute inset-1 rounded-full border border-dashed border-white/60" />
            <ShieldCheck className="relative h-7 w-7 text-white sm:h-9 sm:w-9" />
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-emerald-700 bg-lime-300 text-emerald-950"><BadgeCheck className="h-3.5 w-3.5" /></span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-lime-200" /><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">True Seller Check verified</p></div>
            <h3 className="mt-1 text-xl font-extrabold leading-tight tracking-tight sm:text-[28px]">Genuine Seller</h3>
            <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-emerald-100 sm:text-xs">This seller has been verified by our admin team</p>
          </div>
          <BadgeCheck className="hidden h-8 w-8 shrink-0 text-lime-200 sm:block" />
        </div>
      </div>
      <div className="relative p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {seller.display_name && <p className="mb-1 text-lg font-bold text-slate-900">{seller.display_name}</p>}
            <p className="break-all font-mono text-base font-bold text-slate-900 sm:text-lg">{seller.identifier}</p>
            <p className="mt-1 text-xs text-slate-500">Verified seller {seller.identifier_type === 'phone' ? 'phone number' : 'UPI ID'}</p>
          </div>
          <span className="genuine-status-pill inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><BadgeCheck className="h-4 w-4" />Verified</span>
        </div>
        {seller.verification_note && <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3 text-sm leading-relaxed text-emerald-950">{seller.verification_note}</p>}
        <div className="mt-5 flex flex-col items-stretch gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarCheck className="h-4 w-4 shrink-0 text-emerald-600" />Verified {new Date(seller.verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">This status reflects an admin verification at the date shown. Always use your own judgment before sending money.</p>
      </div>
    </section>
  );
}
