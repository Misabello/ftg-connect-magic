CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY (_roles)
      AND (valid_to IS NULL OR valid_to >= current_date)
  );
$$;

REVOKE ALL ON FUNCTION public.has_any_role(uuid, app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_finance(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(_user_id, ARRAY[
    'admin','superadmin','management','supervisor','direccion','administracion','auditor'
  ]::app_role[]);
$$;

REVOKE ALL ON FUNCTION public.can_access_finance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_finance(uuid) TO authenticated, service_role;

-- finance_documents
DROP POLICY IF EXISTS finance_documents_select ON public.finance_documents;
DROP POLICY IF EXISTS finance_documents_insert ON public.finance_documents;
DROP POLICY IF EXISTS finance_documents_update ON public.finance_documents;
DROP POLICY IF EXISTS finance_documents_delete ON public.finance_documents;

CREATE POLICY finance_documents_select ON public.finance_documents
FOR SELECT TO authenticated
USING (public.can_access_finance(auth.uid()) AND public.user_can_access_org(organization_id));

CREATE POLICY finance_documents_insert ON public.finance_documents
FOR INSERT TO authenticated
WITH CHECK (public.can_access_finance(auth.uid()) AND public.user_can_access_org(organization_id));

CREATE POLICY finance_documents_update ON public.finance_documents
FOR UPDATE TO authenticated
USING (public.can_access_finance(auth.uid()) AND public.user_can_access_org(organization_id))
WITH CHECK (public.can_access_finance(auth.uid()) AND public.user_can_access_org(organization_id));

CREATE POLICY finance_documents_delete ON public.finance_documents
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id));

-- ledger_accounts
DROP POLICY IF EXISTS ledger_accounts_read ON public.ledger_accounts;
CREATE POLICY ledger_accounts_read ON public.ledger_accounts
FOR SELECT TO authenticated
USING (public.can_access_finance(auth.uid()));

-- journal_entries
DROP POLICY IF EXISTS journal_entries_read ON public.journal_entries;
DROP POLICY IF EXISTS journal_entries_insert ON public.journal_entries;

CREATE POLICY journal_entries_read ON public.journal_entries
FOR SELECT TO authenticated
USING (
  public.can_access_finance(auth.uid())
  AND (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id))
);

CREATE POLICY journal_entries_insert ON public.journal_entries
FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_finance(auth.uid())
  AND (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id))
);

-- journal_lines
DROP POLICY IF EXISTS journal_lines_read ON public.journal_lines;
DROP POLICY IF EXISTS journal_lines_insert ON public.journal_lines;

CREATE POLICY journal_lines_read ON public.journal_lines
FOR SELECT TO authenticated
USING (
  public.can_access_finance(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.journal_entries e
    WHERE e.id = journal_lines.entry_id
      AND (public.user_can_access_org(e.organization_id) OR public.user_can_access_location(e.location_id))
  )
);

CREATE POLICY journal_lines_insert ON public.journal_lines
FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_finance(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.journal_entries e
    WHERE e.id = journal_lines.entry_id
      AND (public.user_can_access_org(e.organization_id) OR public.user_can_access_location(e.location_id))
  )
);

-- invoice_documents
DROP POLICY IF EXISTS invoice_docs_read ON public.invoice_documents;
DROP POLICY IF EXISTS invoice_docs_insert ON public.invoice_documents;
DROP POLICY IF EXISTS invoice_docs_update ON public.invoice_documents;

CREATE POLICY invoice_docs_read ON public.invoice_documents
FOR SELECT TO authenticated
USING (public.can_access_finance(auth.uid()) AND public.user_can_access_org(organization_id));

CREATE POLICY invoice_docs_insert ON public.invoice_documents
FOR INSERT TO authenticated
WITH CHECK (public.can_access_finance(auth.uid()) AND public.user_can_access_org(organization_id));

CREATE POLICY invoice_docs_update ON public.invoice_documents
FOR UPDATE TO authenticated
USING (public.can_access_finance(auth.uid()) AND public.user_can_access_org(organization_id))
WITH CHECK (public.can_access_finance(auth.uid()) AND public.user_can_access_org(organization_id));