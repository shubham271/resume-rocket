import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface CareerProfile {
  id: string;
  profile_name: string;
  target_role: string;
  description: string | null;
}

export const useCareerProfiles = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<CareerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("career_profiles")
      .select("id, profile_name, target_role, description")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setProfiles(data as CareerProfile[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  return { profiles, loading, refetch: fetchProfiles };
};
