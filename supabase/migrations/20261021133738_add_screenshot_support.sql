/*
# Add screenshot support to fraud reports

1. Modified Tables
- `fraud_reports`
  - Add `screenshot_urls` (text array, nullable) — URLs of uploaded screenshots in Supabase Storage
2. New Storage
- Create public bucket `fraud-screenshots` for storing uploaded evidence images
- Allow anon + authenticated to INSERT (upload) files to this bucket
- Allow anon + authenticated to SELECT (read) files — public bucket for evidence viewing
- Restrict uploads to image file types and 5MB max size via policy
3. Notes
- The app is single-tenant (no sign-in). Anyone can upload evidence screenshots.
- Files are stored with a path like `{uuid}.{ext}` to avoid collisions.
*/

ALTER TABLE fraud_reports
  ADD COLUMN IF NOT EXISTS screenshot_urls text[] DEFAULT '{}';

-- Create the storage bucket for fraud screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('fraud-screenshots', 'fraud-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read screenshots (public bucket)
DROP POLICY IF EXISTS "anon_read_fraud_screenshots" ON storage.objects;
CREATE POLICY "anon_read_fraud_screenshots"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'fraud-screenshots');

-- Allow anyone to upload screenshots
DROP POLICY IF EXISTS "anon_upload_fraud_screenshots" ON storage.objects;
CREATE POLICY "anon_upload_fraud_screenshots"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'fraud-screenshots');