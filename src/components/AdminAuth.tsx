import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const ADMIN_SESSION_KEY = 'trueseller_admin_unlocked';

type AdminAuthProps = { onSuccess: () => void };

export function AdminAuth({ onSuccess }: AdminAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (authError) {
      setError('Could not sign in. Check your email and password.');
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    onSuccess();
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 mb-3"><Lock className="w-5 h-5 text-white" /></div>
          <h2 className="text-xl font-bold text-slate-800">Admin Access</h2>
          <p className="text-sm text-slate-500 mt-1">Sign in to review fraud reports</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
            <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <input id="admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="w-full px-4 pr-12 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {error && <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl p-3"><AlertCircle className="w-4 h-4 flex-shrink-0" /><p className="text-sm">{error}</p></div>}
          <button type="submit" disabled={loading} className="w-full min-h-12 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck className="w-3.5 h-3.5" /> Admin account required</div>
      </div>
    </div>
  );
}
