import { Link } from "react-router-dom";
import { FileText, Building2, Target, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const features = [
    {
      icon: Target,
      title: "Smart Scoring",
      description: "Get an instant compatibility score between your resume and any job description.",
    },
    {
      icon: TrendingUp,
      title: "Actionable Insights",
      description: "Receive specific recommendations to improve your resume for each role.",
    },
    {
      icon: Building2,
      title: "Follow Companies",
      description: "Track your target companies and stay updated on their latest job postings.",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/60 via-background to-background" />
        <div className="absolute top-20 right-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />
        <div className="container relative mx-auto px-4 py-24 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Land your dream interview
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              Make your resume{" "}
              <span className="text-gradient">interview-ready</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Compare your resume against job descriptions, get a match score, and receive
              tailored recommendations to stand out from the crowd.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="gap-2 rounded-xl px-8 text-base">
                <Link to="/analyzer">
                  <FileText className="h-5 w-5" />
                  Analyze My Resume
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2 rounded-xl px-8 text-base">
                <Link to="/companies">
                  <Building2 className="h-5 w-5" />
                  Browse Companies
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border bg-card p-8 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <f.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{f.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
