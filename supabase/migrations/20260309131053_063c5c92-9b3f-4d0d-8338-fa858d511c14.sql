
CREATE POLICY "Users can update their followed companies"
  ON public.followed_companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
