/*
# Add admin approval workflow to fraud reports

1. Modified Tables
- `fraud_reports`
  - Add `status` (text, not null, default 'pending') — 'pending' = user-submitted, awaiting admin review; 'approved' = admin verified and live in fraud database; 'rejected' = admin dismissed the report
  - Add `reviewed_at` (timestamptz, nullable) — when the admin approved or rejected
  - Add `reviewed_by` (text, nullable) — email of admin who reviewed
2. Security Changes
- Replace the SELECT policy: anon + authenticated can only read rows with status = 'approved'. This means user-submitted reports stay invisible until the admin approves them.
- Keep INSERT policy open to anon + authenticated (anyone can report).
- Add UPDATE policy scoped to authenticated only — so only a signed-in admin can approve/reject reports by changing status. The anon-key frontend cannot modify reports.
- No DELETE policy (reports are never deleted, only rejected).
3. Function Changes
- Update the duplicate-report trigger: only increment report_count for APPROVED reports. Pending reports for the same identifier are fine to have multiple rows (different users reporting), but the trigger should not suppress a new pending report just because an approved one exists. Actually — the trigger fires BEFORE INSERT for ALL rows. We need to reconsider: pending reports should not be deduplicated by the trigger. Only when an admin approves a report should it become searchable. So we update the trigger to only deduplicate when the NEW row would be approved (which won't happen since new inserts are always 'pending') — effectively, we disable dedup for pending inserts and handle merging at approval time.
- New function `approve_fraud_report(p_report_id uuid, p_admin_email text)` — SECURITY DEFINER function that approves a pending report, incrementing report_count if an approved report with the same identifier already exists (merging), and setting status/reviewed fields. Returns the approved report.
- New function `reject_fraud_report(p_report_id uuid, p_admin_email text)` — SECURITY DEFINER function that sets a pending report to rejected.
4. Notes
- The admin signs in with email/password via Supabase Auth. Any authenticated user is treated as an admin (small team). You'll create your admin account via the sign-up form in the admin panel.
- The public search (anon key) only sees approved reports. Pending/rejected reports are invisible to the public.
- When an admin approves a report for an identifier that already has an approved report, the trigger merges them (increments count) and removes the pending duplicate so there's a single canonical row.
*/

-- Add status column
ALTER TABLE fraud_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE fraud_reports
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE fraud_reports
  ADD COLUMN IF NOT EXISTS reviewed_by text;

-- Update existing seed rows to 'approved' so the public search still works
UPDATE fraud_reports SET status = 'approved', reviewed_at = now(), reviewed_by = 'system'
  WHERE status = 'pending';

-- Replace SELECT policy: public can only see approved reports
DROP POLICY IF EXISTS "anon_select_fraud_reports" ON fraud_reports;
CREATE POLICY "anon_select_approved_fraud_reports"
  ON fraud_reports FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Keep INSERT open (anyone can submit a report)
-- The existing insert policy is fine, but re-create to be safe
DROP POLICY IF EXISTS "anon_insert_fraud_reports" ON fraud_reports;
CREATE POLICY "anon_insert_fraud_reports"
  ON fraud_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- New UPDATE policy: only authenticated (admin) users can update reports
DROP POLICY IF EXISTS "auth_update_fraud_reports" ON fraud_reports;
CREATE POLICY "auth_update_fraud_reports"
  ON fraud_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update the duplicate-report trigger to NOT deduplicate pending inserts.
-- New user reports are always 'pending', so we should let them all through.
-- We'll rewrite the trigger function to only deduplicate approved rows being inserted
-- (which won't happen from the client since new rows are pending), effectively
-- making the trigger a no-op for user-submitted pending reports.
CREATE OR REPLACE FUNCTION handle_duplicate_fraud_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only deduplicate when inserting an approved row (admin action).
  -- For pending user reports, always allow.
  IF NEW.status = 'approved' AND EXISTS (
    SELECT 1 FROM fraud_reports WHERE identifier = NEW.identifier AND status = 'approved'
  ) THEN
    UPDATE fraud_reports
    SET report_count = report_count + 1,
        updated_at = now()
    WHERE identifier = NEW.identifier AND status = 'approved';
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to approve a pending report (admin action)
CREATE OR REPLACE FUNCTION approve_fraud_report(p_report_id uuid, p_admin_email text)
RETURNS fraud_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report fraud_reports%ROWTYPE;
  v_existing fraud_reports%ROWTYPE;
BEGIN
  -- Fetch the pending report
  SELECT * INTO v_report FROM fraud_reports WHERE id = p_report_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending report not found';
  END IF;

  -- Check if an approved report with the same identifier already exists
  SELECT * INTO v_existing FROM fraud_reports
    WHERE identifier = v_report.identifier AND status = 'approved' AND id <> p_report_id
    LIMIT 1;

  IF FOUND THEN
    -- Merge: increment the existing approved report's count, delete the pending one
    UPDATE fraud_reports
    SET report_count = report_count + 1,
        updated_at = now()
    WHERE id = v_existing.id;

    -- Delete the pending report (it's been merged)
    DELETE FROM fraud_reports WHERE id = p_report_id;

    -- Return the merged approved report
    SELECT * INTO v_report FROM fraud_reports WHERE id = v_existing.id;
    RETURN v_report;
  ELSE
    -- No existing approved report: promote this pending report to approved
    UPDATE fraud_reports
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = p_admin_email,
        updated_at = now()
    WHERE id = p_report_id;

    SELECT * INTO v_report FROM fraud_reports WHERE id = p_report_id;
    RETURN v_report;
  END IF;
END;
$$;

-- Function to reject a pending report (admin action)
CREATE OR REPLACE FUNCTION reject_fraud_report(p_report_id uuid, p_admin_email text)
RETURNS fraud_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report fraud_reports%ROWTYPE;
BEGIN
  UPDATE fraud_reports
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = p_admin_email
  WHERE id = p_report_id AND status = 'pending';

  SELECT * INTO v_report FROM fraud_reports WHERE id = p_report_id;
  RETURN v_report;
END;
$$;

-- Index on status for admin queries
CREATE INDEX IF NOT EXISTS fraud_reports_status_idx ON fraud_reports (status);