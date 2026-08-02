
-- Helper functions for org/location scoping
CREATE OR REPLACE FUNCTION public.user_can_access_org(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _org IS NOT NULL AND (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.organization_id = _org)
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.organization_id = _org)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_location(_loc uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _loc IS NOT NULL AND (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.location_id = _loc)
    OR EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = _loc AND public.user_can_access_org(l.organization_id)
    )
  );
$$;

REVOKE ALL ON FUNCTION public.user_can_access_org(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_can_access_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_location(uuid) TO authenticated;

-- Internal trigger/definer functions must not be callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;

-- cash_sessions
DROP POLICY IF EXISTS "cajas visibles" ON public.cash_sessions;
CREATE POLICY "cajas visibles" ON public.cash_sessions FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id) OR opened_by = auth.uid());

-- customers
DROP POLICY IF EXISTS customers_select ON public.customers;
CREATE POLICY customers_select ON public.customers FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id));

-- suppliers
DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id));

-- finance_documents
DROP POLICY IF EXISTS finance_documents_select ON public.finance_documents;
CREATE POLICY finance_documents_select ON public.finance_documents FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id));

-- sales
DROP POLICY IF EXISTS "ventas visibles" ON public.sales;
CREATE POLICY "ventas visibles" ON public.sales FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id) OR sold_by = auth.uid());

-- sale_items / sale_payments
DROP POLICY IF EXISTS "items visibles" ON public.sale_items;
CREATE POLICY "items visibles" ON public.sale_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id));

DROP POLICY IF EXISTS "pagos visibles" ON public.sale_payments;
CREATE POLICY "pagos visibles" ON public.sale_payments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id));

-- products / prices / stock
DROP POLICY IF EXISTS "productos visibles" ON public.products;
CREATE POLICY "productos visibles" ON public.products FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id));

DROP POLICY IF EXISTS "listas visibles" ON public.price_lists;
CREATE POLICY "listas visibles" ON public.price_lists FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id));

DROP POLICY IF EXISTS "precios visibles" ON public.product_prices;
CREATE POLICY "precios visibles" ON public.product_prices FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.price_lists pl WHERE pl.id = price_list_id));

DROP POLICY IF EXISTS stock_levels_select ON public.stock_levels;
CREATE POLICY stock_levels_select ON public.stock_levels FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id));

DROP POLICY IF EXISTS stock_movements_select ON public.stock_movements;
CREATE POLICY stock_movements_select ON public.stock_movements FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id));

-- operational tables
DROP POLICY IF EXISTS "jornadas visibles" ON public.operation_days;
CREATE POLICY "jornadas visibles" ON public.operation_days FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));

DROP POLICY IF EXISTS "staff visible" ON public.operation_staff;
CREATE POLICY "staff visible" ON public.operation_staff FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_day_id));

DROP POLICY IF EXISTS "checklist visible" ON public.operation_checklist_items;
CREATE POLICY "checklist visible" ON public.operation_checklist_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.operation_days d WHERE d.id = operation_day_id));

DROP POLICY IF EXISTS "incidentes visibles" ON public.operation_incidents;
CREATE POLICY "incidentes visibles" ON public.operation_incidents FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));

DROP POLICY IF EXISTS "read devices" ON public.devices;
CREATE POLICY "read devices" ON public.devices FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));

-- photos / consents / souvenirs
DROP POLICY IF EXISTS photos_read ON public.photos;
CREATE POLICY photos_read ON public.photos FOR SELECT TO authenticated
USING (public.user_can_access_location(location_id) OR photographer_id = auth.uid());

DROP POLICY IF EXISTS consents_read ON public.photo_consents;
CREATE POLICY consents_read ON public.photo_consents FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_can_access_location(location_id));

DROP POLICY IF EXISTS souvenirs_read ON public.ai_souvenirs;
CREATE POLICY souvenirs_read ON public.ai_souvenirs FOR SELECT TO authenticated
USING (requested_by = auth.uid() OR public.user_can_access_location(location_id) OR public.is_admin(auth.uid()));

-- user_roles: strict superadmin-only writes, no self-assignment
DROP POLICY IF EXISTS "superadmin manage roles" ON public.user_roles;
CREATE POLICY "superadmin insert roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role) AND user_id <> auth.uid());
CREATE POLICY "superadmin update roles" ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role) AND user_id <> auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role) AND user_id <> auth.uid());
CREATE POLICY "superadmin delete roles" ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'::app_role) AND user_id <> auth.uid());
