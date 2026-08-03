-- 1. Plan de cuentas
CREATE TABLE public.ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('activo','pasivo','patrimonio','ingreso','egreso')),
  normal_side text NOT NULL CHECK (normal_side IN ('debe','haber')),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ledger_accounts TO authenticated;
GRANT ALL ON public.ledger_accounts TO service_role;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_accounts_read" ON public.ledger_accounts FOR SELECT TO authenticated USING (true);
CREATE TRIGGER t_ledger_accounts_upd BEFORE UPDATE ON public.ledger_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ledger_accounts (code, name, account_type, normal_side, sort_order) VALUES
  ('1.1.1','Caja','activo','debe',10),
  ('1.1.2','Bancos y cobros electrónicos','activo','debe',20),
  ('1.1.3','Deudores por ventas','activo','debe',30),
  ('1.1.4','Otros créditos','activo','debe',40),
  ('2.1.1','Proveedores','pasivo','haber',50),
  ('2.1.2','IVA débito fiscal','pasivo','haber',60),
  ('4.1.1','Ventas','ingreso','haber',70),
  ('5.1.1','Gastos operativos','egreso','debe',80),
  ('5.1.2','Comisiones y aranceles','egreso','debe',90);

-- 2. Libro diario
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  point_of_sale_id uuid REFERENCES public.points_of_sale(id),
  cash_session_id uuid REFERENCES public.cash_sessions(id),
  entry_date date NOT NULL DEFAULT current_date,
  description text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  currency_code text NOT NULL DEFAULT 'ARS' REFERENCES public.currencies(code),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_entries_read" ON public.journal_entries FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
CREATE POLICY "journal_entries_insert" ON public.journal_entries FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
CREATE INDEX idx_journal_entries_pos ON public.journal_entries (point_of_sale_id, entry_date);
CREATE INDEX idx_journal_entries_loc ON public.journal_entries (location_id, entry_date);

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.ledger_accounts(id),
  debit numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_lines_read" ON public.journal_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = entry_id
    AND (public.user_can_access_org(e.organization_id) OR public.user_can_access_location(e.location_id))));
CREATE POLICY "journal_lines_insert" ON public.journal_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.journal_entries e WHERE e.id = entry_id
    AND (public.user_can_access_org(e.organization_id) OR public.user_can_access_location(e.location_id))));
CREATE INDEX idx_journal_lines_entry ON public.journal_lines (entry_id);

