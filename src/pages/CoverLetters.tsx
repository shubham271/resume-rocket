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
  FileText, Upload, Trash2, Loader2, Download, Clock, Sparkles, Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CoverLetter {
  id: string;
  title: string;
  version: number;
  file_url: string | null;
  file_name: string | null;
  is_generated: boolean;
  content: string | null;
  job_title: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

const CoverLettersPage = () => {
  const { user } = useAuth();
  const [letters, setLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genJobTitle, setGenJobTitle] = useState("");
  const [genCompany, setGenCompany] = useState("");
  const [genJobDesc, setGenJobDesc] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showGenForm, setShowGenForm] = useState(false);

  const fetchLetters = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cover_letters")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (!error && data) setLetters(data as CoverLetter[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLetters(); }, [fetchLetters]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/cover-letters/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
    if (uploadErr) { toast.error("Upload failed"); setUploading(false); return; }

    const existing = letters.filter((l) => l.title.toLowerCase() === title.trim().toLowerCase());
    const nextVersion = existing.length > 0 ? Math.max(...existing.map((l) => l.version)) + 1 : 1;

    const { error } = await supabase.from("cover_letters").insert({
      user_id: user.id, title: title.trim(), version: nextVersion,
      file_url: path, file_name: file.name, is_generated: false,
    } as any);

    if (error) toast.error("Failed to save"); else { toast.success("Cover letter uploaded"); setTitle(""); fetchLetters(); }
    setUploading(false);
    e.target.value = "";
  };

  const handleGenerate = async () => {
    if (!user || !genJobTitle.trim() || !genCompany.trim()) return;
    setGenerating(true);

    try {
      const resp = await supabase.functions.invoke("generate-cover-letter", {
        body: { jobTitle: genJobTitle.trim(), company: genCompany.trim(), jobDescription: genJobDesc.trim() },
      });

      if (resp.error) throw resp.error;
      const content = resp.data?.content;
      if (!content) throw new Error("No content returned");

      const clTitle = `${genCompany.trim()} - ${genJobTitle.trim()}`;
      const existing = letters.filter((l) => l.title.toLowerCase() === clTitle.toLowerCase());
      const nextVersion = existing.length > 0 ? Math.max(...existing.map((l) => l.version)) + 1 : 1;

      const { error } = await supabase.from("cover_letters").insert({
        user_id: user.id, title: clTitle, version: nextVersion,
        content, job_title: genJobTitle.trim(), company_name: genCompany.trim(),
        is_generated: true,
      } as any);

      if (error) throw error;
      toast.success("Cover letter generated!");
      setGenJobTitle(""); setGenCompany(""); setGenJobDesc(""); setShowGenForm(false);
      fetchLetters();
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    }
    setGenerating(false);
  };

  const handleDelete = async (letter: CoverLetter) => {
    if (letter.file_url) await supabase.storage.from("documents").remove([letter.file_url]);
    const { error } = await supabase.from("cover_letters").delete().eq("id", letter.id);
    if (error) toast.error("Failed to delete"); else {
      toast.success("Deleted"); setLetters((prev) => prev.filter((l) => l.id !== letter.id));
    }
  };

  const handleDownload = async (letter: CoverLetter) => {
    if (!letter.file_url) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(letter.file_url, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Cover Letters</h1>
        <p className="mt-1 text-muted-foreground">Upload or AI-generate tailored cover letters.</p>
      </div>

      {/* Upload */}
      <div className="mb-6 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" /> Upload Cover Letter
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Title</Label>
            <Input placeholder="e.g. Google SWE Cover Letter" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <input type="file" id="clFile" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading || !title.trim()} />
            <Button asChild disabled={uploading || !title.trim()} className="gap-2 rounded-xl cursor-pointer">
              <label htmlFor="clFile">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Choose File"}
              </label>
            </Button>
          </div>
        </div>
      </div>

      {/* AI Generate */}
      <div className="mb-8 rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Generate
          </h2>
          <Button variant="outline" size="sm" onClick={() => setShowGenForm(!showGenForm)} className="rounded-xl">
            {showGenForm ? "Hide" : "Create with AI"}
          </Button>
        </div>
        {showGenForm && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input placeholder="e.g. Software Engineer" value={genJobTitle} onChange={(e) => setGenJobTitle(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input placeholder="e.g. Google" value={genCompany} onChange={(e) => setGenCompany(e.target.value)} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job Description (optional)</Label>
              <Textarea placeholder="Paste the job description here for a more tailored cover letter..." value={genJobDesc} onChange={(e) => setGenJobDesc(e.target.value)} className="min-h-[100px] rounded-xl" />
            </div>
            <Button onClick={handleGenerate} disabled={generating || !genJobTitle.trim() || !genCompany.trim()} className="gap-2 rounded-xl">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating..." : "Generate Cover Letter"}
            </Button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : letters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No cover letters yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Upload or generate your first cover letter above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {letters.map((letter) => (
            <div key={letter.id} className="rounded-2xl border bg-card px-6 py-4 transition-all hover:shadow-md hover:shadow-primary/5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent">
                    <FileText className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold truncate">{letter.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-md text-xs">v{letter.version}</Badge>
                      {letter.is_generated && <Badge variant="outline" className="rounded-md text-xs">AI Generated</Badge>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(letter.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {letter.content && (
                    <Button variant="ghost" size="sm" onClick={() => setPreviewId(previewId === letter.id ? null : letter.id)} className="gap-1 rounded-xl text-muted-foreground hover:text-foreground">
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {letter.file_url && (
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(letter)} className="gap-1 rounded-xl text-muted-foreground hover:text-foreground">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(letter)} className="gap-1 rounded-xl text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {previewId === letter.id && letter.content && (
                <div className="mt-4 rounded-xl bg-secondary/50 p-4 text-sm whitespace-pre-wrap">{letter.content}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoverLettersPage;
