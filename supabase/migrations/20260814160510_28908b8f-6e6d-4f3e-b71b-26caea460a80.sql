CREATE TABLE public.pos_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  user_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pos_notification_recipients_unique
  ON public.pos_notification_recipients (organization_id, lower(email), COALESCE(point_of_sale_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_notification_recipients TO authenticated;
GRANT ALL ON public.pos_notification_recipients TO service_role;
ALTER TABLE public.pos_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos notif recipients select" ON public.pos_notification_recipients
  FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));
CREATE POLICY "pos notif recipients insert" ON public.pos_notification_recipients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id));
CREATE POLICY "pos notif recipients update" ON public.pos_notification_recipients
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id))
  WITH CHECK (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id));
CREATE POLICY "pos notif recipients delete" ON public.pos_notification_recipients
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id));

CREATE TRIGGER set_pos_notification_recipients_updated_at
  BEFORE UPDATE ON public.pos_notification_recipients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pos_close_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  cash_session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sender_email text NOT NULL,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pendiente',
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pos_close_notifications TO authenticated;
GRANT ALL ON public.pos_close_notifications TO service_role;
ALTER TABLE public.pos_close_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos close notifications select" ON public.pos_close_notifications
  FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));