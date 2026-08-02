-- ENUMS
CREATE TYPE public.ai_output_type AS ENUM ('imagen','video');
CREATE TYPE public.ai_job_status AS ENUM ('pendiente','en_cola','procesando','generando_preview','preview_listo','aprobado','generando_final','completado','error','cancelado');

-- CHARACTERS
CREATE TABLE public.ai_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  venue_id uuid REFERENCES public.venues(id),
  location_id uuid REFERENCES public.locations(id),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  reference_image_path text,
  character_version text NOT NULL DEFAULT 'v1',
  styles text[] NOT NULL DEFAULT ARRAY['realista','ilustracion'],
  supports_image boolean NOT NULL DEFAULT true,
  supports_video boolean NOT NULL DEFAULT false,
  approved boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_characters TO authenticated;
GRANT ALL ON public.ai_characters TO service_role;
ALTER TABLE public.ai_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "characters_read_approved" ON public.ai_characters FOR SELECT TO authenticated
  USING (active AND approved OR public.is_admin(auth.uid()));
CREATE POLICY "characters_admin_write" ON public.ai_characters FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER ai_characters_updated BEFORE UPDATE ON public.ai_characters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SCENES
CREATE TABLE public.ai_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  output_type public.ai_output_type NOT NULL DEFAULT 'imagen',
  prompt_template text NOT NULL,
  aspect_ratios text[] NOT NULL DEFAULT ARRAY['9:16','1:1','16:9'],
  available_actions text[] NOT NULL DEFAULT ARRAY[]::text[],
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_scenes TO authenticated;
GRANT ALL ON public.ai_scenes TO service_role;
ALTER TABLE public.ai_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenes_read" ON public.ai_scenes FOR SELECT TO authenticated USING (active OR public.is_admin(auth.uid()));
CREATE POLICY "scenes_admin_write" ON public.ai_scenes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER ai_scenes_updated BEFORE UPDATE ON public.ai_scenes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- JOBS
CREATE TABLE public.ai_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  point_of_sale_id uuid REFERENCES public.points_of_sale(id),
  output_type public.ai_output_type NOT NULL DEFAULT 'imagen',
  customer_media_path text NOT NULL,
  character_id uuid REFERENCES public.ai_characters(id),
  scene_id uuid REFERENCES public.ai_scenes(id),
  action text,
  aspect_ratio text NOT NULL DEFAULT '9:16',
  duration_seconds integer,
  style text,
  people_count integer NOT NULL DEFAULT 1,
  extra_instruction text,
  status public.ai_job_status NOT NULL DEFAULT 'pendiente',
  progress integer NOT NULL DEFAULT 0,
  provider text NOT NULL DEFAULT 'simulado',
  provider_job_id text,
  prompt_version text NOT NULL DEFAULT 'v1',
  prompt_used text,
  preview_path text,
  final_output_path text,
  error_message text,
  estimated_cost numeric NOT NULL DEFAULT 0,
  sale_id uuid REFERENCES public.sales(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generation_jobs TO authenticated;
GRANT ALL ON public.ai_generation_jobs TO service_role;
ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_read" ON public.ai_generation_jobs FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "jobs_insert" ON public.ai_generation_jobs FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "jobs_update" ON public.ai_generation_jobs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "jobs_admin_delete" ON public.ai_generation_jobs FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER ai_jobs_updated BEFORE UPDATE ON public.ai_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONSENTS
CREATE TABLE public.customer_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  location_id uuid REFERENCES public.locations(id),
  sale_id uuid REFERENCES public.sales(id),
  job_id uuid REFERENCES public.ai_generation_jobs(id) ON DELETE CASCADE,
  customer_media_path text,
  consent_type text NOT NULL DEFAULT 'uso_imagen_recuerdo',
  guardian_confirmation boolean NOT NULL DEFAULT false,
  purpose text NOT NULL DEFAULT 'Creación de recuerdo con IA',
  retention_policy text NOT NULL DEFAULT '90 días',
  device_label text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  accepted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.customer_consents TO authenticated;
GRANT ALL ON public.customer_consents TO service_role;
ALTER TABLE public.customer_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents_read" ON public.customer_consents FOR SELECT TO authenticated
  USING (accepted_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "consents_insert" ON public.customer_consents FOR INSERT TO authenticated
  WITH CHECK (accepted_by = auth.uid());

-- SEED SCENES
INSERT INTO public.ai_scenes (code, name, description, output_type, prompt_template, aspect_ratios, available_actions, sort_order) VALUES
('abrazo','Abrazo con el personaje','El personaje abraza cálidamente al cliente','imagen','El personaje abraza afectuosamente a la persona, ambos sonriendo a cámara', ARRAY['9:16','1:1','16:9'], ARRAY[]::text[], 1),
('posando','Posando juntos','Foto clásica de recuerdo','imagen','La persona y el personaje posan juntos de pie, mirando a cámara', ARRAY['9:16','1:1','16:9'], ARRAY[]::text[], 2),
('saludo','El personaje saludando','El personaje saluda con la mano','imagen','El personaje saluda con la mano junto a la persona', ARRAY['9:16','1:1','16:9'], ARRAY[]::text[], 3),
('selfie','Selfie','Plano corto tipo selfie','imagen','Selfie de la persona junto al personaje, plano corto y cercano', ARRAY['9:16','1:1'], ARRAY[]::text[], 4),
('aventura','Escena de aventura','Escena dinámica de aventura','imagen','La persona y el personaje en una escena de aventura llena de acción', ARRAY['16:9','9:16'], ARRAY[]::text[], 5),
('parque','Fondo del parque','Fondo del parque temático','imagen','La persona y el personaje con el parque temático de fondo', ARRAY['16:9','1:1','9:16'], ARRAY[]::text[], 6),
('celebracion','Celebración','Confeti y festejo','imagen','La persona y el personaje celebrando con confeti y globos', ARRAY['9:16','1:1','16:9'], ARRAY[]::text[], 7),
('personalizada','Plantilla personalizada','Escena libre según indicación','imagen','Escena libre definida por la indicación adicional', ARRAY['9:16','1:1','16:9'], ARRAY[]::text[], 8),
('video_saludo','Saludo animado','Video corto saludando','video','Animación breve donde el personaje saluda junto a la persona', ARRAY['9:16','1:1','16:9'], ARRAY['saludar','bailar','abrazar','posar','caminar','celebrar'], 9),
('video_fiesta','Momento mágico','Video corto de celebración','video','Animación breve de celebración mágica con el personaje y la persona', ARRAY['9:16','1:1','16:9'], ARRAY['saludar','bailar','abrazar','posar','caminar','celebrar'], 10);

-- SEED CHARACTERS
INSERT INTO public.ai_characters (organization_id, location_id, name, description, category, supports_image, supports_video, approved, active)
SELECT NULL, NULL, x.name, x.descr, x.cat, true, x.vid, true, true FROM (VALUES
  ('Fotín el Osito','Mascota oficial de FTG, oso naranja con bufanda coral','mascota', true),
  ('Capitán Lente','Explorador fotográfico con casco y cámara vintage','aventura', true),
  ('Luna la Zorrita','Zorrita mágica de pelaje blanco y estrellas','fantasia', false),
  ('Rex Dino','Dinosaurio verde simpático del parque temático','parque', true)
) AS x(name, descr, cat, vid);