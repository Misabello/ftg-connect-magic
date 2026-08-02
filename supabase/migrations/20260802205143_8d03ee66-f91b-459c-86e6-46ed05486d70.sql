-- ENUMS
CREATE TYPE public.customer_kind AS ENUM ('corporativo', 'consumidor_final');
CREATE TYPE public.stock_movement_kind AS ENUM ('recepcion', 'ajuste', 'transferencia', 'venta', 'merma', 'devolucion');
CREATE TYPE public.finance_doc_kind AS ENUM ('cobrar', 'pagar');
CREATE TYPE public.finance_doc_status AS ENUM ('pendiente', 'parcial', 'pagado', 'vencido', 'anulado');

-- CUSTOMERS
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  kind public.customer_kind NOT NULL DEFAULT 'consumidor_final',
  name text NOT NULL,
  legal_name text,
  tax_id text,
  tax_condition text,
  country_code text REFERENCES public.countries(code),
  email text,
  phone text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_insert" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "customers_update" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "customers_delete" ON public.customers FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUPPLIERS
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text,
  tax_id text,
  country_code text REFERENCES public.countries(code),
  email text,
  phone text,
  cost_center text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STOCK LEVELS
CREATE TABLE public.stock_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  reserved_quantity numeric NOT NULL DEFAULT 0,
  damaged_quantity numeric NOT NULL DEFAULT 0,
  min_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_levels TO authenticated;
GRANT ALL ON public.stock_levels TO service_role;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_levels_select" ON public.stock_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_levels_insert" ON public.stock_levels FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "stock_levels_update" ON public.stock_levels FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "stock_levels_delete" ON public.stock_levels FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER stock_levels_updated_at BEFORE UPDATE ON public.stock_levels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STOCK MOVEMENTS
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  target_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind public.stock_movement_kind NOT NULL,
  quantity numeric NOT NULL,
  reason text,
  reference text,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_select" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_movements_insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "stock_movements_update" ON public.stock_movements FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- FINANCE DOCUMENTS
CREATE TABLE public.finance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  kind public.finance_doc_kind NOT NULL,
  status public.finance_doc_status NOT NULL DEFAULT 'pendiente',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  document_number text,
  concept text NOT NULL,
  cost_center text,
  currency_code text NOT NULL REFERENCES public.currencies(code),
  amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  issued_on date NOT NULL DEFAULT CURRENT_DATE,
  due_on date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_documents TO authenticated;
GRANT ALL ON public.finance_documents TO service_role;
ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance_documents_select" ON public.finance_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "finance_documents_insert" ON public.finance_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "finance_documents_update" ON public.finance_documents FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "finance_documents_delete" ON public.finance_documents FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER finance_documents_updated_at BEFORE UPDATE ON public.finance_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SALES -> CUSTOMER LINK
ALTER TABLE public.sales ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- DEMO DATA
INSERT INTO public.customers (organization_id, location_id, kind, name, legal_name, tax_id, tax_condition, country_code, email, phone)
SELECT o.id, l.id, 'corporativo', 'Ecoparque Buenos Aires', 'Ecoparque Interactivo S.A.', '30-71234567-9', 'Responsable Inscripto', 'AR', 'compras@ecoparque.ar', '+54 11 5555-1000'
FROM public.organizations o JOIN public.locations l ON l.organization_id = o.id AND l.country_code = 'AR' LIMIT 1;

INSERT INTO public.customers (organization_id, location_id, kind, name, legal_name, tax_id, tax_condition, country_code, email, phone)
SELECT o.id, l.id, 'corporativo', 'Parque Temaikèn', 'Fundación Temaikèn', '30-70987654-3', 'Responsable Inscripto', 'AR', 'eventos@temaiken.ar', '+54 11 5555-2000'
FROM public.organizations o JOIN public.locations l ON l.organization_id = o.id AND l.country_code = 'AR' LIMIT 1;

INSERT INTO public.customers (organization_id, location_id, kind, name, tax_id, tax_condition, country_code, email)
SELECT o.id, l.id, 'consumidor_final', 'Marina Duarte', '27-33456789-1', 'Consumidor Final', 'AR', 'marina.duarte@mail.com'
FROM public.organizations o JOIN public.locations l ON l.organization_id = o.id AND l.country_code = 'AR' LIMIT 1;

INSERT INTO public.customers (organization_id, location_id, kind, name, legal_name, tax_id, tax_condition, country_code, email)
SELECT o.id, l.id, 'corporativo', 'Zoológico de São Paulo', 'Fundação Parque Zoológico', '12.345.678/0001-90', 'Lucro Real', 'BR', 'contato@zoosp.br'
FROM public.organizations o JOIN public.locations l ON l.organization_id = o.id AND l.country_code = 'BR' LIMIT 1;