-- 3. Helper de posteo (partida doble)
CREATE OR REPLACE FUNCTION public.post_journal_entry(
  _org uuid, _loc uuid, _pos uuid, _session uuid, _date date,
  _description text, _source_type text, _source_id uuid, _currency text,
  _lines jsonb, _created_by uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _entry uuid; _line jsonb; _total_d numeric := 0; _total_c numeric := 0;
BEGIN
  IF _lines IS NULL OR jsonb_array_length(_lines) = 0 THEN RETURN NULL; END IF;
  INSERT INTO public.journal_entries (organization_id, location_id, point_of_sale_id, cash_session_id,
    entry_date, description, source_type, source_id, currency_code, created_by)
  VALUES (_org, _loc, _pos, _session, COALESCE(_date, current_date), _description, _source_type, _source_id,
    COALESCE(_currency,'ARS'), _created_by)
  RETURNING id INTO _entry;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    INSERT INTO public.journal_lines (entry_id, account_id, debit, credit, description)
    SELECT _entry, a.id,
      ROUND(COALESCE((_line->>'debit')::numeric,0),2),
      ROUND(COALESCE((_line->>'credit')::numeric,0),2),
      _line->>'description'
    FROM public.ledger_accounts a WHERE a.code = (_line->>'account_code');
    _total_d := _total_d + ROUND(COALESCE((_line->>'debit')::numeric,0),2);
    _total_c := _total_c + ROUND(COALESCE((_line->>'credit')::numeric,0),2);
  END LOOP;

  IF ABS(_total_d - _total_c) > 0.02 THEN
    RAISE EXCEPTION 'Asiento desbalanceado: debe % / haber %', _total_d, _total_c;
  END IF;
  RETURN _entry;
END; $$;
REVOKE EXECUTE ON FUNCTION public.post_journal_entry(uuid,uuid,uuid,uuid,date,text,text,uuid,text,jsonb,uuid) FROM PUBLIC, anon, authenticated;

-- 4. Asiento automático de venta
CREATE OR REPLACE FUNCTION public.tg_sale_journal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lines jsonb;
BEGIN
  IF NEW.status <> 'completada' THEN RETURN NEW; END IF;
  _lines := jsonb_build_array(
    jsonb_build_object('account_code','1.1.3','debit',NEW.total,'credit',0,'description','Venta '||NEW.sale_number),
    jsonb_build_object('account_code','4.1.1','debit',0,'credit',NEW.subtotal,'description','Ingreso por ventas')
  );
  IF COALESCE(NEW.tax_total,0) > 0 THEN
    _lines := _lines || jsonb_build_array(
      jsonb_build_object('account_code','2.1.2','debit',0,'credit',NEW.tax_total,'description','IVA débito fiscal'));
  ELSE
    _lines := jsonb_build_array(
      jsonb_build_object('account_code','1.1.3','debit',NEW.total,'credit',0,'description','Venta '||NEW.sale_number),
      jsonb_build_object('account_code','4.1.1','debit',0,'credit',NEW.total,'description','Ingreso por ventas'));
  END IF;
  PERFORM public.post_journal_entry(NEW.organization_id, NEW.location_id, NEW.point_of_sale_id,
    NEW.cash_session_id, NEW.created_at::date, 'Venta '||NEW.sale_number, 'sale', NEW.id,
    NEW.currency_code, _lines, NEW.sold_by);
  RETURN NEW;
END; $$;
CREATE TRIGGER t_sales_journal AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.tg_sale_journal();

-- 5. Asiento automático de cobro
CREATE OR REPLACE FUNCTION public.tg_sale_payment_journal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sale public.sales%ROWTYPE; _kind text; _account text;
BEGIN
  SELECT * INTO _sale FROM public.sales WHERE id = NEW.sale_id;
  IF _sale.id IS NULL OR _sale.status <> 'completada' THEN RETURN NEW; END IF;
  SELECT kind::text INTO _kind FROM public.payment_methods WHERE id = NEW.payment_method_id;
  _account := CASE
    WHEN _kind = 'efectivo' THEN '1.1.1'
    WHEN _kind IN ('tarjeta_debito','tarjeta_credito','qr','transferencia') THEN '1.1.2'
    ELSE '1.1.4' END;
  PERFORM public.post_journal_entry(_sale.organization_id, _sale.location_id, _sale.point_of_sale_id,
    _sale.cash_session_id, COALESCE(NEW.received_at, now())::date,
    'Cobro '||_sale.sale_number||' · '||NEW.method_name, 'sale_payment', NEW.id, NEW.currency_code,
    jsonb_build_array(
      jsonb_build_object('account_code',_account,'debit',NEW.amount,'credit',0,'description',NEW.method_name),
      jsonb_build_object('account_code','1.1.3','debit',0,'credit',NEW.amount,'description','Cancelación deudores')
    ), _sale.sold_by);
  RETURN NEW;
END; $$;
CREATE TRIGGER t_sale_payments_journal AFTER INSERT ON public.sale_payments FOR EACH ROW EXECUTE FUNCTION public.tg_sale_payment_journal();

-- 6. Tickets cargados en el punto de venta (con OCR)
CREATE TABLE public.pos_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  point_of_sale_id uuid NOT NULL REFERENCES public.points_of_sale(id),
  cash_session_id uuid REFERENCES public.cash_sessions(id),
  sale_id uuid REFERENCES public.sales(id),
  kind text NOT NULL DEFAULT 'gasto' CHECK (kind IN ('gasto','compra','ingreso')),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','confirmado','rechazado')),
  image_path text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'ARS' REFERENCES public.currencies(code),
  document_number text,
  supplier_name text,
  tax_id text,
  issued_on date,
  ocr_amount numeric(14,2),
  ocr_confidence numeric(5,2),
  ocr_raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  journal_entry_id uuid REFERENCES public.journal_entries(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_tickets TO authenticated;
GRANT ALL ON public.pos_tickets TO service_role;
ALTER TABLE public.pos_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_tickets_read" ON public.pos_tickets FOR SELECT TO authenticated
  USING (public.user_can_access_location(location_id) OR public.user_can_access_org(organization_id));
CREATE POLICY "pos_tickets_insert" ON public.pos_tickets FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_location(location_id));
CREATE POLICY "pos_tickets_update" ON public.pos_tickets FOR UPDATE TO authenticated
  USING (public.user_can_access_location(location_id)) WITH CHECK (public.user_can_access_location(location_id));
CREATE POLICY "pos_tickets_delete" ON public.pos_tickets FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER t_pos_tickets_upd BEFORE UPDATE ON public.pos_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.tg_pos_ticket_journal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _entry uuid; _net numeric; _debit_code text; _credit_code text;
BEGIN
  IF NEW.status <> 'confirmado' OR NEW.journal_entry_id IS NOT NULL OR COALESCE(NEW.amount,0) <= 0 THEN
    RETURN NEW;
  END IF;
  _net := ROUND(NEW.amount - COALESCE(NEW.tax_amount,0), 2);
  IF NEW.kind = 'ingreso' THEN
    _entry := public.post_journal_entry(NEW.organization_id, NEW.location_id, NEW.point_of_sale_id,
      NEW.cash_session_id, COALESCE(NEW.issued_on, current_date),
      'Ticket ingreso '||COALESCE(NEW.document_number,''), 'pos_ticket', NEW.id, NEW.currency_code,
      jsonb_build_array(
        jsonb_build_object('account_code','1.1.1','debit',NEW.amount,'credit',0,'description','Ingreso en caja'),
        jsonb_build_object('account_code','4.1.1','debit',0,'credit',NEW.amount,'description',COALESCE(NEW.supplier_name,'Ingreso'))
      ), NEW.created_by);
  ELSE
    _debit_code := CASE WHEN NEW.kind = 'compra' THEN '5.1.1' ELSE '5.1.1' END;
    _credit_code := '1.1.1';
    _entry := public.post_journal_entry(NEW.organization_id, NEW.location_id, NEW.point_of_sale_id,
      NEW.cash_session_id, COALESCE(NEW.issued_on, current_date),
      'Ticket '||NEW.kind||' '||COALESCE(NEW.supplier_name,''), 'pos_ticket', NEW.id, NEW.currency_code,
      jsonb_build_array(
        jsonb_build_object('account_code',_debit_code,'debit',_net,'credit',0,'description',COALESCE(NEW.supplier_name,'Gasto')),
        jsonb_build_object('account_code','2.1.2','debit',COALESCE(NEW.tax_amount,0),'credit',0,'description','IVA crédito fiscal'),
        jsonb_build_object('account_code',_credit_code,'debit',0,'credit',NEW.amount,'description','Pago desde caja')
      ), NEW.created_by);
  END IF;
  NEW.journal_entry_id := _entry;
  RETURN NEW;
END; $$;
CREATE TRIGGER t_pos_tickets_journal BEFORE INSERT OR UPDATE ON public.pos_tickets
  FOR EACH ROW EXECUTE FUNCTION public.tg_pos_ticket_journal();

-- 7. Cobros online (Mercado Pago)
CREATE TABLE public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  point_of_sale_id uuid NOT NULL REFERENCES public.points_of_sale(id),
  cash_session_id uuid REFERENCES public.cash_sessions(id),
  sale_id uuid REFERENCES public.sales(id),
  provider text NOT NULL DEFAULT 'mercadopago',
  external_reference text NOT NULL UNIQUE,
  preference_id text,
  provider_payment_id text,
  init_point text,
  qr_code text,
  amount numeric(14,2) NOT NULL,
  currency_code text NOT NULL DEFAULT 'ARS' REFERENCES public.currencies(code),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aprobado','rechazado','cancelado','reembolsado')),
  payer_email text,
  description text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_intents_read" ON public.payment_intents FOR SELECT TO authenticated
  USING (public.user_can_access_location(location_id) OR public.user_can_access_org(organization_id));
CREATE POLICY "payment_intents_insert" ON public.payment_intents FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_location(location_id));
CREATE POLICY "payment_intents_update" ON public.payment_intents FOR UPDATE TO authenticated
  USING (public.user_can_access_location(location_id)) WITH CHECK (public.user_can_access_location(location_id));
CREATE TRIGGER t_payment_intents_upd BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payment_intents_pos ON public.payment_intents (point_of_sale_id, created_at DESC);