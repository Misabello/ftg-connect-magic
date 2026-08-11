CREATE TABLE IF NOT EXISTS public.cash_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  fund_kind text NOT NULL DEFAULT 'efectivo',
  provider text,
  match_kinds payment_kind[] NOT NULL DEFAULT '{}',
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

GRANT SELECT ON public.cash_sources TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cash_sources TO authenticated;
GRANT ALL ON public.cash_sources TO service_role;

ALTER TABLE public.cash_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuentes visibles" ON public.cash_sources FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id));

CREATE POLICY "fuentes admin" ON public.cash_sources FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER set_cash_sources_updated_at BEFORE UPDATE ON public.cash_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sale_payments
  ADD COLUMN IF NOT EXISTS cash_source_id uuid REFERENCES public.cash_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL;

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS cash_source_id uuid REFERENCES public.cash_sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sale_payments_pos_idx ON public.sale_payments (point_of_sale_id);
CREATE INDEX IF NOT EXISTS sale_payments_source_idx ON public.sale_payments (cash_source_id);

-- Resuelve la fuente de caja: primero por punto de venta, luego sede, luego organización.
CREATE OR REPLACE FUNCTION public.resolve_cash_source(_org uuid, _loc uuid, _pos uuid, _kind payment_kind)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cs.id
  FROM public.cash_sources cs
  WHERE cs.organization_id = _org
    AND cs.is_active
    AND (cs.match_kinds = '{}' OR _kind = ANY (cs.match_kinds))
    AND (cs.point_of_sale_id IS NULL OR cs.point_of_sale_id = _pos)
    AND (cs.location_id IS NULL OR cs.location_id = _loc)
  ORDER BY (cs.point_of_sale_id IS NOT NULL) DESC,
           (cs.location_id IS NOT NULL) DESC,
           (cs.match_kinds <> '{}') DESC,
           cs.sort_order
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.resolve_cash_source(uuid, uuid, uuid, payment_kind) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_cash_source(uuid, uuid, uuid, payment_kind) TO authenticated, service_role;

-- Completa sede, punto de venta y fuente de caja en cada cobro.
CREATE OR REPLACE FUNCTION public.tg_sale_payment_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_loc uuid;
  v_pos uuid;
  v_kind payment_kind;
BEGIN
  SELECT s.organization_id, s.location_id, s.point_of_sale_id
    INTO v_org, v_loc, v_pos
  FROM public.sales s WHERE s.id = NEW.sale_id;

  NEW.location_id := COALESCE(NEW.location_id, v_loc);
  NEW.point_of_sale_id := COALESCE(NEW.point_of_sale_id, v_pos);

  IF NEW.cash_source_id IS NULL AND v_org IS NOT NULL THEN
    SELECT pm.kind INTO v_kind FROM public.payment_methods pm WHERE pm.id = NEW.payment_method_id;
    NEW.cash_source_id := public.resolve_cash_source(v_org, NEW.location_id, NEW.point_of_sale_id, COALESCE(v_kind, 'otro'::payment_kind));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_sale_payments_source ON public.sale_payments;
CREATE TRIGGER t_sale_payments_source BEFORE INSERT ON public.sale_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_sale_payment_source();

-- Fuentes por defecto para cada organización.
INSERT INTO public.cash_sources (organization_id, code, name, fund_kind, provider, match_kinds, sort_order)
SELECT o.id, v.code, v.name, v.fund_kind, v.provider, v.match_kinds, v.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  ('CAJA_EFECTIVO', 'Caja en efectivo', 'efectivo', NULL, ARRAY['efectivo']::payment_kind[], 10),
  ('MERCADOPAGO', 'Mercado Pago (QR / API)', 'billetera', 'mercadopago', ARRAY['qr','tarjeta_debito','tarjeta_credito']::payment_kind[], 20),
  ('BANCO_TRANSFER', 'Banco / Transferencias', 'banco', NULL, ARRAY['transferencia']::payment_kind[], 30),
  ('OTROS_FONDOS', 'Otros fondos', 'otro', NULL, ARRAY['voucher','otro']::payment_kind[], 40)
) AS v(code, name, fund_kind, provider, match_kinds, sort_order)
ON CONFLICT (organization_id, code) DO NOTHING;