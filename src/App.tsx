import { useState, useEffect } from 'react';
import { ShieldCheck, ArrowLeft, Search, ShieldAlert, CircleCheck } from 'lucide-react';
import { SearchForm } from '@/components/SearchForm';
import { ReportForm } from '@/components/ReportForm';
import { AdminPanel } from '@/components/AdminPanel';
import './home.css';

type Route = 'home' | 'admin';

function getRouteFromPath(): Route {
  return window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
    ? 'admin'
    : 'home';
}

function usePathRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(getRouteFromPath);

  useEffect(() => {
    // Migrate old hash route #/admin → /admin
    if (window.location.hash === '#/admin') {
      window.history.replaceState(null, '', '/admin');
      setRoute('admin');
    }

    const onPopState = () => setRoute(getRouteFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (r: Route) => {
    const path = r === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setRoute(r);
  };

  return [route, navigate];
}

function App() {
  const [route, navigate] = usePathRoute();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={() => navigate('home')} className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-700/20 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="text-left min-w-0">
              <h1 className="font-bold text-slate-900 leading-none text-sm sm:text-base truncate">
                True Seller Check
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">Check Before You Pay</p>
            </div>
          </button>

          {route === 'admin' && (
            <button
              onClick={() => navigate('home')}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 px-3 py-2 rounded-xl transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </button>
          )}
        </div>
      </header>

      {route === 'admin' ? (
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <AdminPanel />
        </main>
      ) : (
        <main className="flex-1 tsc">
          <section className="tsc-hero">
            <svg className="tsc-hero-bg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" /></svg>
            <p className="tsc-eyebrow">BUY WITH CONFIDENCE</p>
            <h2 className="tsc-title">True Seller<br /><span className="tsc-title-accent">Check <ShieldCheck aria-hidden="true" /></span></h2>
            <p className="tsc-sub">Check a phone number or UPI ID against reports from other buyers.</p>
          </section>
          <SearchForm />
          <section className="tsc-steps" aria-label="How it works">
            <div className="tsc-step"><span className="tsc-step-icon"><Search /></span><strong>1. Search</strong><p>Enter a seller’s number or UPI</p></div>
            <div className="tsc-step"><span className="tsc-step-icon"><ShieldAlert /></span><strong>2. See reports</strong><p>Check reports from other buyers</p></div>
            <div className="tsc-step"><span className="tsc-step-icon"><CircleCheck /></span><strong>3. Decide</strong><p>Make an informed choice</p></div>
          </section>
          <ReportForm />
        </main>
      )}

      <footer className="bg-white border-t border-slate-200 py-5 mt-auto">
        <div className="max-w-xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800">True Seller Check</span>
          </div>
          <p className="text-slate-500 text-xs">Community-powered fraud prevention</p>
          <p className="text-slate-500 text-xs mt-2 max-w-md mx-auto leading-relaxed">
            TrueSellerCheck is an informational tool. A &quot;no match&quot; result does not guarantee a seller is
            safe.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
