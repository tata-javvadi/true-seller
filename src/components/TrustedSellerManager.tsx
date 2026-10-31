import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Ban, Check, Phone, Plus, RefreshCw, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { supabase, validateIdentifier, type TrustedSeller } from '@/lib/supabase';

type IdentifierType = 'phone' | 'upi';

export function TrustedSellerManager() {
  const [sellers, setSellers] = useState<TrustedSeller[]>([]);
  const [identifierType, setIdentifierType] = useState<IdentifierType>('phone');
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [filter, setFilter] = useState<'active' | 'revoked' | 'all'>('active');
  const [query, setQuery] = useState('');
  const [identifierError, setIdentifierError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadSellers = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.from('trusted_sellers').select('*').order('active', { ascending: false }).order('updated_at', { ascending: false });
    if (loadError) {
      setError('Could not load genuine sellers. Apply the trusted sellers migration and sign in as admin.');
    } else {
      setSellers((data ?? []) as TrustedSeller[]);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadSellers(); }, [loadSellers]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const checked = validateIdentifier(identifier, identifierType);
    if (!checked.ok) {
      setIdentifierError(checked.error);
      return;
    }
    setIdentifierError('');
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    const { error: saveError } = await supabase.from('trusted_sellers').upsert({
      identifier: checked.value,
      identifier_type: checked.type,
      display_name: displayName.trim() || null,
      verification_note: verificationNote.trim() || null,
      active: true,
      verified_by: user?.email ?? 'admin',
      verified_at: now,
      updated_at: now,
    }, { onConflict: 'identifier' });
    setSaving(false);
    if (saveError) {
      setError(saveError.code === '23505' ? 'This identifier already has a genuine seller entry.' : 'Could not save this genuine seller. Please try again.');
      return;
    }
    setIdentifier('');
    setDisplayName('');
    setVerificationNote('');
    setSuccess(`${checked.value} is now marked as a genuine seller.`);
    await loadSellers();
  };

  const toggleActive = async (seller: TrustedSeller) => {
    setActionId(seller.id);
    setError('');
    setSuccess('');
    const { error: updateError } = await supabase.from('trusted_sellers').update({ active: !seller.active, updated_at: new Date().toISOString() }).eq('id', seller.id);
    if (updateError) setError('Could not update this genuine seller. Please try again.');
    else setSuccess(`${seller.identifier} ${seller.active ? 'was removed from' : 'was restored to'} the genuine seller list.`);
    setActionId(null);
    await loadSellers();
  };

  const visibleSellers = sellers
    .filter((seller) => filter === 'all' || (filter === 'active' ? seller.active : !seller.active))
    .filter((seller) => !query.trim() || `${seller.identifier} ${seller.display_name ?? ''} ${seller.verification_note ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const activeCount = sellers.filter((seller) => seller.active).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Manual verification</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Genuine Sellers</h2><p className="mt-1 text-sm text-slate-500">Manage identifiers that should receive an admin verified result.</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-900"><BadgeCheck className="mr-1.5 inline h-4 w-4" />{activeCount} active</div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><Plus className="h-4 w-4" /></span><div><h3 className="font-bold text-slate-900">Add or update a seller</h3><p className="text-xs text-slate-500">Re-adding an identifier restores it if it was revoked.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Identifier type<select value={identifierType} onChange={(event) => { setIdentifierType(event.target.value as IdentifierType); setIdentifierError(''); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="phone">Phone number</option><option value="upi">UPI ID</option></select></label>
          <label className="text-xs font-semibold text-slate-600">{identifierType === 'phone' ? 'Phone number' : 'UPI ID'}<input value={identifier} onChange={(event) => { setIdentifier(event.target.value); setIdentifierError(''); }} placeholder={identifierType === 'phone' ? 'e.g. 9876543210' : 'e.g. seller@okaxis'} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" aria-invalid={!!identifierError} /></label>
          <label className="text-xs font-semibold text-slate-600">Seller or business name <span className="font-normal text-slate-400">optional</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name shown on the verified card" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="text-xs font-semibold text-slate-600">Verification note <span className="font-normal text-slate-400">optional, visible publicly</span><input value={verificationNote} onChange={(event) => setVerificationNote(event.target.value)} placeholder="Briefly explain what was verified" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        {identifierError && <p role="alert" className="mt-2 text-xs text-rose-700">{identifierError}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" disabled={saving || !identifier.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{saving ? 'Saving…' : 'Mark as genuine'}</button><p className="text-xs text-slate-500">Approved fraud reports take priority in public search.</p></div>
      </form>

      {(error || success) && <p role={error ? 'alert' : 'status'} className={`rounded-xl border px-3.5 py-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{error || success}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3.5 sm:p-4">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">{(['active', 'revoked', 'all'] as const).map((value) => <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ${filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{value}</button>)}</div>
          <label className="relative block w-full sm:w-72"><span className="sr-only">Search genuine sellers</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sellers" className="h-10 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        {loading ? <div className="py-12 text-center text-sm text-slate-500">Loading sellers…</div> : visibleSellers.length === 0 ? <div className="px-4 py-12 text-center text-sm text-slate-500">No sellers in this list.</div> : <div className="divide-y divide-slate-100">{visibleSellers.map((seller) => <article key={seller.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${seller.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{seller.identifier_type === 'phone' ? <Phone className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}</span><div className="min-w-0"><p className="break-all font-mono text-sm font-bold text-slate-900">{seller.identifier}</p><p className="mt-0.5 text-xs text-slate-500">{seller.display_name || (seller.identifier_type === 'phone' ? 'Phone number' : 'UPI ID')} · Verified {new Date(seller.verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>{seller.verification_note && <p className="mt-1 break-words text-xs text-slate-600">{seller.verification_note}</p>}</div></div>
          <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${seller.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{seller.active ? 'Active' : 'Revoked'}</span><button type="button" onClick={() => void toggleActive(seller)} disabled={actionId === seller.id} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50 ${seller.active ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>{actionId === seller.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : seller.active ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}{seller.active ? 'Revoke' : 'Restore'}</button></div>
        </article>)}</div>}
      </div>
      <p className="text-xs leading-relaxed text-slate-400">Only active records appear in public lookup. Admin verification is an assessment made at a point in time; review and revoke entries when circumstances change.</p>
    </section>
  );
}
