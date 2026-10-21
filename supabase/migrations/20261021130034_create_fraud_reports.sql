/*
# Create fraud_reports table

1. New Tables
- `fraud_reports`
  - `id` (uuid, primary key)
  - `identifier` (text, not null) — the phone number or UPI ID of the reported seller, normalized (lowercase, trimmed, no spaces)
  - `identifier_type` (text, not null) — 'phone' or 'upi'
  - `reporter_name` (text, nullable) — optional name of the person reporting
  - `description` (text, not null) — description of the fraudulent activity
  - `amount_lost` (numeric, nullable) — optional amount lost in INR
  - `fraud_type` (text, not null) — category: 'fake_product', 'payment_scam', 'phishing', 'impersonation', 'other'
  - `report_count` (integer, default 1) — number of times this identifier has been reported (increments on duplicate reports)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
2. Security
- Enable RLS on `fraud_reports`.
- Allow anon + authenticated SELECT so anyone can check the fraud database without signing in.
- Allow anon + authenticated INSERT so anyone can report a fraudulent seller.
- No UPDATE or DELETE from the client (reports are immutable once submitted).
3. Indexes
- Unique index on `identifier` to deduplicate reports (combined with increment logic).
- Index on `identifier_type` for filtered lookups.
- Index on `created_at` desc for recent reports.
4. Notes
- The app is single-tenant (no sign-in). Anyone can search and report.
- On a new report for an existing identifier, a trigger increments `report_count` and `updated_at` instead of creating a duplicate row.
*/

CREATE TABLE IF NOT EXISTS fraud_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('phone', 'upi')),
  reporter_name text,
  description text NOT NULL,
  amount_lost numeric(12, 2),
  fraud_type text NOT NULL CHECK (fraud_type IN ('fake_product', 'payment_scam', 'phishing', 'impersonation', 'other')) DEFAULT 'other',
  report_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fraud_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_fraud_reports" ON fraud_reports;
CREATE POLICY "anon_select_fraud_reports"
  ON fraud_reports FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon_insert_fraud_reports" ON fraud_reports;
CREATE POLICY "anon_insert_fraud_reports"
  ON fraud_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Unique constraint on identifier so the trigger can upsert
CREATE UNIQUE INDEX IF NOT EXISTS fraud_reports_identifier_unique_idx
  ON fraud_reports (identifier);

CREATE INDEX IF NOT EXISTS fraud_reports_identifier_type_idx
  ON fraud_reports (identifier_type);

CREATE INDEX IF NOT EXISTS fraud_reports_created_at_desc_idx
  ON fraud_reports (created_at DESC);

-- Function to handle duplicate reports: increment report_count instead of creating a new row
CREATE OR REPLACE FUNCTION handle_duplicate_fraud_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If a row with the same identifier already exists, increment its report_count
  IF EXISTS (SELECT 1 FROM fraud_reports WHERE identifier = NEW.identifier) THEN
    UPDATE fraud_reports
    SET report_count = report_count + 1,
        updated_at = now()
    WHERE identifier = NEW.identifier;
    RETURN NULL; -- suppress the INSERT
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_fraud_report_insert ON fraud_reports;
CREATE TRIGGER on_fraud_report_insert
  BEFORE INSERT ON fraud_reports
  FOR EACH ROW
  EXECUTE FUNCTION handle_duplicate_fraud_report();

-- Seed sample fraud reports so the app has data to search against
INSERT INTO fraud_reports (identifier, identifier_type, reporter_name, description, amount_lost, fraud_type)
VALUES
  ('9876543210', 'phone', 'Rahul Sharma', 'Seller asked for advance payment via UPI and never delivered the product. Phone goes unreachable after payment.', 4500.00, 'payment_scam'),
  ('fraudseller@paytm', 'upi', 'Priya Patel', 'Received a fake product — counterfeit shoes instead of branded ones. Seller blocked me after delivery.', 3200.00, 'fake_product'),
  ('scammer@okaxis', 'upi', 'Amit Kumar', 'Claimed to sell electronics at huge discount. Took advance and disappeared. Same UPI linked to multiple complaints.', 15000.00, 'payment_scam'),
  ('9123456780', 'phone', 'Sneha Reddy', 'Received phishing call claiming my bank account was blocked. Asked for OTP and UPI PIN. Reported to cybercrime.', 0.00, 'phishing'),
  ('fakestore@ybl', 'upi', 'Mohammed Ali', 'Impersonated a well-known seller page. Sent counterfeit goods and refused returns.', 5800.00, 'impersonation')
ON CONFLICT (identifier) DO NOTHING;