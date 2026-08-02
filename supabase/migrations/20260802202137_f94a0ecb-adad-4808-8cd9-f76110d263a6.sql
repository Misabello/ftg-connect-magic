-- ===== Enums =====
CREATE TYPE public.product_kind AS ENUM ('fotografia','merchandising','servicio','combo');
CREATE TYPE public.payment_kind AS ENUM ('efectivo','tarjeta_debito','tarjeta_credito','qr','transferencia','voucher','otro');
CREATE TYPE public.cash_session_status AS ENUM ('abierta','cerrada','arqueada');
CREATE TYPE public.sale_status AS ENUM ('completada','anulada');
CREATE TYPE public.sale_source AS ENUM ('online','offline');

-- ===== product_categories =====
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  kind public.product_kind NOT NULL DEFAULT 'merchandising',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias visibles" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categorias admin" ON public.product_categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER set_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== products =====
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  kind public.product_kind NOT NULL DEFAULT 'merchandising',
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  track_stock BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, sku)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "productos visibles" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "productos admin" ON public.products FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX products_barcode_idx ON public.products (barcode);

-- ===== price_lists =====
CREATE TABLE public.price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_lists TO authenticated;
GRANT ALL ON public.price_lists TO service_role;
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listas visibles" ON public.price_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "listas admin" ON public.price_lists FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER set_price_lists_updated_at BEFORE UPDATE ON public.price_lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== product_prices =====
CREATE TABLE public.product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC(14,2) NOT NULL,
  includes_tax BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (price_list_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "precios visibles" ON public.product_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "precios admin" ON public.product_prices FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER set_product_prices_updated_at BEFORE UPDATE ON public.product_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== payment_methods =====
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  country_code TEXT REFERENCES public.countries(code),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  kind public.payment_kind NOT NULL DEFAULT 'efectivo',
  requires_reference BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medios visibles" ON public.payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "medios admin" ON public.payment_methods FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER set_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== cash_sessions =====
CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  point_of_sale_id UUID NOT NULL REFERENCES public.points_of_sale(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  status public.cash_session_status NOT NULL DEFAULT 'abierta',
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  expected_amount NUMERIC(14,2),
  counted_amount NUMERIC(14,2),
  difference_amount NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cajas visibles" ON public.cash_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cajas alta" ON public.cash_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cajas edicion" ON public.cash_sessions FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "cajas baja admin" ON public.cash_sessions FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER set_cash_sessions_updated_at BEFORE UPDATE ON public.cash_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE UNIQUE INDEX cash_sessions_one_open_per_pos ON public.cash_sessions (point_of_sale_id) WHERE status = 'abierta';

-- ===== sales =====
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  point_of_sale_id UUID NOT NULL REFERENCES public.points_of_sale(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  cash_session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  sale_number TEXT NOT NULL,
  sold_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_tax_id TEXT,
  customer_email TEXT,
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.sale_status NOT NULL DEFAULT 'completada',
  source public.sale_source NOT NULL DEFAULT 'online',
  idempotency_key TEXT NOT NULL,
  notes TEXT,
  void_reason TEXT,
  local_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ventas visibles" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "ventas alta" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ventas edicion" ON public.sales FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR sold_by = auth.uid()) WITH CHECK (public.is_admin(auth.uid()) OR sold_by = auth.uid());
CREATE TRIGGER set_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX sales_location_created_idx ON public.sales (location_id, created_at DESC);

-- ===== sale_items =====
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  photo_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items visibles" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items alta" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "items edicion admin" ON public.sale_items FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX sale_items_sale_idx ON public.sale_items (sale_id);

-- ===== sale_payments =====
CREATE TABLE public.sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  method_name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  reference TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sale_payments TO authenticated;
GRANT ALL ON public.sale_payments TO service_role;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos visibles" ON public.sale_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "pagos alta" ON public.sale_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pagos edicion admin" ON public.sale_payments FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX sale_payments_sale_idx ON public.sale_payments (sale_id);

-- ===== Datos de demostración =====
INSERT INTO public.product_categories (organization_id, code, name, kind, sort_order)
SELECT o.id, v.code, v.name, v.kind::public.product_kind, v.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  ('FOTO','Fotografías','fotografia',1),
  ('MARCOS','Marcos y portarretratos','merchandising',2),
  ('TEXTIL','Textil','merchandising',3),
  ('SOUVENIR','Souvenirs','merchandising',4),
  ('COMBO','Combos','combo',5),
  ('SERVICIO','Servicios','servicio',6)
) AS v(code,name,kind,sort_order);

INSERT INTO public.products (organization_id, category_id, sku, barcode, name, description, kind, cost, tax_rate, requires_photo, track_stock)
SELECT c.organization_id, c.id, v.sku, v.barcode, v.name, v.description, v.kind::public.product_kind, v.cost, v.tax_rate, v.requires_photo, v.track_stock
FROM public.product_categories c
JOIN (VALUES
  ('FOTO','FOT-10X15','7790001000011','Foto impresa 10x15','Impresión individual en papel fotográfico','fotografia',900,21,true,false),
  ('FOTO','FOT-15X21','7790001000028','Foto impresa 15x21','Impresión ampliada en papel fotográfico','fotografia',1500,21,true,false),
  ('FOTO','FOT-DIGITAL','7790001000035','Foto digital','Archivo digital en alta resolución','fotografia',300,21,true,false),
  ('FOTO','FOT-IA','7790001000042','Recuerdo mágico IA','Versión tematizada creada con inteligencia artificial','fotografia',600,21,true,false),
  ('MARCOS','MAR-CLASICO','7790002000010','Marco clásico','Marco de madera 10x15','merchandising',1200,21,false,true),
  ('MARCOS','MAR-IMAN','7790002000027','Imán con foto','Imán personalizado para heladera','merchandising',500,21,true,true),
  ('TEXTIL','TEX-REM','7790003000019','Remera personalizada','Remera de algodón con foto estampada','merchandising',3500,21,true,true),
  ('TEXTIL','TEX-GORRA','7790003000026','Gorra','Gorra bordada con logo del parque','merchandising',2200,21,false,true),
  ('SOUVENIR','SOU-TAZA','7790004000018','Taza con foto','Taza cerámica sublimada','merchandising',1800,21,true,true),
  ('SOUVENIR','SOU-LLAV','7790004000025','Llavero','Llavero acrílico con fotografía','merchandising',400,21,true,true),
  ('COMBO','COM-FAMILIA','7790005000017','Combo familia','Dos impresiones 10x15 + imán + archivo digital','combo',2000,21,true,false),
  ('SERVICIO','SER-ENVIO','7790006000016','Envío a domicilio','Despacho de productos al domicilio del cliente','servicio',0,21,false,false)
) AS v(cat,sku,barcode,name,description,kind,cost,tax_rate,requires_photo,track_stock)
  ON v.cat = c.code;

INSERT INTO public.price_lists (organization_id, location_id, name, currency_code, is_active)
SELECT o.id, NULL::uuid, 'Lista general Argentina', 'ARS', true FROM public.organizations o
UNION ALL
SELECT o.id, NULL::uuid, 'Lista general Brasil', 'BRL', true FROM public.organizations o;

INSERT INTO public.product_prices (price_list_id, product_id, price, includes_tax)
SELECT pl.id, p.id,
  CASE WHEN pl.currency_code = 'ARS' THEN v.ars ELSE v.brl END,
  true
FROM public.price_lists pl
JOIN public.products p ON p.organization_id = pl.organization_id
JOIN (VALUES
  ('FOT-10X15',2500,25),
  ('FOT-15X21',3900,39),
  ('FOT-DIGITAL',2000,20),
  ('FOT-IA',4500,45),
  ('MAR-CLASICO',4200,42),
  ('MAR-IMAN',1800,18),
  ('TEX-REM',12000,120),
  ('TEX-GORRA',7500,75),
  ('SOU-TAZA',6500,65),
  ('SOU-LLAV',1500,15),
  ('COM-FAMILIA',7900,79),
  ('SER-ENVIO',3000,30)
) AS v(sku,ars,brl) ON v.sku = p.sku;

INSERT INTO public.payment_methods (organization_id, country_code, code, name, kind, requires_reference, sort_order)
SELECT o.id, v.country, v.code, v.name, v.kind::public.payment_kind, v.requires_reference, v.sort_order
FROM public.organizations o
CROSS JOIN (VALUES
  (NULL::text,'EFECTIVO','Efectivo','efectivo',false,1),
  ('AR','DEBITO_AR','Tarjeta de débito','tarjeta_debito',true,2),
  ('AR','CREDITO_AR','Tarjeta de crédito','tarjeta_credito',true,3),
  ('AR','QR_MP','QR Mercado Pago','qr',true,4),
  ('AR','TRANSFER_AR','Transferencia bancaria','transferencia',true,5),
  ('BR','PIX','PIX','qr',true,6),
  ('BR','CREDITO_BR','Cartão de crédito','tarjeta_credito',true,7),
  ('BR','DEBITO_BR','Cartão de débito','tarjeta_debito',true,8),
  (NULL::text,'VOUCHER','Voucher corporativo','voucher',true,9)
) AS v(country,code,name,kind,requires_reference,sort_order);