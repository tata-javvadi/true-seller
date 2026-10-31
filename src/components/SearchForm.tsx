import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, ImageUp, Camera, Shield } from 'lucide-react';
import { supabase, validateIdentifier, detectType, type FraudReport, type PublicTrustedSeller } from '@/lib/supabase';
import { decodeQrImage, extractUpiId } from '@/lib/upiQr';
import { ResultCard } from './ResultCard';
import { GenuineSellerCard } from './GenuineSellerCard';

type SearchState = 'idle' | 'searching' | 'found' | 'genuine' | 'safe' | 'error';
type SearchMode = 'phone' | 'upi' | 'qr';

function getIdentifierFromPath(): { value: string; type: 'phone' | 'upi' } | null {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (!path || path.includes('/') || path === 'admin') return null;
  let candidate: string;
  try { candidate = decodeURIComponent(path); } catch { return null; }
  const checked = validateIdentifier(candidate);
  return checked.ok ? { value: checked.value, type: checked.type } : null;
}

export function SearchForm() {
  const initialLookup = useRef(getIdentifierFromPath());
  const autoSearchStarted = useRef(false);
  const [mode, setMode] = useState<SearchMode>(initialLookup.current?.type ?? 'phone');
  const [query, setQuery] = useState(initialLookup.current?.value ?? '');
  const [validationError, setValidationError] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [results, setResults] = useState<FraudReport[]>([]);
  const [trustedSeller, setTrustedSeller] = useState<PublicTrustedSeller | null>(null);
  const [searchedIdentifier, setSearchedIdentifier] = useState('');
  const [qrError, setQrError] = useState('');
  const [decodingQr, setDecodingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const qrCameraInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (value: string, identifierMode: 'phone' | 'upi', source: 'phone' | 'upi' | 'qr' = identifierMode) => {
    const checked = validateIdentifier(value, identifierMode);
    if (!checked.ok) {
      setValidationError(checked.error);
      setState('idle');
      setResults([]);
      setTrustedSeller(null);
      return;
    }

    setValidationError('');
    setState('searching');
    setResults([]);
    setTrustedSeller(null);
    setSearchedIdentifier(checked.value);

    try {
      const { data, error } = await supabase
        .from('fraud_reports')
        .select('*')
        .eq('identifier', checked.value)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        setState('error');
        return;
      }

      let genuineSeller: PublicTrustedSeller | null = null;
      if (!data?.length) {
        const { data: trustedData, error: trustedError } = await supabase.rpc('lookup_trusted_seller', { p_identifier: checked.value });
        if (trustedError) {
          setState('error');
          return;
        }
        genuineSeller = (trustedData?.[0] as PublicTrustedSeller | undefined) ?? null;
      }

      const { error: logError } = await supabase.from('search_logs').insert({
        identifier: checked.value,
        identifier_type: detectType(checked.value),
        search_source: source,
        result: data?.length ? 'found' : 'not_found',
        matched_report_id: data?.[0]?.id ?? null,
      });
      if (logError) console.error('Could not log search:', logError);

      if (data?.length) {
        setResults(data as FraudReport[]);
        setState('found');
      } else if (genuineSeller) {
        setTrustedSeller(genuineSeller);
        setState('genuine');
      } else {
        setState('safe');
      }
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (!initialLookup.current || autoSearchStarted.current) return;
    autoSearchStarted.current = true;
    void runSearch(initialLookup.current.value, initialLookup.current.type);
  }, [runSearch]);

  useEffect(() => {
    if (!initialLookup.current || !['searching', 'found', 'genuine', 'safe', 'error'].includes(state)) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }, [state]);

  const handleSearch = useCallback(() => runSearch(query, mode === 'phone' ? 'phone' : 'upi'), [query, mode, runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const switchMode = (next: SearchMode) => {
    setMode(next);
    setValidationError('');
    setQrError('');
    setState('idle');
    setResults([]);
    setTrustedSeller(null);
  };

  const handleQrFile = async (file?: File) => {
    if (!file) return;
    setQrError('');
    setValidationError('');
    setDecodingQr(true);
    try {
      const payload = await decodeQrImage(file);
      if (!payload) {
        setQrError('Could not read a QR code from this image. Try a clear, well-lit image.');
        return;
      }
      const upiId = extractUpiId(payload);
      if (!upiId) {
        setQrError('This QR code does not appear to contain a UPI ID.');
        return;
      }
      setQuery(upiId);
      setMode('upi');
      await runSearch(upiId, 'upi', 'qr');
    } catch {
      setQrError('Could not open this image. Please choose a JPG or PNG QR image.');
    } finally {
      setDecodingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = '';
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="tsc-card">
        <div className="tsc-toggle" role="group" aria-label="Search by">
          <button type="button" className={mode === 'phone' ? 'on' : ''} aria-pressed={mode === 'phone'} onClick={() => switchMode('phone')}>Phone</button>
          <button type="button" className={mode === 'upi' ? 'on' : ''} aria-pressed={mode === 'upi'} onClick={() => switchMode('upi')}>UPI ID</button>
          <button type="button" className={mode === 'qr' ? 'on' : ''} aria-pressed={mode === 'qr'} onClick={() => switchMode('qr')}>QR</button>
        </div>
        {mode === 'qr' ? (
          <>
            <label className="tsc-label" htmlFor="seller-qr">Upload seller’s UPI QR code</label>
            <input ref={qrCameraInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void handleQrFile(event.target.files?.[0])} />
            <input ref={qrInputRef} id="seller-qr" type="file" accept="image/*" className="sr-only" onChange={(event) => void handleQrFile(event.target.files?.[0])} />
            <div className="tsc-qr-options">
              <button type="button" className="tsc-qr-upload" onClick={() => qrCameraInputRef.current?.click()} disabled={decodingQr}>
                <Camera aria-hidden="true" />
                <span>Use camera</span>
              </button>
              <button type="button" className="tsc-qr-upload" onClick={() => qrInputRef.current?.click()} disabled={decodingQr}>
                <ImageUp aria-hidden="true" />
                <span>Choose from gallery</span>
              </button>
            </div>
            {decodingQr && <p className="tsc-qr-hint" role="status">Reading QR code…</p>}
            <p className="tsc-qr-hint">We’ll extract the UPI ID and check it against fraud reports.</p>
            {qrError && <p className="tsc-field-error" role="alert">{qrError}</p>}
          </>
        ) : (
        <>
        <label htmlFor="seller-query" className="tsc-label">{mode === 'phone' ? 'Seller phone number' : 'Seller UPI ID'}</label>
        <div className={`tsc-input ${validationError ? 'tsc-input-error' : ''}`}>
          <Search aria-hidden="true" />
          <input
            id="seller-query"
            type="text"
            inputMode={mode === 'phone' ? 'tel' : 'text'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (validationError) setValidationError('');
            }}
            placeholder={mode === 'phone' ? 'e.g. 98765 43210 or +91…' : 'e.g. seller@okaxis'}
            autoComplete="off"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'seller-query-error' : undefined}
          />
        </div>
        {validationError && (
          <p id="seller-query-error" className="tsc-field-error" role="alert">
            {validationError}
          </p>
        )}
        </>
        )}
        {mode !== 'qr' && <button
          type="submit"
          disabled={state === 'searching'}
          className="tsc-cta"
        >
          {state === 'searching' ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Checking...
            </span>
          ) : (
            'Check Now'
          )}
        </button>}
      </form>

      <div ref={resultRef} className="tsc-result">
        {initialLookup.current && state === 'searching' && <SharedLinkChecking identifier={searchedIdentifier} />}
        {state === 'found' && <div className="w-full min-w-0 space-y-3">{results.map((report) => <ResultCard key={report.id} report={report} />)}</div>}

        {state === 'genuine' && trustedSeller && <GenuineSellerCard seller={trustedSeller} onCheckAnother={() => {
          setState('idle');
          setTrustedSeller(null);
          setQuery('');
          window.setTimeout(() => document.getElementById('seller-query')?.focus(), 0);
        }} />}

        {state === 'safe' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center animate-[fadeIn_0.4s_ease]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-900 mb-2">No Fraud Reports Found</h3>
            <p className="text-emerald-700 max-w-md mx-auto break-words">
              We checked our fraud database for the {detectType(searchedIdentifier) === 'phone' ? 'phone number' : 'UPI ID'}{' '}
              <span className="font-semibold">{searchedIdentifier}</span> and found no matching reports.
            </p>
            <p className="text-sm text-emerald-600 mt-4">
              This doesn't guarantee the seller is safe — always stay alert when making payments.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-amber-800 font-medium">
              Something went wrong while checking. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SharedLinkChecking({ identifier }: { identifier: string }) {
  return <section className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-white px-5 py-8 text-center shadow-lg shadow-indigo-100/70 animate-[fadeIn_0.4s_ease]" aria-live="polite">
    <div className="absolute inset-x-0 top-0 h-1.5 overflow-hidden bg-indigo-50"><span className="block h-full w-2/5 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 motion-safe:animate-[verification-progress_1.8s_ease-in-out_infinite]" /></div>
    <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-indigo-50 to-emerald-50 text-indigo-700">
      <span className="absolute inset-0 rounded-full border-2 border-indigo-200 motion-safe:animate-ping opacity-40" />
      <span className="absolute inset-2 rounded-full border border-dashed border-indigo-300 motion-safe:animate-[spin_8s_linear_infinite]" />
      <Shield className="relative h-9 w-9 motion-safe:animate-pulse" />
    </div>
    <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-600">True Seller Check</p>
    <h2 className="mt-1 text-xl font-extrabold text-slate-900">Checking this seller</h2>
    <p className="mx-auto mt-2 max-w-sm break-all font-mono text-sm font-semibold text-slate-600">{identifier}</p>
    <p className="mt-2 text-xs text-slate-500">Looking for verified seller status and community reports…</p>
    <div className="mx-auto mt-5 flex max-w-40 items-center justify-center gap-1.5" aria-hidden="true">{[0, 1, 2].map((dot) => <span key={dot} className="h-1.5 w-1.5 rounded-full bg-indigo-500 motion-safe:animate-bounce" style={{ animationDelay: `${dot * 120}ms` }} />)}</div>
  </section>;
}
