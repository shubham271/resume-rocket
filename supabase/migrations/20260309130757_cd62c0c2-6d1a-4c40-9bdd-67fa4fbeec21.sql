
CREATE TABLE public.cached_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_name text NOT NULL,
  jobs jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_name)
);

ALTER TABLE public.cached_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their cached jobs"
  ON public.cached_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their cached jobs"
  ON public.cached_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their cached jobs"
  ON public.cached_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their cached jobs"
  ON public.cached_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
