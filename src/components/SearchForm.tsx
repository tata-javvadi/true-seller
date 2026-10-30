import { useState, useCallback, useRef } from 'react';
import { Search, ImageUp, Camera } from 'lucide-react';
import { supabase, validateIdentifier, detectType, type FraudReport } from '@/lib/supabase';
import { decodeQrImage, extractUpiId } from '@/lib/upiQr';
import { ResultCard } from './ResultCard';

type SearchState = 'idle' | 'searching' | 'found' | 'safe' | 'error';
type SearchMode = 'phone' | 'upi' | 'qr';

export function SearchForm() {
  const [mode, setMode] = useState<SearchMode>('phone');
  const [query, setQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [results, setResults] = useState<FraudReport[]>([]);
  const [searchedIdentifier, setSearchedIdentifier] = useState('');
  const [qrError, setQrError] = useState('');
  const [decodingQr, setDecodingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const qrCameraInputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (value: string, identifierMode: 'phone' | 'upi', source: 'phone' | 'upi' | 'qr' = identifierMode) => {
    const checked = validateIdentifier(value, identifierMode);
    if (!checked.ok) {
      setValidationError(checked.error);
      setState('idle');
      setResults([]);
      return;
    }

    setValidationError('');
    setState('searching');
    setResults([]);
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
      } else {
        setState('safe');
      }
    } catch {
      setState('error');
    }
  }, []);

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

      <div className="tsc-result">
        {state === 'found' && <div className="w-full min-w-0 space-y-3">{results.map((report) => <ResultCard key={report.id} report={report} />)}</div>}

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
