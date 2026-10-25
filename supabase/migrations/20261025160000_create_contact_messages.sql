CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  phone_number text NOT NULL CHECK (char_length(trim(phone_number)) BETWEEN 7 AND 24),
  message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_contact_messages" ON public.contact_messages;
CREATE POLICY "anon_insert_contact_messages"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "auth_select_contact_messages" ON public.contact_messages;
CREATE POLICY "auth_select_contact_messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS contact_messages_created_at_desc_idx
  ON public.contact_messages (created_at DESC);

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;
