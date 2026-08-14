DROP POLICY IF EXISTS "pos notif recipients insert" ON public.pos_notification_recipients;
DROP POLICY IF EXISTS "pos notif recipients update" ON public.pos_notification_recipients;
DROP POLICY IF EXISTS "pos notif recipients delete" ON public.pos_notification_recipients;

CREATE POLICY "pos notif recipients insert" ON public.pos_notification_recipients
FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_org(organization_id));

CREATE POLICY "pos notif recipients update" ON public.pos_notification_recipients
FOR UPDATE TO authenticated
USING (public.user_can_access_org(organization_id))
WITH CHECK (public.user_can_access_org(organization_id));

CREATE POLICY "pos notif recipients delete" ON public.pos_notification_recipients
FOR DELETE TO authenticated
USING (public.user_can_access_org(organization_id));