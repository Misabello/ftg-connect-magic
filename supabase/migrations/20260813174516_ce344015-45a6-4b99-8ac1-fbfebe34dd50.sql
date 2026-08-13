-- 1) Plan de cuentas: ABM para administradores
GRANT INSERT, UPDATE ON public.ledger_accounts TO authenticated;

CREATE POLICY "ledger accounts admin insert" ON public.ledger_accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "ledger accounts admin update" ON public.ledger_accounts
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2) Categoría de documento en cuentas a pagar / cobrar
DO $$ BEGIN
  CREATE TYPE public.finance_doc_category AS ENUM ('proveedor','servicio','gasto','cliente_servicio','organismo_estatal','otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.finance_documents
  ADD COLUMN IF NOT EXISTS document_category public.finance_doc_category NOT NULL DEFAULT 'proveedor';

UPDATE public.finance_documents SET document_category = 'cliente_servicio' WHERE kind = 'cobrar';

-- 3) Tipo de tercero en proveedores
DO $$ BEGIN
  CREATE TYPE public.supplier_party_kind AS ENUM ('proveedor','organismo_estatal','otro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS party_kind public.supplier_party_kind NOT NULL DEFAULT 'proveedor';

-- 4) Idempotencia de asientos manuales
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_idempotency_key_uidx
  ON public.journal_entries (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 5) Minutas de tesorería
CREATE TABLE IF NOT EXISTS public.treasury_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  memo_type text NOT NULL CHECK (memo_type IN ('nota_contable','movimiento_fondos')),
  description text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'ARS',
  cash_source_from_id uuid REFERENCES public.cash_sources(id) ON DELETE SET NULL,
  cash_source_to_id uuid REFERENCES public.cash_sources(id) ON DELETE SET NULL,
  debit_account_code text,
  credit_account_code text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','conciliada','anulada')),
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  idempotency_key text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS treasury_memos_idempotency_key_uidx
  ON public.treasury_memos (idempotency_key) WHERE idempotency_key IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.treasury_memos TO authenticated;
GRANT ALL ON public.treasury_memos TO service_role;

ALTER TABLE public.treasury_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treasury memos select" ON public.treasury_memos
  FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));

CREATE POLICY "treasury memos insert" ON public.treasury_memos
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id))
    AND created_by = auth.uid()
  );

CREATE POLICY "treasury memos update" ON public.treasury_memos
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id))
  WITH CHECK (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id));

CREATE TRIGGER set_treasury_memos_updated_at
  BEFORE UPDATE ON public.treasury_memos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) Flujo de fondos calculado en la base
CREATE OR REPLACE FUNCTION public.cash_flow_summary(_from date, _to date, _loc uuid DEFAULT NULL, _bucket text DEFAULT 'month')
RETURNS TABLE (bucket date, source_name text, currency_code text, inflow numeric, outflow numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH allowed AS (
    SELECT public.is_admin(auth.uid()) OR (_loc IS NOT NULL AND public.user_can_access_location(_loc)) AS ok
  ),
  cobros AS (
    SELECT date_trunc(COALESCE(NULLIF(_bucket,''),'month'), sp.received_at)::date AS bucket,
           COALESCE(cs.name, sp.method_name, 'Sin fuente') AS source_name,
           sp.currency_code,
           SUM(sp.amount)::numeric AS inflow,
           0::numeric AS outflow
    FROM public.sale_payments sp
    LEFT JOIN public.cash_sources cs ON cs.id = sp.cash_source_id
    WHERE (SELECT ok FROM allowed)
      AND sp.received_at::date BETWEEN _from AND _to
      AND (_loc IS NULL OR sp.location_id = _loc OR sp.location_id IS NULL)
    GROUP BY 1,2,3
  ),
  docs AS (
    SELECT date_trunc(COALESCE(NULLIF(_bucket,''),'month'), fd.updated_at)::date AS bucket,
           CASE fd.kind::text WHEN 'cobrar' THEN 'Cobranzas de documentos' ELSE 'Pagos a terceros' END AS source_name,
           fd.currency_code,
           SUM(CASE WHEN fd.kind::text = 'cobrar' THEN fd.paid_amount ELSE 0 END)::numeric AS inflow,
           SUM(CASE WHEN fd.kind::text = 'pagar' THEN fd.paid_amount ELSE 0 END)::numeric AS outflow
    FROM public.finance_documents fd
    WHERE (SELECT ok FROM allowed)
      AND fd.paid_amount > 0
      AND fd.status::text IN ('pagado','parcial')
      AND fd.updated_at::date BETWEEN _from AND _to
      AND (_loc IS NULL OR fd.location_id = _loc OR fd.location_id IS NULL)
    GROUP BY 1,2,3
  ),
  tickets AS (
    SELECT date_trunc(COALESCE(NULLIF(_bucket,''),'month'), pt.issued_on::timestamptz)::date AS bucket,
           'Tickets de caja' AS source_name,
           pt.currency_code,
           SUM(CASE WHEN pt.kind::text = 'ingreso' THEN pt.amount ELSE 0 END)::numeric AS inflow,
           SUM(CASE WHEN pt.kind::text <> 'ingreso' THEN pt.amount ELSE 0 END)::numeric AS outflow
    FROM public.pos_tickets pt
    WHERE (SELECT ok FROM allowed)
      AND pt.status = 'confirmado'
      AND pt.issued_on BETWEEN _from AND _to
      AND (_loc IS NULL OR pt.location_id = _loc OR pt.location_id IS NULL)
    GROUP BY 1,2,3
  )
  SELECT bucket, source_name, currency_code, SUM(inflow)::numeric, SUM(outflow)::numeric
  FROM (SELECT * FROM cobros UNION ALL SELECT * FROM docs UNION ALL SELECT * FROM tickets) u
  GROUP BY 1,2,3
  ORDER BY 1, 2;
$$;

REVOKE EXECUTE ON FUNCTION public.cash_flow_summary(date, date, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cash_flow_summary(date, date, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cash_flow_opening(_from date, _loc uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public.is_admin(auth.uid()) OR (_loc IS NOT NULL AND public.user_can_access_location(_loc))
    THEN COALESCE((
      SELECT SUM(sp.amount) FROM public.sale_payments sp
      WHERE sp.received_at::date < _from AND (_loc IS NULL OR sp.location_id = _loc OR sp.location_id IS NULL)
    ),0)
    - COALESCE((
      SELECT SUM(fd.paid_amount) FROM public.finance_documents fd
      WHERE fd.kind::text = 'pagar' AND fd.paid_amount > 0 AND fd.updated_at::date < _from
        AND (_loc IS NULL OR fd.location_id = _loc OR fd.location_id IS NULL)
    ),0)
    ELSE 0 END;
$$;

REVOKE EXECUTE ON FUNCTION public.cash_flow_opening(date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cash_flow_opening(date, uuid) TO authenticated;