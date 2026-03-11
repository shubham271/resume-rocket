
-- Login logs table for IP tracking
CREATE TABLE public.user_login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  location text,
  login_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all login logs"
ON public.user_login_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert login logs"
ON public.user_login_logs FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Admin audit logs
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Blocked accounts table
CREATE TABLE public.blocked_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  reason text NOT NULL,
  description text,
  blocked_by uuid NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blocked accounts"
ON public.blocked_accounts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Blocked domains table
CREATE TABLE public.blocked_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  reason text,
  blocked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blocked domains"
ON public.blocked_domains FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin function to get user detail with stats
CREATE OR REPLACE FUNCTION public.admin_get_user_detail(_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'user', (
      SELECT jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed_at', u.email_confirmed_at,
        'display_name', p.display_name,
        'phone_number', p.phone_number,
        'avatar_url', p.avatar_url
      )
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.user_id = u.id
      WHERE u.id = _target_user_id
    ),
    'stats', jsonb_build_object(
      'resumes_count', (SELECT count(*) FROM public.resumes WHERE user_id = _target_user_id),
      'cover_letters_count', (SELECT count(*) FROM public.cover_letters WHERE user_id = _target_user_id),
      'analyses_count', (SELECT count(*) FROM public.resume_analyses WHERE user_id = _target_user_id),
      'career_profiles_count', (SELECT count(*) FROM public.career_profiles WHERE user_id = _target_user_id),
      'followed_companies_count', (SELECT count(*) FROM public.followed_companies WHERE user_id = _target_user_id)
    ),
    'login_logs', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'ip_address', ip_address,
        'user_agent', user_agent,
        'location', location,
        'login_at', login_at
      ) ORDER BY login_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM public.user_login_logs WHERE user_id = _target_user_id LIMIT 50) sub
    ),
    'is_blocked', EXISTS(SELECT 1 FROM public.blocked_accounts WHERE user_id = _target_user_id),
    'block_info', (
      SELECT jsonb_build_object('reason', reason, 'description', description, 'blocked_at', blocked_at)
      FROM public.blocked_accounts WHERE user_id = _target_user_id
    ),
    'roles', (
      SELECT COALESCE(jsonb_agg(role), '[]'::jsonb)
      FROM public.user_roles WHERE user_id = _target_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Admin function to get platform stats
CREATE OR REPLACE FUNCTION public.admin_get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'total_resumes', (SELECT count(*) FROM public.resumes),
    'total_cover_letters', (SELECT count(*) FROM public.cover_letters),
    'total_analyses', (SELECT count(*) FROM public.resume_analyses),
    'total_career_profiles', (SELECT count(*) FROM public.career_profiles),
    'total_followed_companies', (SELECT count(*) FROM public.followed_companies),
    'blocked_accounts_count', (SELECT count(*) FROM public.blocked_accounts),
    'users_last_7_days', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'users_last_30_days', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'resumes_last_7_days', (SELECT count(*) FROM public.resumes WHERE created_at > now() - interval '7 days'),
    'cover_letters_last_7_days', (SELECT count(*) FROM public.cover_letters WHERE created_at > now() - interval '7 days'),
    'daily_signups', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'count', c) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at)::date AS d, count(*) AS c
        FROM auth.users
        WHERE created_at > now() - interval '30 days'
        GROUP BY d
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
