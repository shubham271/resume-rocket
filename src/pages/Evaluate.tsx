import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Briefcase, Sparkles, CheckCircle2, AlertTriangle, Plus } from "lucide-react";
import ScoreRing from "@/components/ScoreRing";
import { toast } from "sonner";

interface AnalysisResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

const mockAnalyze = (resume: string, jd: string): AnalysisResult => {
  const jdWords = jd.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const resumeWords = new Set(resume.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const commonSkills = ["react", "typescript", "javascript", "python", "node", "aws", "docker", "sql", "git", "agile", "rest", "api", "css", "html", "java", "kubernetes", "testing", "mongodb", "graphql", "figma", "tailwind", "next", "vue", "angular"];
  const jdSkills = commonSkills.filter(s => jdWords.includes(s));
  const matched = jdSkills.filter(s => resumeWords.has(s));
  const missing = jdSkills.filter(s => !resumeWords.has(s));
  const baseScore = jdSkills.length > 0 ? Math.round((matched.length / jdSkills.length) * 70) : 45;
  const score = Math.min(Math.round(baseScore + Math.min(resume.length / 50, 20)), 98);
  const suggestions = [
    ...missing.map(s => `Add "${s}" to your skills section with relevant project experience.`),
    "Quantify achievements with specific metrics (e.g., 'Improved load time by 40%').",
    "Include action verbs like 'Led', 'Architected', 'Optimized' at the start of bullet points.",
    "Tailor your professional summary to mirror the job description's key requirements.",
  ];
  return { score, matchedSkills: matched, missingSkills: missing, suggestions: suggestions.slice(0, 6) };
};

const Evaluate = () => {
  const { user } = useAuth();
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) return;
    setIsAnalyzing(true);

    setTimeout(async () => {
      const analysis = mockAnalyze(resume, jobDescription);
      setResult(analysis);
      setIsAnalyzing(false);

      // Save to DB
      if (user) {
        const { error } = await supabase.from("resume_analyses").insert({
          user_id: user.id,
          job_title: jobTitle || null,
          company_name: companyName || null,
          score: analysis.score,
          matched_skills: analysis.matchedSkills,
          missing_skills: analysis.missingSkills,
          suggestions: analysis.suggestions,
        });
        if (error) {
          toast.error("Failed to save analysis");
        } else {
          toast.success("Analysis saved to your dashboard!");
        }
      }
    }, 1500);
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Evaluate Resume</h1>
        <p className="mt-1 text-muted-foreground">Compare your resume against a job description.</p>
      </div>

      {/* Optional metadata */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Input
          placeholder="Job title (optional)"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          className="rounded-xl"
        />
        <Input
          placeholder="Company name (optional)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="rounded-xl"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Your Resume
          </label>
          <Textarea
            placeholder="Paste your resume content here..."
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            className="min-h-[280px] resize-none rounded-xl bg-card"
          />
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <Briefcase className="h-4 w-4 text-primary" /> Job Description
          </label>
          <Textarea
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[280px] resize-none rounded-xl bg-card"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Button onClick={handleAnalyze} disabled={!resume.trim() || !jobDescription.trim() || isAnalyzing} size="lg" className="gap-2 rounded-xl px-10">
          <Sparkles className="h-5 w-5" />
          {isAnalyzing ? "Analyzing..." : "Analyze Match"}
        </Button>
      </div>

      {result && (
        <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex items-center justify-center rounded-2xl border bg-card p-8">
              <ScoreRing score={result.score} />
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <CheckCircle2 className="h-5 w-5 text-success" /> Matched Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.length > 0 ? result.matchedSkills.map((s) => (
                  <span key={s} className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">{s}</span>
                )) : <p className="text-sm text-muted-foreground">No specific skill matches detected.</p>}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <AlertTriangle className="h-5 w-5 text-warning" /> Missing Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills.length > 0 ? result.missingSkills.map((s) => (
                  <span key={s} className="rounded-lg bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">{s}</span>
                )) : <p className="text-sm text-muted-foreground">Great — no major gaps found!</p>}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-8">
            <h3 className="mb-6 flex items-center gap-2 font-display text-xl font-semibold">
              <Plus className="h-5 w-5 text-primary" /> What to Add to Your Resume
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex gap-3 rounded-xl bg-secondary/50 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <p className="text-sm leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Evaluate;
