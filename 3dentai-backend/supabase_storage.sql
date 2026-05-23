-- ============================================================
-- 3DentAI Storage Setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Run AFTER supabase_setup.sql
-- ============================================================

-- Create the panoramic-images bucket (public so images load in browser)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'panoramic-images',
  'panoramic-images',
  true,
  52428800,  -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload panoramic images
DROP POLICY IF EXISTS "Authenticated upload panoramic" ON storage.objects;
CREATE POLICY "Authenticated upload panoramic"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'panoramic-images');

-- Allow authenticated users to read panoramic images
DROP POLICY IF EXISTS "Authenticated read panoramic" ON storage.objects;
CREATE POLICY "Authenticated read panoramic"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'panoramic-images');

-- Allow public (unauthenticated) reads so <img src="..."> works without auth headers
DROP POLICY IF EXISTS "Public read panoramic" ON storage.objects;
CREATE POLICY "Public read panoramic"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'panoramic-images');

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Authenticated delete panoramic" ON storage.objects;
CREATE POLICY "Authenticated delete panoramic"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'panoramic-images');
