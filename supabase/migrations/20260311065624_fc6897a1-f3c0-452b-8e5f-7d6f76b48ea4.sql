
-- Fix: restrict login log inserts to the user's own records
DROP POLICY "Service role can insert login logs" ON public.user_login_logs;
CREATE POLICY "Users can insert their own login logs"
ON public.user_login_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
