import { useState, useRef } from 'react';
import { Check, AlertCircle, UploadCloud, X } from 'lucide-react';
import { supabase, validateIdentifier, FRAUD_TYPE_LABELS, type FraudType } from '@/lib/supabase';
import { decodeQrImage, extractUpiId } from '@/lib/upiQr';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';
type IdentifierMode = 'phone' | 'upi' | 'qr';

const FRAUD_TYPES: FraudType[] = ['fake_product', 'payment_scam', 'phishing', 'impersonation', 'other'];
const MAX_FILES = 5;
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function ReportForm() {
  const [open, setOpen] = useState(false);
  const [identifierMode, setIdentifierMode] = useState<IdentifierMode>('phone');
  const [identifier, setIdentifier] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [description, setDescription] = useState('');
  const [amountLost, setAmountLost] = useState('');
  const [fraudType, setFraudType] = useState<FraudType>('payment_scam');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [decodingQr, setDecodingQr] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const handleQrChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    if (!file.type.startsWith('image/')) {
      setUploadError('Choose an image of the fraud QR code.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`The QR image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setDecodingQr(true);
    try {
      const payload = await decodeQrImage(file);
      const upiId = payload ? extractUpiId(payload) : null;
      const checked = upiId ? validateIdentifier(upiId, 'upi') : null;
      if (!checked?.ok) {
        setUploadError(payload ? 'This QR code does not contain a valid UPI ID.' : 'Could not read a QR code from this image. Try a clearer image.');
        return;
      }
      if (files.length >= MAX_FILES) {
        setUploadError(`The QR image was read, but you can attach up to ${MAX_FILES} images total. Remove an image to attach this QR as evidence.`);
        return;
      }
      setIdentifier(checked.value);
      setIdentifierError('');
      setFiles((current) => [...current, file]);
    } catch {
      setUploadError('Could not open this image. Please choose a JPG or PNG QR image.');
    } finally {
      setDecodingQr(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const valid: File[] = [];
    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only image files are allowed.');
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setUploadError(`Each file must be under ${MAX_SIZE_MB}MB.`);
        continue;
      }
      valid.push(file);
    }

    const combined = [...files, ...valid].slice(0, MAX_FILES);
    setFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const checked = validateIdentifier(identifier, identifierMode === 'qr' ? 'upi' : identifierMode);
    if (!checked.ok) {
      setIdentifierError(checked.error);
      return;
    }
    setIdentifierError('');

    setState('submitting');
    setErrorMsg('');

    try {
      // Upload screenshots first
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('fraud-screenshots')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Fraud screenshot upload failed:', uploadError);
          setState('error');
          setErrorMsg('Could not upload a screenshot. Please check your connection and try again.');
          return;
        }
        const { data: urlData } = supabase.storage
          .from('fraud-screenshots')
          .getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from('fraud_reports').insert({
        identifier: checked.value,
        identifier_type: checked.type,
        reporter_name: reporterName.trim() || null,
        description: description.trim(),
        amount_lost: amountLost ? parseFloat(amountLost) : null,
        fraud_type: fraudType,
        screenshot_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
      });

      if (error) {
        console.error('Fraud report submission failed:', error);
        setState('error');
        setErrorMsg(error.code === '23505'
          ? 'A report for this seller already exists. Please check the number or UPI ID.'
          : 'Could not submit your report. Please check your connection and try again.');
        return;
      }

      setState('success');
      setIdentifier('');
      setIdentifierError('');
      setReporterName('');
      setDescription('');
      setAmountLost('');
      setFraudType('payment_scam');
      setIdentifierMode('phone');
      setFiles([]);
    } catch (error) {
      console.error('Unexpected fraud report submission error:', error);
      setState('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="tsc-report-card">
      <button
        onClick={() => {
          setOpen(!open);
          setState('idle');
        }}
        aria-expanded={open}
        className="tsc-report"
      >
        <svg className="tsc-report-bg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l9 16H3L12 3z" />
        </svg>
        <span className="tsc-report-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B93C0A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 21V4" />
            <path d="M5 4h12l-2 4 2 4H5" />
          </svg>
        </span>
        <span className="tsc-report-text">
            <strong>Report a new fraud</strong>
            <small>Help protect other buyers</small>
        </span>
        <span className={`tsc-report-arrow ${open ? 'is-open' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B93C0A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="tsc-report-content px-4 sm:px-5 pb-5 pt-4">
          {state === 'success' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <h4 className="font-bold text-emerald-900 text-lg mb-1">Report Submitted</h4>
              <p className="text-emerald-700 mb-4">Thank you for helping protect others from fraud.</p>
              <button
                onClick={() => setState('idle')}
                className="text-emerald-700 font-medium underline hover:text-emerald-900"
              >
                Report another seller
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Choose identifier type */}
              <div>
                <label htmlFor="identifier-mode" className="block text-sm font-medium text-slate-600 mb-1.5">
                  Report using <span className="text-red-500">*</span>
                </label>
                <select id="identifier-mode" value={identifierMode} onChange={(e) => { setIdentifierMode(e.target.value as IdentifierMode); setIdentifier(''); setIdentifierError(''); setUploadError(''); }} className="w-full min-h-12 px-4 py-3 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all">
                  <option value="phone">Phone Number</option>
                  <option value="upi">UPI</option>
                  <option value="qr">QR</option>
                </select>
              </div>

              {/* Identifier */}
              {identifierMode !== 'qr' && <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  {identifierMode === 'phone' ? 'Seller’s Phone Number' : 'Seller’s UPI ID'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (identifierError) setIdentifierError('');
                  }}
                  placeholder={identifierMode === 'phone' ? 'e.g. 9876543210 or +91…' : 'e.g. seller@okaxis'}
                  required
                  aria-invalid={!!identifierError}
                  aria-describedby={identifierError ? 'report-identifier-error' : undefined}
                  className={`w-full min-h-12 px-4 py-3 rounded-xl border text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    identifierError
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                />
                {identifierError && (
                  <p id="report-identifier-error" className="text-sm text-red-600 mt-1.5" role="alert">
                    {identifierError}
                  </p>
                )}
              </div>}

              {/* Fraud type */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Type of Fraud</label>
                <select
                  value={fraudType}
                  onChange={(e) => setFraudType(e.target.value as FraudType)}
                  className="w-full min-h-12 px-4 py-3 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  {FRAUD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FRAUD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Describe what happened <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the fraudulent activity..."
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Reporter name */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Your Name (optional)</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="Your name"
                    className="w-full min-h-12 px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Amount lost */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Amount Lost (₹)</label>
                  <input
                    type="number"
                    value={amountLost}
                    onChange={(e) => setAmountLost(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full min-h-12 px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* QR upload */}
              {identifierMode === 'qr' && <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Upload seller’s UPI QR code <span className="text-red-500">*</span></label>
                <input ref={qrInputRef} type="file" accept="image/*" onChange={(e) => void handleQrChange(e)} className="hidden" />
                <button type="button" onClick={() => qrInputRef.current?.click()} disabled={decodingQr} className="w-full border-2 border-dashed border-indigo-200 rounded-xl p-4 text-left hover:border-indigo-400 hover:bg-indigo-50/50 transition-all disabled:opacity-60">
                  <span className="flex items-center gap-3"><UploadCloud className="w-6 h-6 text-indigo-500" /><span><span className="block text-sm text-slate-700 font-medium">{decodingQr ? 'Reading QR code…' : identifier || 'Choose the QR image you paid'} </span><span className="block text-xs text-slate-500 mt-0.5">We’ll extract the UPI ID and save it with this fraud report.</span></span></span>
                </button>
              </div>}

              {/* Screenshot upload */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Attach Screenshots (optional)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Click to upload screenshots</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Up to {MAX_FILES} images, {MAX_SIZE_MB}MB each — PNG, JPG, etc.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {uploadError && (
                  <p className="text-xs text-red-500 mt-2">{uploadError}</p>
                )}

                {files.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                    {files.map((file, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                        <img src={URL.createObjectURL(file)} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i);
                          }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {state === 'error' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={state === 'submitting' || !identifier.trim() || !description.trim()}
                className="w-full sm:w-auto min-h-12 px-8 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.99]"
              >
                {state === 'submitting' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Report'
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
