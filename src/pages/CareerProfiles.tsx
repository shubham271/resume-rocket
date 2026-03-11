import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UserCircle, Plus, Trash2, Loader2, Edit2, Check, X, Briefcase, FileText, PenTool,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CareerProfile {
  id: string;
  profile_name: string;
  target_role: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  resume_count?: number;
  cover_letter_count?: number;
}

const CareerProfilesPage = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<CareerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [desc, setDesc] = useState("");

  // Edit form
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("career_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Get counts
      const [resumeRes, clRes] = await Promise.all([
        supabase.from("resumes").select("id, profile_id").eq("user_id", user.id),
        supabase.from("cover_letters").select("id, profile_id").eq("user_id", user.id),
      ]);

      const enriched = (data as any[]).map((p) => ({
        ...p,
        resume_count: (resumeRes.data || []).filter((r: any) => r.profile_id === p.id).length,
        cover_letter_count: (clRes.data || []).filter((c: any) => c.profile_id === p.id).length,
      }));
      setProfiles(enriched);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleCreate = async () => {
    if (!user || !name.trim() || !role.trim()) return;
    const { error } = await supabase.from("career_profiles").insert({
      user_id: user.id,
      profile_name: name.trim(),
      target_role: role.trim(),
      description: desc.trim() || null,
    } as any);

    if (error) toast.error("Failed to create profile");
    else {
      toast.success(`Profile "${name.trim()}" created!`);
      setName(""); setRole(""); setDesc(""); setShowCreate(false);
      fetchProfiles();
    }
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase.from("career_profiles")
      .update({
        profile_name: editName.trim(),
        target_role: editRole.trim(),
        description: editDesc.trim() || null,
      } as any)
      .eq("id", id);

    if (error) toast.error("Failed to update");
    else {
      toast.success("Profile updated");
      setEditId(null);
      fetchProfiles();
    }
  };

  const handleDelete = async (profile: CareerProfile) => {
    const { error } = await supabase.from("career_profiles").delete().eq("id", profile.id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success(`Deleted "${profile.profile_name}"`);
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    }
  };

  const startEdit = (p: CareerProfile) => {
    setEditId(p.id);
    setEditName(p.profile_name);
    setEditRole(p.target_role);
    setEditDesc(p.description || "");
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Career Profiles</h1>
          <p className="mt-1 text-muted-foreground">
            Create separate profiles for different job roles — each with its own resumes & cover letters.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" /> New Profile
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-8 rounded-2xl border bg-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" /> Create Career Profile
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Profile Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adam" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Target Role *</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer" className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A short note about this career direction..." className="min-h-[60px] rounded-xl" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!name.trim() || !role.trim()} className="gap-2 rounded-xl">
              <Check className="h-4 w-4" /> Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Cancel</Button>
          </div>
        </div>
      )}

      {/* Profiles List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <UserCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No career profiles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first profile to organize resumes and cover letters by role.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="rounded-2xl border bg-card p-6 transition-all hover:shadow-md hover:shadow-primary/5">
              {editId === profile.id ? (
                <div className="space-y-3">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Profile Name" className="rounded-xl" />
                  <Input value={editRole} onChange={(e) => setEditRole(e.target.value)} placeholder="Target Role" className="rounded-xl" />
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className="min-h-[50px] rounded-xl" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(profile.id)} className="gap-1 rounded-xl">
                      <Check className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="rounded-xl">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <UserCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold">{profile.profile_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" /> {profile.target_role}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(profile)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(profile)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {profile.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{profile.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> {profile.resume_count || 0} resumes
                    </span>
                    <span className="flex items-center gap-1">
                      <PenTool className="h-3.5 w-3.5" /> {profile.cover_letter_count || 0} cover letters
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareerProfilesPage;
