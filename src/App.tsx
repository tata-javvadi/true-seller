import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { SearchForm } from '@/components/SearchForm';
import { ReportForm } from '@/components/ReportForm';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-none">TrueSellerCheck</h1>
              <p className="text-xs text-slate-500 mt-0.5">Check Before You Pay</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12 flex flex-col justify-center">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <ShieldAlert className="w-4 h-4" />
            Protect yourself from payment fraud
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-slate-800 leading-tight mb-4">
            Is that seller safe to pay?
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Enter a phone number or UPI ID to check it against our community fraud database before you make a payment.
          </p>
        </div>

        {/* Search */}
        <div className="mb-10">
          <SearchForm />
        </div>

        {/* Report */}
        <ReportForm />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">TrueSellerCheck</span>
          </div>
          <p className="text-slate-500 text-sm">Check Before You Pay — community-powered fraud prevention</p>
          <p className="text-slate-600 text-xs mt-2">
            TrueSellerCheck is an informational tool. A "no match" result does not guarantee a seller is safe.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
