-- =============== ENUMS ===============
CREATE TYPE public.invoice_direction AS ENUM ('proveedor','cliente');
CREATE TYPE public.invoice_doc_type AS ENUM (
  'factura_proveedor','factura_cliente','nota_credito_proveedor','nota_credito_cliente',
  'nota_debito','recibo','comprobante_pago','orden_compra','no_reconocido'
);
CREATE TYPE public.invoice_extraction_status AS ENUM ('pendiente','procesando','extraido','baja_confianza','error');
CREATE TYPE public.invoice_approval_status AS ENUM (
  'recibida','procesando','requiere_revision','pendiente_aprobacion','aprobada','rechazada',
  'programada_pago','pagada','vencida','posible_duplicado'
);
CREATE TYPE public.email_ingestion_status AS ENUM ('recibido','procesando','procesado','requiere_revision','duplicado','error');
CREATE TYPE public.invoice_field_source AS ENUM ('texto','xml','ocr','ia','usuario');
CREATE TYPE public.invoice_alert_severity AS ENUM ('baja','media','alta','critica');

-- =============== CASILLAS ===============
CREATE TABLE public.email_ingestion_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legal_entity_id uuid REFERENCES public.organizations(id),
  country_code text REFERENCES public.countries(code),
  email_address text NOT NULL,
  inbox_label text NOT NULL DEFAULT 'FTG/Facturas',
  processing_label text NOT NULL DEFAULT 'FTG/Procesando',
  processed_label text NOT NULL DEFAULT 'FTG/Procesado',
  review_label text NOT NULL DEFAULT 'FTG/Requiere revision',
  error_label text NOT NULL DEFAULT 'FTG/Error',
  search_query text NOT NULL DEFAULT 'has:attachment (subject:factura OR subject:invoice OR subject:fatura OR subject:"nota de credito")',
  allowed_senders text[] NOT NULL DEFAULT '{}',
  allowed_mime_types text[] NOT NULL DEFAULT ARRAY['application/pdf','application/xml','text/xml','image/jpeg','image/png','image/webp'],
  max_attachment_mb integer NOT NULL DEFAULT 15,
  frequency_minutes integer NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email_address)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_ingestion_accounts TO authenticated;
GRANT ALL ON public.email_ingestion_accounts TO service_role;
ALTER TABLE public.email_ingestion_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ing_accounts_read" ON public.email_ingestion_accounts FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id));
CREATE POLICY "ing_accounts_write" ON public.email_ingestion_accounts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id))
  WITH CHECK (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id));
CREATE TRIGGER t_ing_accounts_upd BEFORE UPDATE ON public.email_ingestion_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== EVENTOS DE CORREO ===============
CREATE TABLE public.email_ingestion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.email_ingestion_accounts(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  gmail_thread_id text,
  sender text,
  recipients text[] NOT NULL DEFAULT '{}',
  subject text,
  body_snippet text,
  received_at timestamptz,
  attachment_count integer NOT NULL DEFAULT 0,
  status public.email_ingestion_status NOT NULL DEFAULT 'recibido',
  request_id text,
  signature_verified boolean NOT NULL DEFAULT false,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, gmail_message_id)
);
GRANT SELECT, INSERT, UPDATE ON public.email_ingestion_events TO authenticated;
GRANT ALL ON public.email_ingestion_events TO service_role;
ALTER TABLE public.email_ingestion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ing_events_read" ON public.email_ingestion_events FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id));
CREATE POLICY "ing_events_update" ON public.email_ingestion_events FOR UPDATE TO authenticated
  USING (public.user_can_access_org(organization_id))
  WITH CHECK (public.user_can_access_org(organization_id));
CREATE INDEX idx_ing_events_status ON public.email_ingestion_events (organization_id, status, created_at DESC);
CREATE TRIGGER t_ing_events_upd BEFORE UPDATE ON public.email_ingestion_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Idempotencia de solicitudes firmadas (anti-replay)
CREATE TABLE public.email_ingestion_requests (
  request_id text PRIMARY KEY,
  account_id uuid REFERENCES public.email_ingestion_accounts(id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_ingestion_requests TO service_role;
ALTER TABLE public.email_ingestion_requests ENABLE ROW LEVEL SECURITY;

-- =============== DOCUMENTOS ===============
CREATE TABLE public.invoice_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  legal_entity_id uuid REFERENCES public.organizations(id),
  country_code text REFERENCES public.countries(code),
  document_direction public.invoice_direction NOT NULL DEFAULT 'proveedor',
  document_type public.invoice_doc_type NOT NULL DEFAULT 'no_reconocido',
  issuer_name text,
  issuer_tax_id text,
  receiver_name text,
  receiver_tax_id text,
  document_number text,
  series text,
  point_of_sale_code text,
  issue_date date,
  due_date date,
  currency_code text REFERENCES public.currencies(code),
  exchange_rate numeric(14,6),
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  withholding_amount numeric(14,2) NOT NULL DEFAULT 0,
  perception_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_terms text,
  purchase_order text,
  bank_details text,
  fiscal_code text,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  supplier_id uuid REFERENCES public.suppliers(id),
  customer_id uuid REFERENCES public.customers(id),
  location_id uuid REFERENCES public.locations(id),
  venue_id uuid REFERENCES public.venues(id),
  event_id uuid REFERENCES public.events(id),
  cost_center text,
  finance_document_id uuid REFERENCES public.finance_documents(id),
  storage_bucket text NOT NULL DEFAULT 'invoice-inbox',
  storage_path text,
  file_name text,
  mime_type text,
  file_hash text,
  extraction_status public.invoice_extraction_status NOT NULL DEFAULT 'pendiente',
  approval_status public.invoice_approval_status NOT NULL DEFAULT 'recibida',
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  duplicate_of uuid REFERENCES public.invoice_documents(id),
  validation_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_documents TO authenticated;
GRANT ALL ON public.invoice_documents TO service_role;
ALTER TABLE public.invoice_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_docs_read" ON public.invoice_documents FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id));
CREATE POLICY "invoice_docs_insert" ON public.invoice_documents FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_org(organization_id));
CREATE POLICY "invoice_docs_update" ON public.invoice_documents FOR UPDATE TO authenticated
  USING (public.user_can_access_org(organization_id))
  WITH CHECK (public.user_can_access_org(organization_id));
CREATE POLICY "invoice_docs_delete" ON public.invoice_documents FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) AND public.user_can_access_org(organization_id));
CREATE UNIQUE INDEX uq_invoice_docs_file_hash ON public.invoice_documents (organization_id, file_hash)
  WHERE file_hash IS NOT NULL;
