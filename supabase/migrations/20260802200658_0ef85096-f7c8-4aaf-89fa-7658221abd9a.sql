-- ENUMS
CREATE TYPE public.app_role AS ENUM ('superadmin','direccion','administracion','operaciones','encargado_sede','supervisor','cajero','fotografo','deposito','auditor');
CREATE TYPE public.pos_type AS ENUM ('tienda','kiosco','movil','puesto_fotografico');
CREATE TYPE public.operational_status AS ENUM ('planificado','preparacion','listo','en_operacion','incidente','cerrado');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CURRENCIES
CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals SMALLINT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- COUNTRIES
CREATE TABLE public.countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  locale TEXT NOT NULL DEFAULT 'es-AR',
  language TEXT NOT NULL DEFAULT 'es',
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  fiscal_adapter TEXT NOT NULL DEFAULT 'GenericFiscalAdapter',
  rounding_mode TEXT NOT NULL DEFAULT 'half_up',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  country_code TEXT NOT NULL REFERENCES public.countries(code),
  functional_currency TEXT NOT NULL REFERENCES public.currencies(code),
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- LOCATIONS (sedes)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL REFERENCES public.countries(code),
  city TEXT,
  address TEXT,
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_locations_org ON public.locations(organization_id);

-- VENUES
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  venue_type TEXT NOT NULL DEFAULT 'parque',
  corporate_client TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_venues_location ON public.venues(location_id);

-- EVENTS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  starts_at DATE NOT NULL,
  ends_at DATE,
  manager_name TEXT,
  status public.operational_status NOT NULL DEFAULT 'planificado',
  sales_target NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_events_location ON public.events(location_id);

-- POINTS OF SALE
CREATE TABLE public.points_of_sale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  pos_type public.pos_type NOT NULL DEFAULT 'tienda',
  fiscal_prefix TEXT,
  currency_code TEXT NOT NULL REFERENCES public.currencies(code),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, code)
);
CREATE INDEX idx_pos_location ON public.points_of_sale(location_id);

-- DEVICES
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  point_of_sale_id UUID REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  device_key TEXT NOT NULL UNIQUE,
  platform TEXT,
  last_sync_at TIMESTAMPTZ,
  pending_operations INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'es',
  default_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  country_code TEXT REFERENCES public.countries(code),
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  point_of_sale_id UUID REFERENCES public.points_of_sale(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, organization_id, location_id, point_of_sale_id)
);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  local_created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ROLE HELPER
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('superadmin','direccion'));
$$;

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cajero')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- UPDATED_AT TRIGGERS
CREATE TRIGGER t_countries_upd BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_org_upd BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_loc_upd BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_ven_upd BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_evt_upd BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_pos_upd BEFORE UPDATE ON public.points_of_sale FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_dev_upd BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_prof_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- GRANTS
GRANT SELECT ON public.currencies, public.countries, public.organizations, public.locations, public.venues, public.events, public.points_of_sale, public.devices TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.currencies, public.countries, public.organizations, public.locations, public.venues, public.events, public.points_of_sale, public.devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.user_roles, public.audit_logs TO authenticated;
GRANT ALL ON public.currencies, public.countries, public.organizations, public.locations, public.venues, public.events, public.points_of_sale, public.devices, public.profiles, public.user_roles, public.audit_logs TO service_role;

-- RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_of_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read currencies" ON public.currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write currencies" ON public.currencies FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "read countries" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write countries" ON public.countries FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "read organizations" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write organizations" ON public.organizations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "read locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write locations" ON public.locations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "read venues" ON public.venues FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write venues" ON public.venues FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write events" ON public.events FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "read pos" ON public.points_of_sale FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write pos" ON public.points_of_sale FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "read devices" ON public.devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write devices" ON public.devices FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "superadmin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'auditor'));
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- DEMO DATA
INSERT INTO public.currencies (code,name,symbol,decimals) VALUES
 ('ARS','Peso argentino','$',2),
 ('BRL','Real brasileño','R$',2),
 ('USD','Dólar estadounidense','US$',2),
 ('EUR','Euro','€',2);

