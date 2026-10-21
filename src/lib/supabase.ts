import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type FraudType = 'fake_product' | 'payment_scam' | 'phishing' | 'impersonation' | 'other';

export interface FraudReport {
  id: string;
  identifier: string;
  identifier_type: 'phone' | 'upi';
  reporter_name: string | null;
  description: string;
  amount_lost: number | null;
  fraud_type: FraudType;
  report_count: number;
  screenshot_urls: string[] | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ReportStatus = 'pending' | 'approved' | 'rejected';

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export const FRAUD_TYPE_LABELS: Record<FraudType, string> = {
  fake_product: 'Fake Product',
  payment_scam: 'Payment Scam',
  phishing: 'Phishing',
  impersonation: 'Impersonation',
  other: 'Other',
};

export const FRAUD_TYPE_COLORS: Record<FraudType, string> = {
  fake_product: 'bg-orange-100 text-orange-700 border-orange-200',
  payment_scam: 'bg-red-100 text-red-700 border-red-200',
  phishing: 'bg-purple-100 text-purple-700 border-purple-200',
  impersonation: 'bg-blue-100 text-blue-700 border-blue-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function normalizeIdentifier(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '');
}

export function detectType(identifier: string): 'phone' | 'upi' {
  return identifier.includes('@') ? 'upi' : 'phone';
}
