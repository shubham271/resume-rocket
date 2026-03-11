import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCareerProfiles, CareerProfile } from "@/hooks/useCareerProfiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText, Upload, Trash2, Loader2, Download, Clock, Plus, UserCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Resume {
  id: string;
  title: string;
  version: number;
  file_url: string | null;
  file_name: string | null;
  is_generated: boolean;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

const RESUME_TEMPLATES = [
  { id: "professional", label: "Professional", description: "Clean, traditional format ideal for corporate roles" },
  { id: "modern", label: "Modern", description: "Contemporary design with a creative touch" },
  { id: "minimal", label: "Minimal", description: "Simple and distraction-free layout" },
  { id: "technical", label: "Technical", description: "Optimized for engineering and tech roles" },
];

const ResumesPage = () => {
  const { user } = useAuth();
  const { profiles } = useCareerProfiles();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("all");
  const [uploadProfileId, setUploadProfileId] = useState<string>("none");

  const fetchResumes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("resumes")
      .select("id, title, version, file_url, file_name, is_generated, profile_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (!error && data) setResumes(data as Resume[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!title.trim()) { toast.error("Please enter a title"); return; }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/resumes/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
    if (uploadErr) { toast.error("Failed to upload"); setUploading(false); return; }

    const existing = resumes.filter((r) => r.title.toLowerCase() === title.trim().toLowerCase());
    const nextVersion = existing.length > 0 ? Math.max(...existing.map((r) => r.version)) + 1 : 1;

    const { error: insertErr } = await supabase.from("resumes").insert({
      user_id: user.id,
      title: title.trim(),
      version: nextVersion,
      file_url: path,
      file_name: file.name,
      is_generated: false,
      profile_id: uploadProfileId === "none" ? null : uploadProfileId,
    } as any);

    if (insertErr) toast.error("Failed to save");
    else { toast.success(`Resume "${title.trim()}" v${nextVersion} uploaded`); setTitle(""); fetchResumes(); }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (resume: Resume) => {
    if (!user) return;
    if (resume.file_url) await supabase.storage.from("documents").remove([resume.file_url]);
    const { error } = await supabase.from("resumes").delete().eq("id", resume.id);
    if (error) toast.error("Failed to delete");
    else { toast.success(`Deleted "${resume.title}" v${resume.version}`); setResumes((prev) => prev.filter((r) => r.id !== resume.id)); }
  };

  const handleDownload = async (resume: Resume) => {
    if (!resume.file_url) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(resume.file_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const getProfileLabel = (profileId: string | null) => {
    if (!profileId) return null;
    const p = profiles.find((p) => p.id === profileId);
    return p ? `${p.profile_name} — ${p.target_role}` : null;
  };

  const filtered = selectedProfileId === "all"
    ? resumes
    : selectedProfileId === "none"
    ? resumes.filter((r) => !r.profile_id)
    : resumes.filter((r) => r.profile_id === selectedProfileId);

  const grouped = filtered.reduce<Record<string, Resume[]>>((acc, r) => {
    (acc[r.title] = acc[r.title] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">My Resumes</h1>
        <p className="mt-1 text-muted-foreground">Upload and manage different versions of your resume.</p>
      </div>

      {/* Upload Section */}
      <div className="mb-8 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Upload Resume
        </h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resumeTitle">Resume Title</Label>
              <Input id="resumeTitle" placeholder="e.g. Software Engineer Resume" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Career Profile (optional)</Label>
              <Select value={uploadProfileId} onValueChange={setUploadProfileId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="No profile" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No profile</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.profile_name} — {p.target_role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <input type="file" id="resumeFile" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading || !title.trim()} />
            <Button asChild disabled={uploading || !title.trim()} className="gap-2 rounded-xl cursor-pointer">
              <label htmlFor="resumeFile">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Choose File"}
              </label>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter by profile */}
      {profiles.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <UserCircle className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger className="w-[250px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Profiles</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.profile_name} — {p.target_role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Resume List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No resumes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Upload your first resume above or use the Resume Builder.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupTitle, versions]) => (
            <div key={groupTitle} className="rounded-2xl border bg-card">
              <div className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">{groupTitle}</h3>
                    {versions[0]?.profile_id && (
                      <Badge variant="outline" className="rounded-md text-xs">
                        {getProfileLabel(versions[0].profile_id)}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="rounded-md">
                    {versions.length} version{versions.length > 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
              <div className="divide-y">
                {versions.sort((a, b) => b.version - a.version).map((resume) => (
                  <div key={resume.id} className="flex items-center justify-between gap-4 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">v{resume.version}</span>
                        {resume.is_generated && <Badge variant="outline" className="rounded-md text-xs">AI Generated</Badge>}
                        {resume.file_name && <span className="truncate text-xs text-muted-foreground">{resume.file_name}</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(resume.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {resume.file_url && (
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(resume)} className="gap-1 rounded-xl text-muted-foreground hover:text-foreground">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(resume)} className="gap-1 rounded-xl text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumesPage;
