import { useState, useRef } from 'react';
import { Plus, Check, AlertCircle, UploadCloud, X } from 'lucide-react';
import { supabase, normalizeIdentifier, detectType, FRAUD_TYPE_LABELS, type FraudType } from '@/lib/supabase';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const FRAUD_TYPES: FraudType[] = ['fake_product', 'payment_scam', 'phishing', 'impersonation', 'other'];
const MAX_FILES = 5;
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function ReportForm() {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [description, setDescription] = useState('');
  const [amountLost, setAmountLost] = useState('');
  const [fraudType, setFraudType] = useState<FraudType>('payment_scam');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const normalized = normalizeIdentifier(identifier);
    if (!normalized || !description.trim()) return;

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
          setState('error');
          setErrorMsg('Could not upload one or more screenshots. Please try again.');
          return;
        }
        const { data: urlData } = supabase.storage
          .from('fraud-screenshots')
          .getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error } = await supabase.from('fraud_reports').insert({
        identifier: normalized,
        identifier_type: detectType(normalized),
        reporter_name: reporterName.trim() || null,
        description: description.trim(),
        amount_lost: amountLost ? parseFloat(amountLost) : null,
        fraud_type: fraudType,
        screenshot_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
      });

      if (error) {
        setState('error');
        setErrorMsg('Could not submit your report. Please try again.');
        return;
      }

      setState('success');
      setIdentifier('');
      setReporterName('');
      setDescription('');
      setAmountLost('');
      setFraudType('payment_scam');
      setFiles([]);
    } catch {
      setState('error');
      setErrorMsg('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <button
        onClick={() => {
          setOpen(!open);
          setState('idle');
        }}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Plus className={`w-5 h-5 text-blue-600 transition-transform ${open ? 'rotate-45' : ''}`} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-800">Report a Fraudulent Seller</h3>
            <p className="text-sm text-slate-500">Help others by reporting a scammer</p>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-5">
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
              {/* Identifier */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Seller's Phone or UPI ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or seller@okaxis"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Fraud type */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Type of Fraud</label>
                <select
                  value={fraudType}
                  onChange={(e) => setFraudType(e.target.value as FraudType)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
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
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Screenshot upload */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Attach Screenshots
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
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
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
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
