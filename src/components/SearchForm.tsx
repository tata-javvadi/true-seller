import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { supabase, normalizeIdentifier, detectType, type FraudReport } from '@/lib/supabase';
import { ResultCard } from './ResultCard';

type SearchState = 'idle' | 'searching' | 'found' | 'safe' | 'error';

export function SearchForm() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [result, setResult] = useState<FraudReport | null>(null);
  const [searchedIdentifier, setSearchedIdentifier] = useState('');

  const handleSearch = useCallback(async () => {
    const normalized = normalizeIdentifier(query);
    if (!normalized) {
      setState('idle');
      setResult(null);
      return;
    }

    setState('searching');
    setResult(null);
    setSearchedIdentifier(normalized);

    try {
      const { data, error } = await supabase
        .from('fraud_reports')
        .select('*')
        .eq('identifier', normalized)
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
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter seller's phone number or UPI ID (e.g. 9876543210 or name@bank)"
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          disabled={state === 'searching' || !query.trim()}
          className="px-8 py-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
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

      <div className="mt-6">
        {state === 'found' && result && <ResultCard report={result} />}

        {state === 'safe' && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center animate-[fadeIn_0.4s_ease]">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-900 mb-2">No Fraud Reports Found</h3>
            <p className="text-emerald-700 max-w-md mx-auto">
              We checked our fraud database for the {detectType(searchedIdentifier) === 'phone' ? 'phone number' : 'UPI ID'}{' '}
              <span className="font-semibold">{searchedIdentifier}</span> and found no matching reports.
            </p>
            <p className="text-sm text-emerald-600 mt-4">
              This doesn't guarantee the seller is safe — always stay alert when making payments.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-amber-800 font-medium">
              Something went wrong while checking. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
