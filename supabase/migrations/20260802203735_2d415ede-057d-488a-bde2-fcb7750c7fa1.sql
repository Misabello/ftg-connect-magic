-- ENUMS
CREATE TYPE public.photo_status AS ENUM ('capturada','publicada','vendida','archivada');
CREATE TYPE public.souvenir_status AS ENUM ('en_cola','procesando','listo','error','entregado');

-- CONSENTS
CREATE TABLE public.photo_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_code text NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  visitor_name text,
  contact_email text,
  contact_phone text,
  accepts_image_use boolean NOT NULL DEFAULT false,
  accepts_marketing boolean NOT NULL DEFAULT false,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_consents TO authenticated;
GRANT ALL ON public.photo_consents TO service_role;
ALTER TABLE public.photo_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents_read" ON public.photo_consents FOR SELECT TO authenticated USING (true);
CREATE POLICY "consents_write" ON public.photo_consents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "consents_update" ON public.photo_consents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "consents_delete" ON public.photo_consents FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- PHOTOS
CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_code text NOT NULL,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  photographer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  photographer_name text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  image_url text NOT NULL,
  thumbnail_url text,
  status public.photo_status NOT NULL DEFAULT 'capturada',
  has_consent boolean NOT NULL DEFAULT false,
  retention_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_photos_visitor_code ON public.photos (visitor_code);
CREATE INDEX idx_photos_location_date ON public.photos (location_id, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_read" ON public.photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "photos_insert" ON public.photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "photos_update" ON public.photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "photos_delete" ON public.photos FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- TEMPLATES
CREATE TABLE public.souvenir_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  style text NOT NULL,
  prompt text NOT NULL,
  license_owner text,
  country_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.souvenir_templates TO authenticated;
GRANT ALL ON public.souvenir_templates TO service_role;
ALTER TABLE public.souvenir_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read" ON public.souvenir_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_write" ON public.souvenir_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "templates_update" ON public.souvenir_templates FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "templates_delete" ON public.souvenir_templates FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- SOUVENIRS
CREATE TABLE public.ai_souvenirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.souvenir_templates(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status public.souvenir_status NOT NULL DEFAULT 'en_cola',
  prompt_used text,
  result_url text,
  watermarked boolean NOT NULL DEFAULT true,
  error_message text,
  estimated_cost numeric(10,4) NOT NULL DEFAULT 0,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_souvenirs_photo ON public.ai_souvenirs (photo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_souvenirs TO authenticated;
GRANT ALL ON public.ai_souvenirs TO service_role;
ALTER TABLE public.ai_souvenirs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "souvenirs_read" ON public.ai_souvenirs FOR SELECT TO authenticated USING (true);
CREATE POLICY "souvenirs_insert" ON public.ai_souvenirs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "souvenirs_update" ON public.ai_souvenirs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "souvenirs_delete" ON public.ai_souvenirs FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- TRIGGERS
CREATE TRIGGER set_photos_updated_at BEFORE UPDATE ON public.photos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_templates_updated_at BEFORE UPDATE ON public.souvenir_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_souvenirs_updated_at BEFORE UPDATE ON public.ai_souvenirs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_consents_updated_at BEFORE UPDATE ON public.photo_consents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DEMO TEMPLATES
INSERT INTO public.souvenir_templates (code, name, description, style, prompt, license_owner, country_code) VALUES
('SAFARI','Safari mágico','Escena de safari con fauna del parque','ilustracion','Transformar la foto en una escena de safari ilustrada, con vegetación exuberante y animales del parque al fondo, luz cálida de atardecer, conservando los rostros originales.','FTG Licencias', NULL),
('ACUARELA','Acuarela artística','Retrato en acuarela suave','acuarela','Convertir la foto en un retrato en acuarela suave con trazos visibles y fondo difuminado, conservando los rostros originales.','FTG Licencias', NULL),
('COMIC','Cómic aventura','Estilo cómic de aventuras','comic','Reinterpretar la foto como viñeta de cómic de aventuras, colores saturados, contornos marcados y trama de puntos, conservando los rostros originales.','FTG Licencias', NULL),
('RETRO','Postal retro','Postal vintage años 70','retro','Convertir la foto en una postal vintage de los años 70 con grano, colores desvaídos y marco de postal, conservando los rostros originales.','FTG Licencias', NULL),
('POLAR','Aventura polar','Escenario polar con hielo y auroras','fantasia','Situar a las personas de la foto en un paisaje polar con hielo, auroras boreales y pingüinos, conservando los rostros originales.','FTG Licencias', NULL);

-- DEMO PHOTOS
INSERT INTO public.photos (visitor_code, location_id, event_id, point_of_sale_id, photographer_name, captured_at, image_url, status, has_consent, retention_until)
SELECT v.visitor_code, l.id,
  (SELECT e.id FROM public.events e WHERE e.location_id = l.id LIMIT 1),
  (SELECT p.id FROM public.points_of_sale p WHERE p.location_id = l.id LIMIT 1),
  v.photographer, now() - (v.mins || ' minutes')::interval, v.url, v.status::public.photo_status, v.consent, (now() + interval '90 days')::date
FROM (VALUES
  ('VIS-1001','Lucía Fernández',35,'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800','publicada',true,'AR'),
  ('VIS-1002','Lucía Fernández',72,'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800','capturada',true,'AR'),
  ('VIS-1003','Martín Rossi',110,'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800','vendida',true,'AR'),
  ('VIS-2001','Ana Souza',48,'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=800','publicada',true,'BR'),
  ('VIS-2002','Ana Souza',95,'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800','capturada',false,'BR'),
  ('VIS-2003','Paulo Lima',150,'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800','archivada',true,'BR')
) AS v(visitor_code, photographer, mins, url, status, consent, cc)
JOIN public.locations l ON l.country_code = v.cc
WHERE l.id = (SELECT l2.id FROM public.locations l2 WHERE l2.country_code = v.cc ORDER BY l2.created_at LIMIT 1);

-- DEMO CONSENTS
INSERT INTO public.photo_consents (visitor_code, location_id, visitor_name, contact_email, accepts_image_use, accepts_marketing)
SELECT DISTINCT p.visitor_code, p.location_id, 'Visitante ' || p.visitor_code, lower(replace(p.visitor_code,'-','.')) || '@demo.ftg', true, false
FROM public.photos p WHERE p.has_consent = true;

-- DEMO SOUVENIRS
INSERT INTO public.ai_souvenirs (photo_id, template_id, location_id, status, prompt_used, result_url, estimated_cost, started_at, completed_at)
SELECT p.id, t.id, p.location_id, 'listo', t.prompt, p.image_url, 0.02, now() - interval '20 minutes', now() - interval '18 minutes'
FROM public.photos p
JOIN public.souvenir_templates t ON t.code = 'SAFARI'
WHERE p.visitor_code IN ('VIS-1001','VIS-2001');