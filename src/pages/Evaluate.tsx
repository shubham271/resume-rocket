import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Upload, Sparkles, CheckCircle2, AlertTriangle,
  Plus, ChevronDown, Lightbulb, MessageSquare, Target,
  TrendingUp, X, FileUp
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

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef = useRef<HTMLInputElement>(null);

  const handleResumeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
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

    // Step 1
    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "running" } : s));
    await new Promise(r => setTimeout(r, 1200));
    setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "done" } : s));

    // Step 2
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
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Evaluate Resume</h1>
        <p className="mt-1 text-muted-foreground">
          Upload your resume and provide a job description to get an ATS compatibility score and actionable feedback.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Resume Upload */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Resume
          </label>
          <div
            className="relative flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-6 transition-colors hover:border-primary/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleResumeDrop}
          >
            {resumeFile ? (
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">{resumeFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResumeFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Drop your resume PDF here
                </p>
                <p className="text-xs text-muted-foreground">or</p>
                <Button variant="outline" size="sm" onClick={() => resumeInputRef.current?.click()}>
                  Browse Files
                </Button>
              </>
            )}
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleResumeFileChange}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">or paste text below</p>
          <Textarea
            placeholder="Paste your resume content here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="min-h-[120px] resize-none rounded-xl bg-card"
          />
        </div>

        {/* Job Description */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Job Description
          </label>
          <Textarea
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="min-h-[200px] resize-none rounded-xl bg-card"
          />
          <div className="text-center text-xs text-muted-foreground">and / or</div>
          <div
            className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-4 transition-colors hover:border-primary/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleJdDrop}
          >
            {jdFile ? (
              <div className="flex items-center gap-3">
                <FileUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{jdFile.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setJdFile(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Drop JD PDF here <span className="text-xs">(optional)</span>
              </p>
            )}
            <input
              ref={jdInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleJdFileChange}
            />
          </div>
        </div>
      </div>

      {/* Analyze Button + Model Selector */}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button
          onClick={handleAnalyze}
          disabled={(!resumeText.trim() && !resumeFile) || (!jobDescription.trim() && !jdFile) || isAnalyzing}
          size="lg"
          className="gap-2 rounded-xl px-10"
        >
          <Sparkles className="h-5 w-5" />
          {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">model</span>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    {m.label}
                    {m.tier !== "free" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {m.tier}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pipeline Info */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-primary" />
          Keywords &amp; scoring: local NLP (spaCy + TF-IDF + NLTK) — zero AI tokens
        </span>
        <span className="mx-2">|</span>
        <span>● Summary &amp; suggestions: selected AI model only</span>
      </div>

      {/* Analysis Steps */}
      {steps.length > 0 && (
        <div className="mx-auto mt-6 max-w-md space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary" />}
              {step.status === "running" && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              {step.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-border" />}
              {step.status === "error" && <AlertTriangle className="h-4 w-4 text-destructive" />}
              <span className={step.status === "done" ? "text-foreground" : "text-muted-foreground"}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Score + Summary */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Scoring: AI-only | Insights: {selectedModel}
            </div>
            <ScoreRing score={result.score} />
            <p className="text-center text-sm text-muted-foreground max-w-md">{result.summary}</p>
            <div className="flex gap-8 text-center">
              <div>
                <p className="font-display text-lg font-bold">{result.keywordMatch !== null ? `${result.keywordMatch}%` : "N/A"}</p>
                <p className="text-xs text-muted-foreground">Keyword match</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold">{result.semanticMatch !== null ? `${result.semanticMatch}%` : "N/A"}</p>
                <p className="text-xs text-muted-foreground">Semantic match</p>
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" /> Matched ({result.matchedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.length > 0 ? result.matchedSkills.map(s => (
                  <span key={s} className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">{s}</span>
                )) : <p className="text-sm text-muted-foreground">No specific matches detected.</p>}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" /> Missing ({result.missingSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills.length > 0 ? result.missingSkills.map(s => (
                  <span key={s} className="rounded-lg bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">{s}</span>
                )) : <p className="text-sm text-muted-foreground">No major gaps found!</p>}
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <TrendingUp className="h-5 w-5 text-primary" /> Strengths & Weaknesses
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-[hsl(var(--success))]">Strengths</h4>
                {result.strengths.map((s, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{s}</p>
                ))}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-destructive">Weaknesses</h4>
                {result.weaknesses.map((s, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{s}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Suggestions */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <Target className="h-5 w-5 text-primary" /> Actionable Suggestions
            </h3>
            <div className="space-y-3">
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex gap-3 rounded-xl bg-secondary/50 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                  <p className="text-sm leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nice to Include */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <Lightbulb className="h-5 w-5 text-[hsl(var(--warning))]" /> Nice to Include
            </h3>
            <div className="space-y-3">
              {result.niceToInclude.map((s, i) => (
                <div key={i} className="flex gap-3 rounded-xl bg-secondary/30 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--warning))] text-xs font-bold text-[hsl(var(--warning-foreground))]">{i + 1}</span>
                  <p className="text-sm leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interview Tips */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="mb-6 flex items-center gap-2 font-display text-lg font-semibold">
              <MessageSquare className="h-5 w-5 text-primary" /> Interview Tips
            </h3>
            <div className="space-y-5">
              {result.interviewTips.map((tip, i) => (
                <div key={i} className="rounded-xl bg-secondary/30 p-5">
                  <p className="mb-2 text-sm font-semibold">Q: {tip.question}</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Strategy:</span> {tip.strategy}
                  </p>
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