CREATE UNIQUE INDEX uq_invoice_docs_fiscal ON public.invoice_documents
  (organization_id, issuer_tax_id, document_type, COALESCE(point_of_sale_code,''), document_number, issue_date)
  WHERE issuer_tax_id IS NOT NULL AND document_number IS NOT NULL AND issue_date IS NOT NULL;
CREATE INDEX idx_invoice_docs_status ON public.invoice_documents (organization_id, approval_status, created_at DESC);
CREATE TRIGGER t_invoice_docs_upd BEFORE UPDATE ON public.invoice_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== CAMPOS EXTRAÍDOS ===============
CREATE TABLE public.invoice_extracted_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_document_id uuid NOT NULL REFERENCES public.invoice_documents(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  extracted_value text,
  corrected_value text,
  confidence numeric(5,2) NOT NULL DEFAULT 0,
  extraction_source public.invoice_field_source NOT NULL DEFAULT 'ia',
  page_number integer,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_document_id, field_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_extracted_fields TO authenticated;
GRANT ALL ON public.invoice_extracted_fields TO service_role;
ALTER TABLE public.invoice_extracted_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_fields_all" ON public.invoice_extracted_fields FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoice_documents d WHERE d.id = invoice_document_id AND public.user_can_access_org(d.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoice_documents d WHERE d.id = invoice_document_id AND public.user_can_access_org(d.organization_id)));
CREATE TRIGGER t_invoice_fields_upd BEFORE UPDATE ON public.invoice_extracted_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== TRABAJOS ===============
CREATE TABLE public.invoice_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_document_id uuid NOT NULL REFERENCES public.invoice_documents(id) ON DELETE CASCADE,
  status public.invoice_extraction_status NOT NULL DEFAULT 'pendiente',
  provider text NOT NULL DEFAULT 'lovable-ai',
  model text,
  attempts integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.invoice_processing_jobs TO authenticated;
GRANT ALL ON public.invoice_processing_jobs TO service_role;
ALTER TABLE public.invoice_processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_jobs_all" ON public.invoice_processing_jobs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoice_documents d WHERE d.id = invoice_document_id AND public.user_can_access_org(d.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoice_documents d WHERE d.id = invoice_document_id AND public.user_can_access_org(d.organization_id)));
CREATE TRIGGER t_invoice_jobs_upd BEFORE UPDATE ON public.invoice_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== VÍNCULO CORREO ↔ DOCUMENTO ===============
CREATE TABLE public.invoice_email_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_document_id uuid NOT NULL REFERENCES public.invoice_documents(id) ON DELETE CASCADE,
  email_ingestion_event_id uuid NOT NULL REFERENCES public.email_ingestion_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_document_id, email_ingestion_event_id)
);
GRANT SELECT, INSERT ON public.invoice_email_links TO authenticated;
GRANT ALL ON public.invoice_email_links TO service_role;
ALTER TABLE public.invoice_email_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_links_read" ON public.invoice_email_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoice_documents d WHERE d.id = invoice_document_id AND public.user_can_access_org(d.organization_id)));

-- =============== ALERTAS ===============
CREATE TABLE public.invoice_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_document_id uuid REFERENCES public.invoice_documents(id) ON DELETE CASCADE,
  email_ingestion_event_id uuid REFERENCES public.email_ingestion_events(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity public.invoice_alert_severity NOT NULL DEFAULT 'media',
  message text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.invoice_alerts TO authenticated;
GRANT ALL ON public.invoice_alerts TO service_role;
ALTER TABLE public.invoice_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_alerts_read" ON public.invoice_alerts FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id));
CREATE POLICY "invoice_alerts_write" ON public.invoice_alerts FOR ALL TO authenticated
  USING (public.user_can_access_org(organization_id))
  WITH CHECK (public.user_can_access_org(organization_id));
CREATE INDEX idx_invoice_alerts_open ON public.invoice_alerts (organization_id, resolved, created_at DESC);