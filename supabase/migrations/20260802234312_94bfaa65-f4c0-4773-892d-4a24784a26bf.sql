ALTER TABLE public.finance_documents ADD COLUMN IF NOT EXISTS receipt_path text;

CREATE POLICY "finance receipts read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'finance-receipts');

CREATE POLICY "finance receipts insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'finance-receipts');