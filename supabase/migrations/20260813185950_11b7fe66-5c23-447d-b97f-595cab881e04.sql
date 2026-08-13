-- cash_sessions
DROP POLICY IF EXISTS "cajas alta" ON public.cash_sessions;
CREATE POLICY "cajas alta" ON public.cash_sessions FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
DROP POLICY IF EXISTS "cajas edicion" ON public.cash_sessions;
CREATE POLICY "cajas edicion" ON public.cash_sessions FOR UPDATE TO authenticated
USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id) OR opened_by = auth.uid())
WITH CHECK (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id) OR opened_by = auth.uid());

-- sales
DROP POLICY IF EXISTS "ventas alta" ON public.sales;
CREATE POLICY "ventas alta" ON public.sales FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));

-- sale_items / sale_payments
DROP POLICY IF EXISTS "items alta" ON public.sale_items;
CREATE POLICY "items alta" ON public.sale_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id
  AND (public.user_can_access_org(s.organization_id) OR public.user_can_access_location(s.location_id) OR s.sold_by = auth.uid())));
DROP POLICY IF EXISTS "pagos alta" ON public.sale_payments;
CREATE POLICY "pagos alta" ON public.sale_payments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_payments.sale_id
  AND (public.user_can_access_org(s.organization_id) OR public.user_can_access_location(s.location_id) OR s.sold_by = auth.uid())));

-- operation_days
DROP POLICY IF EXISTS "jornadas alta" ON public.operation_days;
CREATE POLICY "jornadas alta" ON public.operation_days FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
DROP POLICY IF EXISTS "jornadas edicion" ON public.operation_days;
CREATE POLICY "jornadas edicion" ON public.operation_days FOR UPDATE TO authenticated
USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id))
WITH CHECK (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));

-- operation_incidents
DROP POLICY IF EXISTS "incidentes alta" ON public.operation_incidents;
CREATE POLICY "incidentes alta" ON public.operation_incidents FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
DROP POLICY IF EXISTS "incidentes edicion" ON public.operation_incidents;
CREATE POLICY "incidentes edicion" ON public.operation_incidents FOR UPDATE TO authenticated
USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id))
WITH CHECK (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));

-- operation_staff
DROP POLICY IF EXISTS "staff alta" ON public.operation_staff;
CREATE POLICY "staff alta" ON public.operation_staff FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_staff.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))));
DROP POLICY IF EXISTS "staff edicion" ON public.operation_staff;
CREATE POLICY "staff edicion" ON public.operation_staff FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_staff.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_staff.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))));
DROP POLICY IF EXISTS "staff baja" ON public.operation_staff;
CREATE POLICY "staff baja" ON public.operation_staff FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_staff.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))));

-- operation_checklist_items
DROP POLICY IF EXISTS "checklist alta" ON public.operation_checklist_items;
CREATE POLICY "checklist alta" ON public.operation_checklist_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_checklist_items.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))));
DROP POLICY IF EXISTS "checklist edicion" ON public.operation_checklist_items;
CREATE POLICY "checklist edicion" ON public.operation_checklist_items FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_checklist_items.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_checklist_items.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))));
DROP POLICY IF EXISTS "checklist baja" ON public.operation_checklist_items;
CREATE POLICY "checklist baja" ON public.operation_checklist_items FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_checklist_items.operation_day_id
  AND (public.user_can_access_org(d.organization_id) OR public.user_can_access_location(d.location_id))));

-- customers
DROP POLICY IF EXISTS customers_insert ON public.customers;
CREATE POLICY customers_insert ON public.customers FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id));
DROP POLICY IF EXISTS customers_update ON public.customers;
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
USING (public.user_can_access_org(organization_id)) WITH CHECK (public.user_can_access_org(organization_id));

-- suppliers
DROP POLICY IF EXISTS suppliers_insert ON public.suppliers;
CREATE POLICY suppliers_insert ON public.suppliers FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id));
DROP POLICY IF EXISTS suppliers_update ON public.suppliers;
CREATE POLICY suppliers_update ON public.suppliers FOR UPDATE TO authenticated
USING (public.user_can_access_org(organization_id)) WITH CHECK (public.user_can_access_org(organization_id));

-- stock_levels
DROP POLICY IF EXISTS stock_levels_insert ON public.stock_levels;
CREATE POLICY stock_levels_insert ON public.stock_levels FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id));
DROP POLICY IF EXISTS stock_levels_update ON public.stock_levels;
CREATE POLICY stock_levels_update ON public.stock_levels FOR UPDATE TO authenticated
USING (public.user_can_access_org(organization_id)) WITH CHECK (public.user_can_access_org(organization_id));

-- stock_movements
DROP POLICY IF EXISTS stock_movements_insert ON public.stock_movements;
CREATE POLICY stock_movements_insert ON public.stock_movements FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id));

-- photos
DROP POLICY IF EXISTS photos_insert ON public.photos;
CREATE POLICY photos_insert ON public.photos FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_location(location_id) OR photographer_id = auth.uid());
DROP POLICY IF EXISTS photos_update ON public.photos;
CREATE POLICY photos_update ON public.photos FOR UPDATE TO authenticated
USING (public.user_can_access_location(location_id) OR photographer_id = auth.uid())
WITH CHECK (public.user_can_access_location(location_id) OR photographer_id = auth.uid());

-- photo_consents
DROP POLICY IF EXISTS consents_write ON public.photo_consents;
CREATE POLICY consents_write ON public.photo_consents FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.user_can_access_location(location_id));
DROP POLICY IF EXISTS consents_update ON public.photo_consents;
CREATE POLICY consents_update ON public.photo_consents FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_can_access_location(location_id))
WITH CHECK (public.is_admin(auth.uid()) OR public.user_can_access_location(location_id));

-- storage: visitor-photos
DROP POLICY IF EXISTS visitor_photos_insert ON storage.objects;
CREATE POLICY visitor_photos_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'visitor-photos' AND owner = auth.uid());
DROP POLICY IF EXISTS visitor_photos_read ON storage.objects;
CREATE POLICY visitor_photos_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'visitor-photos' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
DROP POLICY IF EXISTS visitor_photos_update ON storage.objects;
CREATE POLICY visitor_photos_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'visitor-photos' AND (owner = auth.uid() OR public.is_admin(auth.uid())))
WITH CHECK (bucket_id = 'visitor-photos' AND (owner = auth.uid() OR public.is_admin(auth.uid())));

-- security definer helpers not called from the app
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_access_finance(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_can_access_org(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_can_access_location(uuid) FROM anon, authenticated;