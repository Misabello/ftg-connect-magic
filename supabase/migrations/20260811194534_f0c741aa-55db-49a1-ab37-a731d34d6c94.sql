CREATE POLICY "finance docs upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'finance-receipts'
  AND (storage.foldername(name))[1] = 'documentos'
  AND public.user_can_access_org(NULLIF((storage.foldername(name))[2], '')::uuid)
);

CREATE POLICY "finance docs read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'finance-receipts'
  AND (storage.foldername(name))[1] = 'documentos'
  AND public.user_can_access_org(NULLIF((storage.foldername(name))[2], '')::uuid)
);