ALTER TABLE public.ai_generation_jobs
  ADD COLUMN IF NOT EXISTS composition_path text,
  ADD COLUMN IF NOT EXISTS composition_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_prompt text,
  ADD COLUMN IF NOT EXISTS final_prompt text,
  ADD COLUMN IF NOT EXISTS negative_prompt text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS provider_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS output_mime_type text,
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS thumbnail_path text,
  ADD COLUMN IF NOT EXISTS output_width integer,
  ADD COLUMN IF NOT EXISTS output_height integer;