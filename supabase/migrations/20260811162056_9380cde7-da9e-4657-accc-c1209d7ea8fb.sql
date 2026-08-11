CREATE POLICY "invoice_inbox_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoice-inbox');
CREATE POLICY "invoice_inbox_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoice-inbox');
CREATE POLICY "invoice_inbox_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'invoice-inbox') WITH CHECK (bucket_id = 'invoice-inbox');