INSERT INTO public.suppliers (organization_id, name, legal_name, tax_id, country_code, email, cost_center)
SELECT o.id, 'Impresiones Andes', 'Andes Print S.R.L.', '30-61234567-2', 'AR', 'ventas@andesprint.ar', 'Producción'
FROM public.organizations o LIMIT 1;
INSERT INTO public.suppliers (organization_id, name, legal_name, tax_id, country_code, email, cost_center)
SELECT o.id, 'Merch Global', 'Merch Global Ltda.', '11.222.333/0001-44', 'BR', 'sales@merchglobal.br', 'Merchandising'
FROM public.organizations o LIMIT 1;

INSERT INTO public.stock_levels (organization_id, location_id, product_id, quantity, reserved_quantity, damaged_quantity, min_quantity)
SELECT p.organization_id, l.id, p.id,
       CASE WHEN p.kind = 'merchandising' THEN 40 ELSE 120 END,
       CASE WHEN p.kind = 'merchandising' THEN 4 ELSE 0 END,
       CASE WHEN p.kind = 'merchandising' THEN 1 ELSE 0 END,
       CASE WHEN p.kind = 'merchandising' THEN 12 ELSE 20 END
FROM public.products p
JOIN public.locations l ON l.organization_id = p.organization_id
WHERE p.track_stock = true AND p.deleted_at IS NULL
ON CONFLICT (location_id, product_id) DO NOTHING;

UPDATE public.stock_levels sl SET quantity = 6
FROM public.products p
WHERE p.id = sl.product_id AND p.kind = 'merchandising'
  AND sl.id IN (SELECT id FROM public.stock_levels ORDER BY created_at LIMIT 2);

INSERT INTO public.stock_movements (organization_id, location_id, product_id, kind, quantity, reason, reference, supplier_id)
SELECT sl.organization_id, sl.location_id, sl.product_id, 'recepcion', sl.quantity, 'Carga inicial de inventario', 'OC-2026-0001',
       (SELECT id FROM public.suppliers ORDER BY created_at LIMIT 1)
FROM public.stock_levels sl;

INSERT INTO public.finance_documents (organization_id, location_id, kind, status, customer_id, concept, document_number, currency_code, amount, paid_amount, issued_on, due_on, cost_center)
SELECT c.organization_id, c.location_id, 'cobrar', 'pendiente', c.id, 'Servicio fotográfico evento corporativo', 'FC-A-0001', l.currency_code, 480000, 0, CURRENT_DATE - 10, CURRENT_DATE + 5, 'Eventos'
FROM public.customers c JOIN public.locations l ON l.id = c.location_id WHERE c.kind = 'corporativo' AND c.country_code = 'AR' LIMIT 1;

INSERT INTO public.finance_documents (organization_id, location_id, kind, status, customer_id, concept, document_number, currency_code, amount, paid_amount, issued_on, due_on, cost_center)
SELECT c.organization_id, c.location_id, 'cobrar', 'vencido', c.id, 'Sesión fotográfica escolar', 'FC-A-0002', l.currency_code, 215000, 50000, CURRENT_DATE - 45, CURRENT_DATE - 15, 'Eventos'
FROM public.customers c JOIN public.locations l ON l.id = c.location_id WHERE c.kind = 'corporativo' AND c.country_code = 'AR' OFFSET 1 LIMIT 1;

INSERT INTO public.finance_documents (organization_id, location_id, kind, status, supplier_id, concept, document_number, currency_code, amount, paid_amount, issued_on, due_on, cost_center)
SELECT s.organization_id, l.id, 'pagar', 'parcial', s.id, 'Insumos de impresión fotográfica', 'FP-2026-0031', l.currency_code, 320000, 120000, CURRENT_DATE - 12, CURRENT_DATE + 8, 'Producción'
FROM public.suppliers s JOIN public.locations l ON l.organization_id = s.organization_id AND l.country_code = 'AR' LIMIT 1;

INSERT INTO public.finance_documents (organization_id, location_id, kind, status, supplier_id, concept, document_number, currency_code, amount, paid_amount, issued_on, due_on, cost_center)
SELECT s.organization_id, l.id, 'pagar', 'pendiente', s.id, 'Compra de merchandising', 'FP-2026-0032', l.currency_code, 18500, 0, CURRENT_DATE - 3, CURRENT_DATE + 20, 'Merchandising'
FROM public.suppliers s JOIN public.locations l ON l.organization_id = s.organization_id AND l.country_code = 'BR' WHERE s.country_code = 'BR' LIMIT 1;