import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { supabase, validateIdentifier, detectType, type FraudReport } from '@/lib/supabase';
import { ResultCard } from './ResultCard';

type SearchState = 'idle' | 'searching' | 'found' | 'safe' | 'error';

export function SearchForm() {
  const [mode, setMode] = useState<'phone' | 'upi'>('phone');
  const [query, setQuery] = useState('');
  const [validationError, setValidationError] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [result, setResult] = useState<FraudReport | null>(null);
  const [searchedIdentifier, setSearchedIdentifier] = useState('');

  const handleSearch = useCallback(async () => {
    const checked = validateIdentifier(query, mode);
    if (!checked.ok) {
      setValidationError(checked.error);
      setState('idle');
      setResult(null);
      return;
    }

    setValidationError('');
    setState('searching');
    setResult(null);
    setSearchedIdentifier(checked.value);

    try {
      const { data, error } = await supabase
        .from('fraud_reports')
        .select('*')
        .eq('identifier', checked.value)
        .maybeSingle();

      if (error) {
        setState('error');
        return;
      }

      if (data) {
        setResult(data as FraudReport);
        setState('found');
      } else {
        setState('safe');
      }
    } catch {
      setState('error');
    }
  }, [query, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const switchMode = (next: 'phone' | 'upi') => {
    setMode(next);
    setValidationError('');
    setState('idle');
    setResult(null);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="tsc-card">
        <div className="tsc-toggle" role="group" aria-label="Search by">
          <button type="button" className={mode === 'phone' ? 'on' : ''} aria-pressed={mode === 'phone'} onClick={() => switchMode('phone')}>Phone</button>
          <button type="button" className={mode === 'upi' ? 'on' : ''} aria-pressed={mode === 'upi'} onClick={() => switchMode('upi')}>UPI ID</button>
        </div>
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
        <button
          type="submit"
          disabled={state === 'searching' || !query.trim()}
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
        </button>
      </form>

      <div className="tsc-result">
        {state === 'found' && result && <ResultCard report={result} />}

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
