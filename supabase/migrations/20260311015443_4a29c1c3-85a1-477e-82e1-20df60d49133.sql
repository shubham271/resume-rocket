
-- Career profiles table
CREATE TABLE public.career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_name text NOT NULL,
  target_role text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their career profiles" ON public.career_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their career profiles" ON public.career_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their career profiles" ON public.career_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their career profiles" ON public.career_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add profile_id to resumes and cover_letters
ALTER TABLE public.resumes ADD COLUMN profile_id uuid REFERENCES public.career_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.cover_letters ADD COLUMN profile_id uuid REFERENCES public.career_profiles(id) ON DELETE SET NULL;

-- Update trigger for career_profiles
CREATE TRIGGER update_career_profiles_updated_at BEFORE UPDATE ON public.career_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
