import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ContactMessage = { id: string; name: string; phone_number: string; message: string; created_at: string };
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function ContactInbox() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
    if (loadError) {
      console.error('Contact inbox load failed:', loadError);
      setError('Could not load messages. Apply the contact messages migration and sign in as admin.');
    } else {
      setMessages((data ?? []) as ContactMessage[]);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadMessages(); }, [loadMessages]);

  return (
    <section className="mb-7 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="contact-inbox-title">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-700" /><h2 id="contact-inbox-title" className="text-lg font-bold text-slate-900">Contact messages</h2><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{messages.length}</span></div><p className="mt-1 text-xs text-slate-500">Latest 100 messages. Contact users directly on WhatsApp.</p></div>
        <button type="button" onClick={() => void loadMessages()} disabled={loading} aria-label="Refresh contact messages" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : loading ? <div className="py-8 text-center text-sm text-slate-500">Loading messages…</div> : messages.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">No contact messages yet.</div> : (
        <div className="space-y-3">
          {messages.map((item) => {
            const target = whatsappNumber(item.phone_number);
            const url = `https://wa.me/${target}?text=${encodeURIComponent(`Hi ${item.name}, we received your message on True Seller Check.`)}`;
            return <article key={item.id} className="rounded-xl border border-slate-200 p-3.5 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="font-semibold text-slate-900">{item.name}</h3><p className="mt-0.5 text-sm text-slate-600">{item.phone_number}</p></div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#128C7E] px-3.5 text-sm font-semibold text-white hover:bg-[#0e7468]"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{item.message}</p>
              <time className="mt-3 block text-xs text-slate-500" dateTime={item.created_at}>{dateFormat.format(new Date(item.created_at))}</time>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
