-- Reports are stored individually, so an identifier cannot be globally unique.
-- In particular, a rejected report must not prevent a later submission.
DROP INDEX IF EXISTS public.fraud_reports_identifier_unique_idx;

-- Approving a report should approve that report, not delete it by merging it
-- into another approved row. This lets search return every approved report.
CREATE OR REPLACE FUNCTION public.approve_fraud_report(p_report_id uuid, p_admin_email text)
RETURNS public.fraud_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.fraud_reports%ROWTYPE;
BEGIN
  UPDATE public.fraud_reports
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = p_admin_email,
      updated_at = now()
  WHERE id = p_report_id AND status = 'pending'
  RETURNING * INTO v_report;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending report not found';
  END IF;

  RETURN v_report;
END;
$$;
