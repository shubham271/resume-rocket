import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCareerProfiles } from "@/hooks/useCareerProfiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles, Plus, Trash2, Loader2, ChevronRight, ChevronLeft, GraduationCap, Briefcase, Award, Wrench, User, LayoutTemplate,
} from "lucide-react";

interface WorkExperience { company: string; title: string; startDate: string; endDate: string; duties: string; }
interface Education { institution: string; degree: string; field: string; startDate: string; endDate: string; }
interface Certification { name: string; issuer: string; date: string; }

const STEPS = ["Personal Info", "Skills", "Experience", "Education", "Certifications", "Template & Generate"];

const RESUME_TEMPLATES = [
  { id: "professional", label: "Professional", description: "Clean, traditional format ideal for corporate roles", icon: "📋" },
  { id: "modern", label: "Modern", description: "Contemporary design with a creative touch", icon: "✨" },
  { id: "minimal", label: "Minimal", description: "Simple and distraction-free layout", icon: "📝" },
  { id: "technical", label: "Technical", description: "Optimized for engineering and tech roles", icon: "⚙️" },
];

const ResumeBuilderPage = () => {
  const { user } = useAuth();
  const { profiles } = useCareerProfiles();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("professional");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("none");

  // Personal Info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [linkedIn, setLinkedIn] = useState("");

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  // Experience
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);

  // Education
  const [educations, setEducations] = useState<Education[]>([]);

  // Certifications
  const [certifications, setCertifications] = useState<Certification[]>([]);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const addExperience = () => setExperiences([...experiences, { company: "", title: "", startDate: "", endDate: "", duties: "" }]);
  const updateExperience = (idx: number, field: keyof WorkExperience, value: string) => setExperiences(experiences.map((exp, i) => i === idx ? { ...exp, [field]: value } : exp));
  const addEducation = () => setEducations([...educations, { institution: "", degree: "", field: "", startDate: "", endDate: "" }]);
  const updateEducation = (idx: number, field: keyof Education, value: string) => setEducations(educations.map((edu, i) => i === idx ? { ...edu, [field]: value } : edu));
  const addCertification = () => setCertifications([...certifications, { name: "", issuer: "", date: "" }]);
  const updateCertification = (idx: number, field: keyof Certification, value: string) => setCertifications(certifications.map((cert, i) => i === idx ? { ...cert, [field]: value } : cert));

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);

    const resumeData = {
      personalInfo: { fullName, email, phone, location, summary, linkedIn },
      skills, experiences, educations, certifications,
    };

    try {
      const resp = await supabase.functions.invoke("generate-resume", {
        body: { resumeData, template: selectedTemplate },
      });

      if (resp.error) throw resp.error;
      const content = resp.data?.content;
      if (!content) throw new Error("No content returned");

      setGeneratedContent(content);

      const { error } = await supabase.from("resumes").insert({
        user_id: user.id,
        title: `${fullName || "My"} Resume`,
        version: 1,
        is_generated: true,
        resume_data: resumeData,
        profile_id: selectedProfileId === "none" ? null : selectedProfileId,
      } as any);

      if (!error) toast.success("Resume generated and saved!");
      else toast.error("Generated but failed to save");
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    }
    setGenerating(false);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return fullName.trim().length > 0;
      case 1: return skills.length > 0;
      default: return true;
    }
  };

  const stepIcons = [User, Wrench, Briefcase, GraduationCap, Award, Sparkles];

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Resume Builder</h1>
        <p className="mt-1 text-muted-foreground">Fill in your details and let AI generate a professional resume.</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = stepIcons[i];
          return (
            <button key={s} onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-accent text-accent-foreground cursor-pointer" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />{s}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border bg-card p-6">
        {/* Step 0: Personal Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> Personal Information
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Full Name *</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className="rounded-xl" /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" className="rounded-xl" /></div>
              <div className="space-y-2"><Label>LinkedIn URL</Label><Input value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="https://linkedin.com/in/johndoe" className="rounded-xl" /></div>
            </div>
            <div className="space-y-2"><Label>Professional Summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary..." className="min-h-[80px] rounded-xl" /></div>
          </div>
        )}

        {/* Step 1: Skills */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> Skills</h2>
            <div className="flex gap-2">
              <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} placeholder="e.g. React, Python..." className="rounded-xl" />
              <Button onClick={addSkill} disabled={!newSkill.trim()} size="sm" className="rounded-xl gap-1"><Plus className="h-4 w-4" /> Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="gap-1 rounded-lg px-3 py-1.5">
                  {skill}
                  <button onClick={() => setSkills(skills.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            {skills.length === 0 && <p className="text-sm text-muted-foreground">Add at least one skill to continue.</p>}
          </div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Work Experience</h2>
              <Button onClick={addExperience} variant="outline" size="sm" className="rounded-xl gap-1"><Plus className="h-4 w-4" /> Add</Button>
            </div>
            {experiences.length === 0 && <p className="text-sm text-muted-foreground">Add your work experience (optional).</p>}
            {experiences.map((exp, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Position {i + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => setExperiences(experiences.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label className="text-xs">Job Title</Label><Input value={exp.title} onChange={(e) => updateExperience(i, "title", e.target.value)} placeholder="Software Engineer" className="rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Company</Label><Input value={exp.company} onChange={(e) => updateExperience(i, "company", e.target.value)} placeholder="Google" className="rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input value={exp.startDate} onChange={(e) => updateExperience(i, "startDate", e.target.value)} placeholder="Jan 2020" className="rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">End Date</Label><Input value={exp.endDate} onChange={(e) => updateExperience(i, "endDate", e.target.value)} placeholder="Present" className="rounded-xl" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Key Duties & Achievements</Label><Textarea value={exp.duties} onChange={(e) => updateExperience(i, "duties", e.target.value)} placeholder="Describe responsibilities..." className="min-h-[60px] rounded-xl" /></div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Education */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> Education</h2>
              <Button onClick={addEducation} variant="outline" size="sm" className="rounded-xl gap-1"><Plus className="h-4 w-4" /> Add</Button>
            </div>
            {educations.length === 0 && <p className="text-sm text-muted-foreground">Add your education (optional).</p>}
            {educations.map((edu, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Education {i + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => setEducations(educations.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label className="text-xs">Institution</Label><Input value={edu.institution} onChange={(e) => updateEducation(i, "institution", e.target.value)} placeholder="MIT" className="rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Degree</Label><Input value={edu.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} placeholder="Bachelor of Science" className="rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Field of Study</Label><Input value={edu.field} onChange={(e) => updateEducation(i, "field", e.target.value)} placeholder="Computer Science" className="rounded-xl" /></div>
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1.5"><Label className="text-xs">Start</Label><Input value={edu.startDate} onChange={(e) => updateEducation(i, "startDate", e.target.value)} placeholder="2016" className="rounded-xl" /></div>
                    <div className="flex-1 space-y-1.5"><Label className="text-xs">End</Label><Input value={edu.endDate} onChange={(e) => updateEducation(i, "endDate", e.target.value)} placeholder="2020" className="rounded-xl" /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Certifications */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Certifications</h2>
              <Button onClick={addCertification} variant="outline" size="sm" className="rounded-xl gap-1"><Plus className="h-4 w-4" /> Add</Button>
            </div>
            {certifications.length === 0 && <p className="text-sm text-muted-foreground">Add certifications (optional).</p>}
            {certifications.map((cert, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Certification {i + 1}</span>
                  <Button variant="ghost" size="sm" onClick={() => setCertifications(certifications.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={cert.name} onChange={(e) => updateCertification(i, "name", e.target.value)} placeholder="AWS Solutions Architect" className="rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Issuer</Label><Input value={cert.issuer} onChange={(e) => updateCertification(i, "issuer", e.target.value)} placeholder="Amazon" className="rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input value={cert.date} onChange={(e) => updateCertification(i, "date", e.target.value)} placeholder="2023" className="rounded-xl" /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 5: Template & Generate */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-primary" /> Choose Template & Generate
            </h2>

            {/* Template Selection */}
            <div>
              <Label className="mb-3 block">Resume Template</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {RESUME_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selectedTemplate === t.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{t.icon}</span>
                      <div>
                        <p className="font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Career Profile */}
            {profiles.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to Career Profile (optional)</Label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger className="rounded-xl w-full sm:w-[300px]"><SelectValue placeholder="No profile" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No profile</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.profile_name} — {p.target_role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Summary */}
            <div className="rounded-xl bg-secondary/50 p-4 space-y-2">
              <p className="text-sm font-medium">Summary of your details:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Name:</strong> {fullName || "—"}</li>
                <li>• <strong>Skills:</strong> {skills.length > 0 ? skills.join(", ") : "—"}</li>
                <li>• <strong>Experience:</strong> {experiences.length} position{experiences.length !== 1 ? "s" : ""}</li>
                <li>• <strong>Education:</strong> {educations.length} entr{educations.length !== 1 ? "ies" : "y"}</li>
                <li>• <strong>Certifications:</strong> {certifications.length}</li>
                <li>• <strong>Template:</strong> {RESUME_TEMPLATES.find((t) => t.id === selectedTemplate)?.label}</li>
              </ul>
            </div>

            <Button onClick={handleGenerate} disabled={generating} className="gap-2 rounded-xl" size="lg">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating..." : "Generate My Resume"}
            </Button>

            {generatedContent && (
              <div className="mt-4 rounded-xl border bg-background p-6 text-sm whitespace-pre-wrap">{generatedContent}</div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0} className="gap-1 rounded-xl">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gap-1 rounded-xl">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilderPage;
