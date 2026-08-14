GRANT EXECUTE ON FUNCTION public.user_can_access_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_finance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_cash_source(uuid, uuid, uuid, public.payment_kind) TO authenticated;