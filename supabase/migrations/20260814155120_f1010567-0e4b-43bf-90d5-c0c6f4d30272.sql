-- 1) Backfill organization on profiles and user_roles (single-org project)
UPDATE public.profiles
SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

UPDATE public.user_roles
SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

-- 2) New users get the default organization when there is exactly one
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _org uuid;
BEGIN
  SELECT id INTO _org FROM public.organizations ORDER BY created_at LIMIT 1;

  INSERT INTO public.profiles (id, full_name, email, organization_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, _org)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (NEW.id, 'cajero', _org)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $function$;

-- 3) Allow the opening user as a valid owner for cash session inserts
DROP POLICY IF EXISTS "cajas alta" ON public.cash_sessions;
CREATE POLICY "cajas alta" ON public.cash_sessions
FOR INSERT TO authenticated
WITH CHECK (
  public.user_can_access_org(organization_id)
  OR public.user_can_access_location(location_id)
  OR opened_by = auth.uid()
);