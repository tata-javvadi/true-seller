import { useState } from 'react';
import { Check, ChevronDown, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SubmitState = 'idle' | 'sending' | 'sent' | 'error';

export function ContactForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setError('Enter a valid phone number, including the country code if needed.');
      return;
    }
    if (!name.trim() || !message.trim()) return;

    setState('sending');
    setError('');
    const { error: insertError } = await supabase.from('contact_messages').insert({
      name: name.trim(),
      phone_number: phone.trim(),
      message: message.trim(),
    });
    if (insertError) {
      console.error('Contact form submission failed:', insertError);
      setState('error');
      setError('Could not send your message. Please try again.');
      return;
    }
    setName('');
    setPhone('');
    setMessage('');
    setState('sent');
    setOpen(true);
  };

  return (
    <section className="contact-card" aria-labelledby="contact-title">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="contact-form-content" className="contact-toggle flex w-full items-center gap-3 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800"><MessageCircle className="h-5 w-5" /></span>
        <div className="flex-1"><h2 id="contact-title" className="font-bold text-slate-900">Contact us</h2><p className="text-xs text-slate-600">Send a message to the admin team</p></div>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div id="contact-form-content">
      {state === 'sent' ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <Check className="mx-auto h-6 w-6 text-emerald-700" />
          <p className="mt-1 font-semibold text-emerald-900">Message sent</p>
          <p className="text-sm text-emerald-800">The admin team will contact you on WhatsApp.</p>
          <button type="button" onClick={() => setState('idle')} className="mt-2 text-sm font-semibold text-emerald-800 underline">Send another message</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">Your name
            <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Name" className="contact-field mt-1.5" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Phone number
            <input required type="tel" maxLength={24} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="e.g. +91 98765 43210" className="contact-field mt-1.5" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Message
            <textarea required maxLength={2000} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" className="contact-field mt-1.5 resize-y" />
            <span className="mt-1 block text-right text-xs text-slate-500">{message.length}/2000</span>
          </label>
          {(error || state === 'error') && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <button type="submit" disabled={state === 'sending'} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            <Send className="h-4 w-4" />{state === 'sending' ? 'Sending…' : 'Send message'}
          </button>
          <p className="text-xs leading-relaxed text-slate-500">Your phone number will be shared with the admin team so they can reply on WhatsApp.</p>
        </form>
      )}
      </div>}
    </section>
  );
}
