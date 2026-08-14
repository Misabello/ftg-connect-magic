ALTER TABLE public.treasury_memos DROP CONSTRAINT IF EXISTS treasury_memos_status_check;
ALTER TABLE public.treasury_memos
  ADD CONSTRAINT treasury_memos_status_check
  CHECK (status = ANY (ARRAY['pendiente','aprobada','conciliada','anulada']));

ALTER TABLE public.treasury_memos
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciliation_note text,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS treasury_memos_idempotency_key_uidx
  ON public.treasury_memos (idempotency_key) WHERE idempotency_key IS NOT NULL;