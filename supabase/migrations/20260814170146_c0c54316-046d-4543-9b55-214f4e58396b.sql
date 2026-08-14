DROP POLICY IF EXISTS journal_entries_read ON public.journal_entries;
CREATE POLICY journal_entries_read ON public.journal_entries
FOR SELECT TO authenticated
USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id));

DROP POLICY IF EXISTS journal_lines_read ON public.journal_lines;
CREATE POLICY journal_lines_read ON public.journal_lines
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.journal_entries e
  WHERE e.id = journal_lines.entry_id
    AND (public.user_can_access_org(e.organization_id) OR public.user_can_access_location(e.location_id))
));