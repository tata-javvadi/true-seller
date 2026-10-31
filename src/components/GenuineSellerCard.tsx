import { BadgeCheck, CalendarCheck, ShieldCheck, Sparkles } from 'lucide-react';
import type { PublicTrustedSeller } from '@/lib/supabase';

export function GenuineSellerCard({ seller }: { seller: PublicTrustedSeller }) {
  return (
    <section className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm animate-[fadeIn_0.4s_ease]" aria-label="Genuine seller verification">
      <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-emerald-100/70 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-center gap-3.5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 px-4 py-4 text-white sm:px-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/15 shadow-inner"><ShieldCheck className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-100" /><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Admin verified</p></div>
          <h3 className="mt-0.5 text-xl font-extrabold tracking-tight">Genuine Seller</h3>
        </div>
        <BadgeCheck className="h-7 w-7 shrink-0 text-emerald-100" />
      </div>
      <div className="relative p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {seller.display_name && <p className="mb-1 text-sm font-semibold text-slate-800">{seller.display_name}</p>}
            <p className="break-all font-mono text-base font-bold text-slate-900">{seller.identifier}</p>
            <p className="mt-1 text-xs text-slate-500">Verified seller {seller.identifier_type === 'phone' ? 'phone number' : 'UPI ID'}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" />Genuine</span>
        </div>
        {seller.verification_note && <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3 text-sm leading-relaxed text-emerald-950">{seller.verification_note}</p>}
        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500"><CalendarCheck className="h-4 w-4 text-emerald-600" />Verified {new Date(seller.verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">This status reflects an admin verification at the date shown. Always use your own judgment before sending money.</p>
      </div>
    </section>
  );
}
