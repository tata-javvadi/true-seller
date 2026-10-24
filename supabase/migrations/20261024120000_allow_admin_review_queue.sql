-- Allow authenticated admin sessions to read pending and reviewed reports.
-- Anonymous users remain limited to the approved-only policy.
DROP POLICY IF EXISTS "auth_select_fraud_reports" ON fraud_reports;
CREATE POLICY "auth_select_fraud_reports"
  ON fraud_reports FOR SELECT
  TO authenticated
  USING (true);
