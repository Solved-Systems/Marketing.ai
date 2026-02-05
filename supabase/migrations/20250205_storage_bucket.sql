-- Create storage bucket for temporary images (used for video animation)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp-images',
  'temp-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Users can upload temp images" ON storage.objects;
CREATE POLICY "Users can upload temp images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'temp-images' AND
    auth.role() = 'authenticated'
  );

-- Allow public read access for temp images
DROP POLICY IF EXISTS "Public read temp images" ON storage.objects;
CREATE POLICY "Public read temp images" ON storage.objects
  FOR SELECT USING (bucket_id = 'temp-images');

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access temp images" ON storage.objects;
CREATE POLICY "Service role full access temp images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'temp-images' AND
    auth.jwt() ->> 'role' = 'service_role'
  );
