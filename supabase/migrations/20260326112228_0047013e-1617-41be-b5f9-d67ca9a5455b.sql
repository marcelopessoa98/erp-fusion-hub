
-- Add arquivo_url column to documentos_funcionarios
ALTER TABLE public.documentos_funcionarios ADD COLUMN IF NOT EXISTS arquivo_url TEXT;

-- Create private storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-funcionarios', 'documentos-funcionarios', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for documentos-funcionarios bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documentos-funcionarios');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documentos-funcionarios');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos-funcionarios');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documentos-funcionarios');
