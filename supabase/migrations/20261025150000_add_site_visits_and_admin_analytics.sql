-- Record anonymous home page visits without storing IP addresses or user data.
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_site_visits" ON public.site_visits;
CREATE POLICY "anon_insert_site_visits"
  ON public.site_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_site_visits" ON public.site_visits;
CREATE POLICY "auth_select_site_visits"
  ON public.site_visits FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS site_visits_created_at_desc_idx
  ON public.site_visits (created_at DESC);

GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT SELECT ON public.site_visits TO authenticated;
GRANT INSERT ON public.search_logs TO anon, authenticated;
GRANT SELECT ON public.search_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'site_visits', (SELECT count(*) FROM public.site_visits),
    'searches', (SELECT count(*) FROM public.search_logs),
    'fraud_matches', (SELECT count(*) FROM public.search_logs WHERE result = 'found'),
    'no_matches', (SELECT count(*) FROM public.search_logs WHERE result = 'not_found'),
    'reports', (
      SELECT jsonb_build_object(
        'total', count(*),
        'pending', count(*) FILTER (WHERE status = 'pending'),
        'approved', count(*) FILTER (WHERE status = 'approved'),
        'rejected', count(*) FILTER (WHERE status = 'rejected')
      ) FROM public.fraud_reports
    ),
    'search_sources', (
      SELECT jsonb_build_object(
        'phone', count(*) FILTER (WHERE search_source = 'phone'),
        'upi', count(*) FILTER (WHERE search_source = 'upi'),
        'qr', count(*) FILTER (WHERE search_source = 'qr')
      ) FROM public.search_logs
    ),
    'daily_activity', (
      SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.day), '[]'::jsonb)
      FROM (
        SELECT days.day::date AS day,
          (SELECT count(*) FROM public.site_visits v WHERE v.created_at >= days.day AND v.created_at < days.day + interval '1 day') AS visits,
          (SELECT count(*) FROM public.search_logs s WHERE s.created_at >= days.day AND s.created_at < days.day + interval '1 day') AS searches,
          (SELECT count(*) FROM public.search_logs s WHERE s.created_at >= days.day AND s.created_at < days.day + interval '1 day' AND s.result = 'found') AS fraud_matches
        FROM generate_series(current_date - 29, current_date, interval '1 day') AS days(day)
      ) d
    ),
    'top_searches', (
      SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      FROM (
        SELECT identifier, identifier_type, count(*) AS searches,
          count(*) FILTER (WHERE result = 'found') AS fraud_matches,
          max(created_at) AS last_searched_at
        FROM public.search_logs
        GROUP BY identifier, identifier_type
        ORDER BY count(*) DESC, max(created_at) DESC
        LIMIT 10
      ) t
    ),
    'recent_searches', (
      SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT identifier, identifier_type, search_source, result, created_at
        FROM public.search_logs
        ORDER BY created_at DESC
        LIMIT 25
      ) r
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;
