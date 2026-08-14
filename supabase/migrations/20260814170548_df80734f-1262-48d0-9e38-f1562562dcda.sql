DROP POLICY IF EXISTS "org write pos" ON public.points_of_sale;
CREATE POLICY "org write pos" ON public.points_of_sale
FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.user_can_access_org(organization_id)
  OR public.user_can_access_location(location_id)
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.user_can_access_org(organization_id)
  OR public.user_can_access_location(location_id)
);