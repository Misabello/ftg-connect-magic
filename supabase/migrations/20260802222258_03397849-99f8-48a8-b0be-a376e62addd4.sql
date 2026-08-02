CREATE POLICY "customer_media_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'customer-media' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "customer_media_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customer-media' AND owner = auth.uid());
CREATE POLICY "customer_media_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'customer-media' AND owner = auth.uid());
CREATE POLICY "customer_media_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'customer-media' AND (owner = auth.uid() OR public.is_admin(auth.uid())));

CREATE POLICY "ai_characters_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ai-characters');
CREATE POLICY "ai_characters_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-characters' AND public.is_admin(auth.uid()));
CREATE POLICY "ai_characters_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ai-characters' AND public.is_admin(auth.uid()));
CREATE POLICY "ai_characters_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ai-characters' AND public.is_admin(auth.uid()));