INSERT INTO public.countries (code,name,currency_code,locale,language,timezone,date_format,fiscal_adapter) VALUES
 ('AR','Argentina','ARS','es-AR','es','America/Argentina/Buenos_Aires','dd/MM/yyyy','ArgentinaFiscalAdapter'),
 ('BR','Brasil','BRL','pt-BR','pt','America/Sao_Paulo','dd/MM/yyyy','BrazilFiscalAdapter'),
 ('PT','Portugal','EUR','pt-PT','pt','Europe/Lisbon','dd/MM/yyyy','PortugalFiscalAdapter');

INSERT INTO public.organizations (id,name,legal_name,tax_id,country_code,functional_currency) VALUES
 ('11111111-1111-1111-1111-111111111111','Fotográfica','Fotográfica S.A.','30-12345678-9','AR','ARS');

INSERT INTO public.locations (id,organization_id,code,name,country_code,city,address,currency_code,timezone) VALUES
 ('22222222-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','AR-BUE','Sede Buenos Aires','AR','Buenos Aires','Av. Sarmiento 2601','ARS','America/Argentina/Buenos_Aires'),
 ('22222222-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','AR-ESC','Sede Escobar','AR','Escobar','Ruta 25 Km 1','ARS','America/Argentina/Buenos_Aires'),
 ('22222222-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','BR-SAO','Sede São Paulo','BR','São Paulo','Av. do Cursino 6338','BRL','America/Sao_Paulo');

INSERT INTO public.venues (id,organization_id,location_id,name,venue_type,corporate_client) VALUES
 ('33333333-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000001','Ecoparque Buenos Aires','parque','Ciudad de Buenos Aires'),
 ('33333333-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000002','Bioparque Temaikèn','parque','Fundación Temaikèn'),
 ('33333333-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000001','Estación Oceánica','acuario','Estación Oceánica S.A.'),
 ('33333333-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000003','Zoo Safari São Paulo','parque','Prefeitura de São Paulo');

INSERT INTO public.events (id,organization_id,location_id,venue_id,name,starts_at,ends_at,manager_name,status,sales_target,notes) VALUES
 ('44444444-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','Safari Jurásico — Temporada de verano',CURRENT_DATE - 10,CURRENT_DATE + 45,'María Rossi','en_operacion',18500000,'Evento temporal con dos puestos fotográficos.'),
 ('44444444-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000004','Verão no Zoo Safari',CURRENT_DATE + 12,CURRENT_DATE + 60,'João Ferreira','planificado',900000,'Preparación de equipamiento pendiente.');

INSERT INTO public.points_of_sale (id,organization_id,location_id,venue_id,event_id,code,name,pos_type,fiscal_prefix,currency_code) VALUES
 ('55555555-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001',NULL,'POS-001','Tienda Ecoparque','tienda','0001','ARS'),
 ('55555555-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000001','POS-002','Kiosco Temaikèn Central','kiosco','0002','ARS'),
 ('55555555-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000004',NULL,'POS-003','Loja Zoo Safari','tienda','0003','BRL'),
 ('55555555-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000001','FOTO-01','Puesto fotográfico Dinos','puesto_fotografico','0004','ARS'),
 ('55555555-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000003',NULL,'FOTO-02','Puesto fotográfico Submarino','puesto_fotografico','0005','ARS');

INSERT INTO public.devices (organization_id,location_id,point_of_sale_id,name,device_key,platform,last_sync_at,pending_operations) VALUES
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000001','55555555-0000-0000-0000-000000000001','Tablet Ecoparque 01','DEV-AR-ECO-01','tablet',now() - interval '8 minutes',0),
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000002','Tablet Temaikèn 01','DEV-AR-TEM-01','tablet',now() - interval '3 hours',7),
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000003','55555555-0000-0000-0000-000000000003','PC Zoo Safari','DEV-BR-ZOO-01','desktop',now() - interval '25 minutes',0),
 ('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000002','55555555-0000-0000-0000-000000000004','Tablet Foto Dinos','DEV-AR-FOT-01','tablet',now() - interval '1 day',12);