CREATE TYPE public.checklist_phase AS ENUM ('apertura','cierre');
CREATE TYPE public.incident_severity AS ENUM ('baja','media','alta','critica');
CREATE TYPE public.incident_status AS ENUM ('abierto','en_curso','resuelto');

CREATE TABLE public.operation_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  event_id uuid REFERENCES public.events(id),
  venue_id uuid REFERENCES public.venues(id),
  day date NOT NULL,
  status public.operational_status NOT NULL DEFAULT 'planificado',
  manager_name text,
  sales_target numeric(14,2),
  expected_visitors integer,
  opened_by uuid REFERENCES auth.users(id),
  opened_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_days TO authenticated;
GRANT ALL ON public.operation_days TO service_role;
ALTER TABLE public.operation_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jornadas visibles" ON public.operation_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "jornadas alta" ON public.operation_days FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "jornadas edicion" ON public.operation_days FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "jornadas baja admin" ON public.operation_days FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER set_operation_days_updated_at BEFORE UPDATE ON public.operation_days FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE UNIQUE INDEX operation_days_unique ON public.operation_days (location_id, day, COALESCE(event_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE public.operation_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_day_id uuid NOT NULL REFERENCES public.operation_days(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  person_name text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'cajero',
  point_of_sale_id uuid REFERENCES public.points_of_sale(id),
  shift_start time,
  shift_end time,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_staff TO authenticated;
GRANT ALL ON public.operation_staff TO service_role;
ALTER TABLE public.operation_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff visible" ON public.operation_staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff alta" ON public.operation_staff FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "staff edicion" ON public.operation_staff FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "staff baja" ON public.operation_staff FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER set_operation_staff_updated_at BEFORE UPDATE ON public.operation_staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX operation_staff_day_idx ON public.operation_staff (operation_day_id);

CREATE TABLE public.operation_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_day_id uuid NOT NULL REFERENCES public.operation_days(id) ON DELETE CASCADE,
  phase public.checklist_phase NOT NULL,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_done boolean NOT NULL DEFAULT false,
  done_by uuid REFERENCES auth.users(id),
  done_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_checklist_items TO authenticated;
GRANT ALL ON public.operation_checklist_items TO service_role;
ALTER TABLE public.operation_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist visible" ON public.operation_checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "checklist alta" ON public.operation_checklist_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "checklist edicion" ON public.operation_checklist_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "checklist baja" ON public.operation_checklist_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE TRIGGER set_operation_checklist_updated_at BEFORE UPDATE ON public.operation_checklist_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX operation_checklist_day_idx ON public.operation_checklist_items (operation_day_id, phase, sort_order);

CREATE TABLE public.operation_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_day_id uuid REFERENCES public.operation_days(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  point_of_sale_id uuid REFERENCES public.points_of_sale(id),
  category text NOT NULL DEFAULT 'operativo',
  severity public.incident_severity NOT NULL DEFAULT 'media',
  status public.incident_status NOT NULL DEFAULT 'abierto',
  title text NOT NULL,
  description text,
  resolution text,
  reported_by uuid REFERENCES auth.users(id),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operation_incidents TO authenticated;
GRANT ALL ON public.operation_incidents TO service_role;
ALTER TABLE public.operation_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidentes visibles" ON public.operation_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "incidentes alta" ON public.operation_incidents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "incidentes edicion" ON public.operation_incidents FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "incidentes baja admin" ON public.operation_incidents FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER set_operation_incidents_updated_at BEFORE UPDATE ON public.operation_incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX operation_incidents_day_idx ON public.operation_incidents (location_id, created_at DESC);

INSERT INTO public.operation_days (organization_id, location_id, event_id, venue_id, day, status, manager_name, sales_target, expected_visitors, notes)
SELECT l.organization_id, l.id, e.id, e.venue_id, CURRENT_DATE, 'preparacion', 'Equipo de sede', 850000, 1200, 'Jornada de demostración'
FROM public.locations l
LEFT JOIN LATERAL (SELECT id, venue_id FROM public.events WHERE location_id = l.id ORDER BY starts_at LIMIT 1) e ON true
ON CONFLICT DO NOTHING;

INSERT INTO public.operation_staff (operation_day_id, person_name, role, point_of_sale_id, shift_start, shift_end)
SELECT d.id, s.person_name, s.role::public.app_role,
       (SELECT id FROM public.points_of_sale p WHERE p.location_id = d.location_id ORDER BY p.code LIMIT 1),
       '09:00'::time, '18:00'::time
FROM public.operation_days d
CROSS JOIN (VALUES ('Ana Torres','encargado_sede'), ('Bruno Silva','cajero'), ('Lucía Gómez','fotografo')) AS s(person_name, role);

INSERT INTO public.operation_checklist_items (operation_day_id, phase, label, is_required, sort_order)
SELECT d.id, c.phase::public.checklist_phase, c.label, c.req, c.ord
FROM public.operation_days d
CROSS JOIN (VALUES
  ('apertura','Verificar conectividad y sincronización de dispositivos', true, 1),
  ('apertura','Contar fondo inicial de caja', true, 2),
  ('apertura','Revisar stock de insumos e impresoras', true, 3),
  ('apertura','Chequear cámaras, baterías y tarjetas de memoria', true, 4),
  ('apertura','Cartelería de precios visible y actualizada', false, 5),
  ('cierre','Cerrar caja y registrar arqueo', true, 1),
  ('cierre','Respaldar y subir fotografías del día', true, 2),
  ('cierre','Registrar incidentes y observaciones', false, 3),
  ('cierre','Guardar equipamiento y apagar puestos', true, 4)
) AS c(phase, label, req, ord);

INSERT INTO public.operation_incidents (operation_day_id, organization_id, location_id, category, severity, status, title, description)
SELECT d.id, d.organization_id, d.location_id, 'equipamiento', 'media', 'abierto', 'Impresora con atasco intermitente', 'La impresora del puesto principal se traba cada ~30 impresiones.'
FROM public.operation_days d
LIMIT 1;