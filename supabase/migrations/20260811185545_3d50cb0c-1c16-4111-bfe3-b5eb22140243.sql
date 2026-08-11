-- Idempotency columns on existing entities
ALTER TABLE public.sale_payments ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.photo_consents ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.operation_incidents ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.finance_documents ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS sale_payments_idem_uq ON public.sale_payments (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_idem_uq ON public.stock_movements (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS photos_idem_uq ON public.photos (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS photo_consents_idem_uq ON public.photo_consents (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS operation_incidents_idem_uq ON public.operation_incidents (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_idem_uq ON public.cash_sessions (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS finance_documents_idem_uq ON public.finance_documents (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sales_idem_uq ON public.sales (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Devices
CREATE TABLE IF NOT EXISTS public.sync_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  device_identifier text NOT NULL UNIQUE,
  name text,
  last_seen_at timestamptz,
  last_sync_at timestamptz,
  status text NOT NULL DEFAULT 'ok',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sync_devices TO authenticated;
GRANT ALL ON public.sync_devices TO service_role;
ALTER TABLE public.sync_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_devices_read" ON public.sync_devices FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
CREATE POLICY "sync_devices_write" ON public.sync_devices FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
CREATE POLICY "sync_devices_update" ON public.sync_devices FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
CREATE TRIGGER sync_devices_upd BEFORE UPDATE ON public.sync_devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Batches
CREATE TABLE IF NOT EXISTS public.sync_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  cash_session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.sync_devices(id) ON DELETE SET NULL,
  device_identifier text,
  business_date date NOT NULL DEFAULT current_date,
  first_sequence integer,
  last_sequence integer,
  operation_count integer NOT NULL DEFAULT 0,
  totals_by_currency jsonb NOT NULL DEFAULT '{}'::jsonb,
  integrity_hash text,
  status text NOT NULL DEFAULT 'pendiente',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.sync_batches TO authenticated;
GRANT ALL ON public.sync_batches TO service_role;
ALTER TABLE public.sync_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_batches_read" ON public.sync_batches FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid() OR public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
CREATE POLICY "sync_batches_insert" ON public.sync_batches FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_admin(auth.uid()) OR public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id)));
CREATE POLICY "sync_batches_update" ON public.sync_batches FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = auth.uid());
CREATE INDEX IF NOT EXISTS sync_batches_pos_date_idx ON public.sync_batches (point_of_sale_id, business_date DESC);

-- Batch items
CREATE TABLE IF NOT EXISTS public.sync_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_batch_id uuid NOT NULL REFERENCES public.sync_batches(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  idempotency_key text NOT NULL,
  local_sequence integer,
  local_created_at timestamptz,
  sync_status text NOT NULL DEFAULT 'pendiente',
  attempts integer NOT NULL DEFAULT 0,
  server_confirmed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sync_batch_items TO authenticated;
GRANT ALL ON public.sync_batch_items TO service_role;
ALTER TABLE public.sync_batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_batch_items_read" ON public.sync_batch_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sync_batches b WHERE b.id = sync_batch_id AND (public.is_admin(auth.uid()) OR b.created_by = auth.uid() OR public.user_can_access_org(b.organization_id) OR public.user_can_access_location(b.location_id))));
CREATE POLICY "sync_batch_items_insert" ON public.sync_batch_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sync_batches b WHERE b.id = sync_batch_id AND (public.is_admin(auth.uid()) OR b.created_by = auth.uid())));
CREATE POLICY "sync_batch_items_update" ON public.sync_batch_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sync_batches b WHERE b.id = sync_batch_id AND (public.is_admin(auth.uid()) OR b.created_by = auth.uid())));
CREATE UNIQUE INDEX IF NOT EXISTS sync_batch_items_batch_key_uq ON public.sync_batch_items (sync_batch_id, idempotency_key);
CREATE INDEX IF NOT EXISTS sync_batch_items_status_idx ON public.sync_batch_items (sync_status);

-- Conflicts
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_batch_item_id uuid REFERENCES public.sync_batch_items(id) ON DELETE CASCADE,
  conflict_type text NOT NULL,
  local_version jsonb,
  server_version jsonb,
  resolution_status text NOT NULL DEFAULT 'pendiente',
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sync_conflicts TO authenticated;
GRANT ALL ON public.sync_conflicts TO service_role;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_conflicts_read" ON public.sync_conflicts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sync_batch_items i JOIN public.sync_batches b ON b.id = i.sync_batch_id WHERE i.id = sync_batch_item_id AND (public.is_admin(auth.uid()) OR b.created_by = auth.uid() OR public.user_can_access_org(b.organization_id) OR public.user_can_access_location(b.location_id))));
CREATE POLICY "sync_conflicts_insert" ON public.sync_conflicts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.sync_batch_items i JOIN public.sync_batches b ON b.id = i.sync_batch_id WHERE i.id = sync_batch_item_id AND (public.is_admin(auth.uid()) OR b.created_by = auth.uid())));
CREATE POLICY "sync_conflicts_resolve" ON public.sync_conflicts FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));