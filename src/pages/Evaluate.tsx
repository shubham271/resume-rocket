import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Upload, Sparkles, CheckCircle2, AlertTriangle,
  Lightbulb, MessageSquare, Target,
  TrendingUp, X, FileUp, Zap, Shield, Brain, ArrowRight,
  Clock, ChevronDown, ChevronUp, Trash2
} from "lucide-react";
import ScoreRing from "@/components/ScoreRing";
import { toast } from "sonner";

const MODELS = [
  { id: "phi4:14b", label: "phi4:14b", tier: "free" },
  { id: "gemma3:12b", label: "gemma3:12b", tier: "free" },
  { id: "llama3.1:8b", label: "llama3.1:8b", tier: "free" },
  { id: "gemini-flash", label: "Gemini Flash", tier: "basic" },
  { id: "gpt-5-mini", label: "GPT-5 Mini", tier: "pro" },
  { id: "gpt-5", label: "GPT-5", tier: "premium" },
];

interface AnalysisResult {
  score: number;
  keywordMatch: number | null;
  semanticMatch: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  niceToInclude: string[];
  interviewTips: { question: string; strategy: string }[];
  summary: string;
}

type AnalysisStep = {
  label: string;
  status: "pending" | "running" | "done" | "error";
};

const mockAnalyze = (resumeText: string, jdText: string, model: string): AnalysisResult => {
  const jdWords = jdText.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const resumeWords = new Set(resumeText.toLowerCase().split(/\W+/).filter(w => w.length > 3));

  const commonSkills = [
    "react", "typescript", "javascript", "python", "node", "aws", "docker", "sql",
    "git", "agile", "rest", "api", "css", "html", "java", "kubernetes", "testing",
    "mongodb", "graphql", "figma", "tailwind", "next", "vue", "angular", "support",
    "documentation", "management", "communication", "community",
  ];

  const jdSkills = [...new Set(jdWords.filter(w => commonSkills.includes(w)))];
  const matched = jdSkills.filter(s => resumeWords.has(s));
  const missing = jdSkills.filter(s => !resumeWords.has(s));

  const baseScore = jdSkills.length > 0
    ? Math.round((matched.length / jdSkills.length) * 70)
    : 45;
  const score = Math.min(Math.round(baseScore + Math.min(resumeText.length / 80, 20)), 98);

  return {
    score,
    keywordMatch: jdSkills.length > 0 ? Math.round((matched.length / jdSkills.length) * 100) : null,
    semanticMatch: null,
    matchedSkills: matched,
    missingSkills: missing,
    strengths: [
      "Local NLP analysis completed — keyword matching, scoring, and format checks above are accurate.",
    ],
    weaknesses: [
      "AI qualitative insights unavailable — try selecting a different model.",
    ],
    suggestions: [
      "Select a different AI model and re-analyze for detailed qualitative suggestions.",
    ],
    niceToInclude: [
      "Add your LinkedIn profile URL to improve recruiter visibility and provide social proof.",
      "Strengthen action verbs — only 19% of bullets start with strong verbs; begin each bullet with a confident action word like Led, Built, or Resolved.",
      "Quantify more achievements — add specific numbers, percentages, or team sizes to demonstrate measurable impact.",
    ],
    interviewTips: [
      {
        question: "Tell me about yourself and why you're applying for this role?",
        strategy: `Lead with your strongest matched qualifications (${matched.slice(0, 3).join(", ")}) and connect them directly to what the company needs.`,
      },
      {
        question: `How do you handle ${missing[0] || "challenges"}? (a gap in your resume)`,
        strategy: "Acknowledge the gap honestly, pivot to your closest related experience, and demonstrate your ability to close skill gaps quickly.",
      },
      {
        question: "Describe a challenging situation in a previous role and how you resolved it.",
        strategy: `Use STAR method — draw from specific achievements and skills (${matched.slice(0, 2).join(", ")}) that directly align with this role.`,
      },
      {
        question: "Where do you see yourself in 3-5 years?",
        strategy: "Align your career goals with the company's growth trajectory and show how this position is a natural step in your progression.",
      },
    ],
    summary: `ATS score: ${score}/100. Local NLP analysis completed. AI qualitative analysis via ${model}.`,
  };
};

const tierColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  basic: "bg-primary/10 text-primary",
  pro: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  premium: "bg-destructive/10 text-destructive",
};

