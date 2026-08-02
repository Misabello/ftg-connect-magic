DROP POLICY "photos_insert" ON public.photos;
DROP POLICY "photos_update" ON public.photos;
CREATE POLICY "photos_insert" ON public.photos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "photos_update" ON public.photos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "souvenirs_insert" ON public.ai_souvenirs;
DROP POLICY "souvenirs_update" ON public.ai_souvenirs;
CREATE POLICY "souvenirs_insert" ON public.ai_souvenirs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "souvenirs_update" ON public.ai_souvenirs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "consents_write" ON public.photo_consents;
DROP POLICY "consents_update" ON public.photo_consents;
CREATE POLICY "consents_write" ON public.photo_consents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "consents_update" ON public.photo_consents FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);