ALTER TABLE public.pos_tickets
  ADD COLUMN IF NOT EXISTS drive_url text,
  ADD COLUMN IF NOT EXISTS drive_file_id text;