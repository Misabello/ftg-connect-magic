-- 1. Nuevos valores de rol (no se usan como literales en esta misma migración)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'management';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'executive';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';

-- 2. Estados de cuenta y laborales
DO $$ BEGIN
  CREATE TYPE public.user_account_status AS ENUM ('invitado','activo','suspendido','baja_programada','inactivo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.employment_status AS ENUM ('activo','licencia','vacaciones','suspendido','baja_programada','desvinculado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.permission_action AS ENUM ('ver','crear','editar','aprobar','anular','exportar','administrar','sensible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Catálogo de roles
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  legacy_role text,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_read" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin_write" ON public.roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER t_roles_upd BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Permisos
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  submodule text,
  action public.permission_action NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module, submodule, action)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions_read" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_admin_write" ON public.permissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5. Permisos por rol (con alcance futuro por empresa/país/sede/PDV)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  country_code text REFERENCES public.countries(code),
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id, organization_id, country_code, location_id, point_of_sale_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_read" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_admin_write" ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER t_role_permissions_upd BEFORE UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Vigencia y trazabilidad en asignación de roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valid_from date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS valid_to date,
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. Perfil ampliado
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS country_code text REFERENCES public.countries(code),
  ADD COLUMN IF NOT EXISTS status public.user_account_status NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS start_date date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

-- 8. Legajo del empleado
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_number text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  document_type text,
  document_number text,
  tax_id text,
  birth_date date,
  nationality text,
  gender text,
  marital_status text,
  personal_email text,
  phone text,
  address text,
  city text,
  region text,
  country_code text REFERENCES public.countries(code),
  emergency_contact_name text,
  emergency_contact_phone text,
  position text,
  department text,
  supervisor_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  contract_type text,
  work_schedule text,
  work_shift text,
  hire_date date,
  termination_date date,
  termination_reason text,
  employment_status public.employment_status NOT NULL DEFAULT 'activo',
  primary_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  primary_point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  cost_center text,
  reference_currency text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, employee_number)
);
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(employment_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_read" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_can_access_org(organization_id));
CREATE POLICY "employees_admin_write" ON public.employees FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER t_employees_upd BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Asignaciones a sedes y puntos de venta
CREATE TABLE IF NOT EXISTS public.employee_venue_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE CASCADE,
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emp_assign_employee ON public.employee_venue_assignments(employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_venue_assignments TO authenticated;
GRANT ALL ON public.employee_venue_assignments TO service_role;
ALTER TABLE public.employee_venue_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_assign_read" ON public.employee_venue_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id
    AND (e.user_id = auth.uid() OR public.user_can_access_org(e.organization_id))));
CREATE POLICY "emp_assign_admin_write" ON public.employee_venue_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER t_emp_assign_upd BEFORE UPDATE ON public.employee_venue_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. is_admin también reconoce los roles nuevos (sin literales de enum)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('superadmin','direccion','admin','management')
      AND (valid_to IS NULL OR valid_to >= current_date)
  );
$$;

-- 11. Solo administradores pueden crear usuarios de empleado (helper para el backend)
CREATE OR REPLACE FUNCTION public.can_manage_users(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('superadmin','admin')
      AND (valid_to IS NULL OR valid_to >= current_date)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_users(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_manage_users(uuid) TO authenticated, service_role;

-- 12. Catálogo de permisos y roles iniciales
INSERT INTO public.permissions (module, submodule, action, description)
SELECT m.module, m.submodule, a.action::public.permission_action,
       'Permiso '||a.action||' sobre '||m.module||COALESCE(' / '||m.submodule,'')
FROM (VALUES
  ('inicio', NULL), ('pos', NULL), ('sedes', NULL), ('fotografias', NULL),
  ('operaciones', NULL), ('inventario', NULL), ('clientes', NULL), ('reportes', NULL),
  ('administracion','resumen'), ('administracion','cuentas_a_pagar'), ('administracion','cuentas_a_cobrar'),
  ('administracion','abm'), ('administracion','tesoreria'), ('administracion','contabilidad'),
  ('administracion','estados_contables'), ('administracion','configuracion'),
  ('configuracion','usuarios'), ('configuracion','roles'), ('configuracion','empleados'),
  ('configuracion','vacaciones'), ('configuracion','empresas'), ('configuracion','sedes'),
  ('configuracion','parametros'), ('configuracion','auditoria')
) AS m(module, submodule)
CROSS JOIN (VALUES ('ver'),('crear'),('editar'),('aprobar'),('anular'),('exportar'),('administrar'),('sensible')) AS a(action)
ON CONFLICT DO NOTHING;

INSERT INTO public.roles (code, legacy_role, name, description, is_system, sort_order) VALUES
  ('admin','superadmin','Administrador','Gestiona usuarios, roles y toda la plataforma', true, 1),
  ('management','direccion','Gerencia','Visión integral de negocio y aprobaciones', true, 2),
  ('supervisor','supervisor','Supervisor','Supervisa operaciones y equipos en sede', true, 3),
  ('executive','administracion','Ejecutivo','Gestión administrativa y comercial', true, 4),
  ('seller','cajero','Vendedor','Operación de punto de venta y atención al cliente', true, 5)
ON CONFLICT (code) DO NOTHING;

-- Etapa 1: todos los roles acceden a todos los módulos y acciones
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true FROM public.roles r CROSS JOIN public.permissions p
ON CONFLICT DO NOTHING;