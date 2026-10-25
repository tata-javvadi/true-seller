/*
# Create search_logs table

1. New Tables
- `search_logs`
  - `id` (uuid, primary key)
  - `identifier` (text, not null) — the normalized phone number or UPI ID that was searched
  - `identifier_type` (text, not null) — 'phone' or 'upi'
  - `search_source` (text, not null) — how the search was entered: 'phone', 'upi' or 'qr'
  - `result` (text, not null) — 'found' (approved report exists) or 'not_found'
  - `matched_report_id` (uuid, nullable) — the approved report that matched, if any
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `search_logs`.
- Allow anon + authenticated INSERT so every search can be logged without sign-in.
- Allow authenticated SELECT only (admin). Searched numbers are sensitive, so the public must not read them.
- No UPDATE or DELETE from the client (logs are immutable).
3. Indexes
- Index on `identifier` for "how often was this number searched" queries.
- Index on `created_at` desc for recent searches.
4. Notes
- No IP address or user info is stored, since the app has no sign-in.
*/

CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL CHECK (char_length(identifier) BETWEEN 2 AND 320),
  identifier_type text NOT NULL CHECK (identifier_type IN ('phone', 'upi')),
  search_source text NOT NULL CHECK (search_source IN ('phone', 'upi', 'qr')),
  result text NOT NULL CHECK (result IN ('found', 'not_found')),
  matched_report_id uuid REFERENCES fraud_reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_search_logs" ON search_logs;
CREATE POLICY "anon_insert_search_logs"
  ON search_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_search_logs" ON search_logs;
CREATE POLICY "auth_select_search_logs"
  ON search_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS search_logs_identifier_idx
  ON search_logs (identifier);

CREATE INDEX IF NOT EXISTS search_logs_created_at_desc_idx
  ON search_logs (created_at DESC);