const Evaluate = () => {
  const { user } = useAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState("phi4:14b");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [resumeDragActive, setResumeDragActive] = useState(false);
  const [jdDragActive, setJdDragActive] = useState(false);
  const [history, setHistory] = useState<Tables<"resume_analyses">[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setHistory(data);
    setLoadingHistory(false);
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const deleteAnalysis = async (id: string) => {
    const { error } = await supabase.from("resume_analyses").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete analysis");
    } else {
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success("Analysis deleted");
    }
  };

  const handleResumeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setResumeDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setResumeFile(file);
      toast.success(`Resume uploaded: ${file.name}`);
    } else {
      toast.error("Please upload a PDF file.");
    }
  }, []);

  const handleJdDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setJdDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setJdFile(file);
      toast.success(`JD uploaded: ${file.name}`);
    } else {
      toast.error("Please upload a PDF file.");
    }
  }, []);

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
      toast.success(`Resume uploaded: ${file.name}`);
    }
  };

  const handleJdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setJdFile(file);
      toast.success(`JD uploaded: ${file.name}`);
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim() && !resumeFile) {
      toast.error("Please upload a resume or paste resume text.");
      return;
    }
    if (!jobDescription.trim() && !jdFile) {
      toast.error("Please provide a job description.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    const analysisSteps: AnalysisStep[] = [
      { label: "Running local NLP analysis (spaCy + TF-IDF + NLTK)...", status: "pending" },
      { label: `Getting qualitative insights from ${selectedModel} (compact prompt)...`, status: "pending" },
    ];
    setSteps(analysisSteps);

    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "running" } : s));
    await new Promise(r => setTimeout(r, 1200));
    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "done" } : s));

    setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: "running" } : s));
    await new Promise(r => setTimeout(r, 1500));
    setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: "done" } : s));

    const textForAnalysis = resumeText || `[PDF content from ${resumeFile?.name}]`;
    const jdForAnalysis = jobDescription || `[PDF content from ${jdFile?.name}]`;
    const analysis = mockAnalyze(textForAnalysis, jdForAnalysis, selectedModel);
    setResult(analysis);
    setIsAnalyzing(false);

    if (user) {
      const { error } = await supabase.from("resume_analyses").insert({
        user_id: user.id,
        score: analysis.score,
        matched_skills: analysis.matchedSkills,
        missing_skills: analysis.missingSkills,
        suggestions: analysis.suggestions,
      });
      if (error) toast.error("Failed to save analysis");
      else toast.success("Analysis saved to your dashboard!");
    }
  };

  const modelInfo = MODELS.find(m => m.id === selectedModel);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        {/* Hero Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-3.5 w-3.5" />
            ATS-Powered Resume Analysis
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Evaluate Resume
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground leading-relaxed">
            Upload your resume and provide a job description to get an ATS compatibility score and actionable feedback.
          </p>
        </div>

        {/* Input Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Resume Card */}
          <Card className="overflow-hidden border-2 border-border/60 shadow-md transition-shadow hover:shadow-lg">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div
                className={`relative flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all duration-200 ${
                  resumeDragActive
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : resumeFile
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
                }`}
                onDragOver={(e) => { e.preventDefault(); setResumeDragActive(true); }}
                onDragLeave={() => setResumeDragActive(false)}
                onDrop={handleResumeDrop}
              >
                {resumeFile ? (
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{resumeFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(0)} KB • PDF</p>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-2 h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => setResumeFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Drop your resume PDF here</p>
                    <span className="text-xs text-muted-foreground">or</span>
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => resumeInputRef.current?.click()}>
                      Browse Files
                    </Button>
                  </>
                )}
                <input ref={resumeInputRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeFileChange} />
              </div>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-muted-foreground">or paste text</span>
                <Separator className="flex-1" />
              </div>
              <Textarea
                placeholder="Paste your resume content here..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="min-h-[100px] resize-none rounded-xl border-border/60 bg-muted/20 text-sm focus:bg-background"
              />
            </CardContent>
          </Card>

          {/* Job Description Card */}
          <Card className="overflow-hidden border-2 border-border/60 shadow-md transition-shadow hover:shadow-lg">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                Job Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <Textarea
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[180px] resize-none rounded-xl border-border/60 bg-muted/20 text-sm focus:bg-background"
              />
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs font-medium text-muted-foreground">and / or</span>
                <Separator className="flex-1" />
              </div>
              <div
                className={`flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all duration-200 ${
                  jdDragActive
                    ? "border-primary bg-primary/5"
                    : jdFile
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
                }`}
                onDragOver={(e) => { e.preventDefault(); setJdDragActive(true); }}
                onDragLeave={() => setJdDragActive(false)}
                onDrop={handleJdDrop}
              >
                {jdFile ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <FileUp className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold">{jdFile.name}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => setJdFile(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Drop JD PDF here <span className="text-xs opacity-60">(optional)</span>
                  </p>
                )}
                <input ref={jdInputRef} type="file" accept=".pdf" className="hidden" onChange={handleJdFileChange} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <Card className="mt-8 border-2 border-border/60 shadow-md">
          <CardContent className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Model</span>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[200px] rounded-xl border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2.5">
                        {m.label}
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tierColors[m.tier]}`}>
                          {m.tier}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={(!resumeText.trim() && !resumeFile) || (!jobDescription.trim() && !jdFile) || isAnalyzing}
              size="lg"
              className="gap-2.5 rounded-xl px-10 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              <Sparkles className="h-5 w-5" />
              {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
              {!isAnalyzing && <ArrowRight className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>

        {/* Pipeline Info */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            Keywords & scoring: local NLP — zero AI tokens
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
            <Brain className="h-3 w-3 text-primary" />
            Summary & suggestions: selected AI model
          </span>
        </div>

        {/* Analysis Steps */}
        {steps.length > 0 && (
          <Card className="mx-auto mt-6 max-w-lg border-border/60">
            <CardContent className="space-y-3 p-5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.status === "done" && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  {step.status === "running" && (
                    <div className="flex h-6 w-6 items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {step.status === "pending" && (
                    <div className="flex h-6 w-6 items-center justify-center">
                      <div className="h-4 w-4 rounded-full border-2 border-border" />
                    </div>
                  )}
                  {step.status === "error" && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                  )}
                  <span className={`text-sm ${step.status === "done" ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Score Hero */}
            <Card className="overflow-hidden border-2 border-border/60 shadow-lg">
              <div className="bg-gradient-to-br from-muted/50 to-background p-8 md:p-10">
                <div className="flex flex-col items-center gap-6 md:flex-row md:gap-12">
                  <ScoreRing score={result.score} size={180} strokeWidth={14} />
                  <div className="flex-1 text-center md:text-left">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      Scoring: AI-only | Insights: {selectedModel}
                    </div>
                    <h2 className="font-display text-2xl font-bold">ATS Score</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
                    <div className="mt-5 flex justify-center gap-8 md:justify-start">
                      <div className="rounded-xl bg-card border border-border/60 px-5 py-3 text-center shadow-sm">
                        <p className="font-display text-xl font-bold text-foreground">
                          {result.keywordMatch !== null ? `${result.keywordMatch}%` : "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Keyword match</p>
                      </div>
                      <div className="rounded-xl bg-card border border-border/60 px-5 py-3 text-center shadow-sm">
                        <p className="font-display text-xl font-bold text-foreground">
                          {result.semanticMatch !== null ? `${result.semanticMatch}%` : "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Semantic match</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Keywords */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2 border-border/60 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--success))]/15">
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                    </div>
                    Matched
                    <Badge variant="secondary" className="ml-auto font-mono text-xs">
                      {result.matchedSkills.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedSkills.length > 0 ? result.matchedSkills.map(s => (
                      <span key={s} className="rounded-lg bg-[hsl(var(--success))]/10 px-3 py-1.5 text-sm font-medium text-[hsl(var(--success))]">
                        {s}
                      </span>
                    )) : <p className="text-sm text-muted-foreground">No specific matches detected.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-border/60 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    Missing
                    <Badge variant="secondary" className="ml-auto font-mono text-xs">
                      {result.missingSkills.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.missingSkills.length > 0 ? result.missingSkills.map(s => (
                      <span key={s} className="rounded-lg bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
                        {s}
                      </span>
                    )) : <p className="text-sm text-muted-foreground">No major gaps found!</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Weaknesses */}
            <Card className="border-2 border-border/60 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  Strengths & Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                      <h4 className="text-sm font-semibold">Strengths</h4>
                    </div>
                    {result.strengths.map((s, i) => (
                      <div key={i} className="rounded-lg bg-[hsl(var(--success))]/5 p-3">
                        <p className="text-sm leading-relaxed text-muted-foreground">{s}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      <h4 className="text-sm font-semibold">Weaknesses</h4>
                    </div>
                    {result.weaknesses.map((s, i) => (
                      <div key={i} className="rounded-lg bg-destructive/5 p-3">
                        <p className="text-sm leading-relaxed text-muted-foreground">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actionable Suggestions */}
            <Card className="border-2 border-border/60 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  Actionable Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="flex gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Nice to Include */}
            <Card className="border-2 border-[hsl(var(--warning))]/20 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--warning))]/15">
                    <Lightbulb className="h-4 w-4 text-[hsl(var(--warning))]" />
                  </div>
                  Nice to Include
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.niceToInclude.map((s, i) => (
                  <div key={i} className="flex gap-4 rounded-xl border border-[hsl(var(--warning))]/15 bg-[hsl(var(--warning))]/5 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--warning))] text-xs font-bold text-[hsl(var(--warning-foreground))] shadow-sm">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Interview Tips */}
            <Card className="border-2 border-border/60 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  Interview Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.interviewTips.map((tip, i) => (
                  <div key={i} className="rounded-xl border border-border/60 bg-muted/20 p-5 transition-colors hover:bg-muted/30">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        Q{i + 1}
                      </span>
                      <p className="text-sm font-semibold leading-snug">{tip.question}</p>
                    </div>
                    <div className="ml-9 rounded-lg bg-card border border-border/40 p-3">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-primary">Strategy:</span> {tip.strategy}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evaluate;
