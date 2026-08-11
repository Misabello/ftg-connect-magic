
-- 1) Org scoping on table policies
DROP POLICY IF EXISTS "checklist visible" ON public.operation_checklist_items;
CREATE POLICY "checklist visible" ON public.operation_checklist_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_checklist_items.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))));

DROP POLICY IF EXISTS "staff visible" ON public.operation_staff;
CREATE POLICY "staff visible" ON public.operation_staff FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_staff.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))));

DROP POLICY IF EXISTS "precios visibles" ON public.product_prices;
CREATE POLICY "precios visibles" ON public.product_prices FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.price_lists pl WHERE pl.id = product_prices.price_list_id
  AND (public.user_can_access_org(pl.organization_id) OR public.user_can_access_location(pl.location_id))));

DROP POLICY IF EXISTS "items visibles" ON public.sale_items;
CREATE POLICY "items visibles" ON public.sale_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id
  AND (public.user_can_access_org(s.organization_id) OR public.user_can_access_location(s.location_id))));

DROP POLICY IF EXISTS "pagos visibles" ON public.sale_payments;
CREATE POLICY "pagos visibles" ON public.sale_payments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_payments.sale_id
  AND (public.user_can_access_org(s.organization_id) OR public.user_can_access_location(s.location_id))));

-- 2) Profile self-insert cannot claim an arbitrary organization
DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() AND organization_id IS NULL);

-- 3) Storage ownership checks
DROP POLICY IF EXISTS "finance receipts read" ON storage.objects;
CREATE POLICY "finance receipts read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'finance-receipts' AND EXISTS (
  SELECT 1 FROM public.finance_documents fd
  WHERE fd.id::text = (storage.foldername(name))[1]
    AND (public.user_can_access_org(fd.organization_id) OR public.user_can_access_location(fd.location_id))));

DROP POLICY IF EXISTS "finance receipts insert" ON storage.objects;
CREATE POLICY "finance receipts insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'finance-receipts' AND EXISTS (
  SELECT 1 FROM public.finance_documents fd
  WHERE fd.id::text = (storage.foldername(name))[1]
    AND (public.user_can_access_org(fd.organization_id) OR public.user_can_access_location(fd.location_id))));

DROP POLICY IF EXISTS "invoice_inbox_read" ON storage.objects;
CREATE POLICY "invoice_inbox_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'invoice-inbox' AND public.user_can_access_org(NULLIF((storage.foldername(name))[1],'')::uuid));

DROP POLICY IF EXISTS "invoice_inbox_insert" ON storage.objects;
CREATE POLICY "invoice_inbox_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoice-inbox' AND public.user_can_access_org(NULLIF((storage.foldername(name))[1],'')::uuid));

DROP POLICY IF EXISTS "invoice_inbox_update" ON storage.objects;
CREATE POLICY "invoice_inbox_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'invoice-inbox' AND public.user_can_access_org(NULLIF((storage.foldername(name))[1],'')::uuid))
WITH CHECK (bucket_id = 'invoice-inbox' AND public.user_can_access_org(NULLIF((storage.foldername(name))[1],'')::uuid));

DROP POLICY IF EXISTS "pos_tickets_objects_read" ON storage.objects;
CREATE POLICY "pos_tickets_objects_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pos-tickets' AND public.user_can_access_org(NULLIF((storage.foldername(name))[1],'')::uuid));

DROP POLICY IF EXISTS "pos_tickets_objects_insert" ON storage.objects;
CREATE POLICY "pos_tickets_objects_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pos-tickets' AND public.user_can_access_org(NULLIF((storage.foldername(name))[1],'')::uuid));

DROP POLICY IF EXISTS "pos_tickets_objects_update" ON storage.objects;
CREATE POLICY "pos_tickets_objects_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pos-tickets' AND public.user_can_access_org(NULLIF((storage.foldername(name))[1],'')::uuid))
WITH CHECK (bucket_id = 'pos-tickets' AND public.user_can_access_org(NULLIF((storage.foldername(name))[1],'')::uuid));

DROP POLICY IF EXISTS "ai_characters_read" ON storage.objects;
CREATE POLICY "ai_characters_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ai-characters' AND (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.ai_characters c
    WHERE c.reference_image_path = storage.objects.name
      AND c.approved AND c.active
      AND (c.organization_id IS NULL OR public.user_can_access_org(c.organization_id)))));

-- 4) SECURITY DEFINER function execution grants
REVOKE ALL ON FUNCTION public.tg_sale_payment_source() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_users(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_access_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_access_location(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_cash_source(uuid, uuid, uuid, public.payment_kind) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_users(uuid) TO authenticated;
