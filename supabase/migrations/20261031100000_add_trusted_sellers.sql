CREATE TABLE IF NOT EXISTS public.trusted_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL UNIQUE,
  identifier_type text NOT NULL CHECK (identifier_type IN ('phone', 'upi')),
  display_name text,
  verification_note text,
  active boolean NOT NULL DEFAULT true,
  verified_by text,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trusted_sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_trusted_sellers" ON public.trusted_sellers;
DROP POLICY IF EXISTS "admin_read_all_trusted_sellers" ON public.trusted_sellers;
CREATE POLICY "admin_read_all_trusted_sellers"
  ON public.trusted_sellers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_insert_trusted_sellers" ON public.trusted_sellers;
CREATE POLICY "admin_insert_trusted_sellers"
  ON public.trusted_sellers FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_trusted_sellers" ON public.trusted_sellers;
CREATE POLICY "admin_update_trusted_sellers"
  ON public.trusted_sellers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.trusted_sellers TO authenticated;
GRANT INSERT, UPDATE ON public.trusted_sellers TO authenticated;

CREATE INDEX IF NOT EXISTS trusted_sellers_active_idx
  ON public.trusted_sellers (active, identifier);

-- Public lookups are scoped to a single exact identifier so the complete
-- genuine-seller list cannot be enumerated with the anonymous API key.
CREATE OR REPLACE FUNCTION public.lookup_trusted_seller(p_identifier text)
RETURNS TABLE (
  identifier text,
  identifier_type text,
  display_name text,
  verification_note text,
  verified_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.identifier, s.identifier_type, s.display_name, s.verification_note, s.verified_at
  FROM public.trusted_sellers s
  WHERE s.identifier = p_identifier AND s.active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_trusted_seller(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_trusted_seller(text) TO anon, authenticated;
