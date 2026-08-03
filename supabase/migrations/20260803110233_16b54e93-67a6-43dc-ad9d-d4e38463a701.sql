REVOKE EXECUTE ON FUNCTION public.tg_sale_journal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_sale_payment_journal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_pos_ticket_journal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_journal_entry(uuid,uuid,uuid,uuid,date,text,text,uuid,text,jsonb,uuid) FROM PUBLIC, anon, authenticated;