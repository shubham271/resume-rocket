import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, TrendingUp, Building2, FileText } from "lucide-react";
import ScoreRing from "@/components/ScoreRing";

interface Analysis {
  id: string;
  job_title: string | null;
  company_name: string | null;
  score: number;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [followedCount, setFollowedCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [{ data: analysesData }, { count }] = await Promise.all([
        supabase
          .from("resume_analyses")
          .select("id, job_title, company_name, score, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("followed_companies")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      setAnalyses(analysesData || []);
      setFollowedCount(count || 0);
    };

    fetchData();
  }, [user]);

  const avgScore = analyses.length > 0
    ? Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length)
    : 0;

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Welcome back! Here's your resume overview.</p>
      </div>

      {/* Stats */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Evaluations", value: analyses.length, icon: FileText, color: "text-primary" },
          { label: "Avg Score", value: avgScore > 0 ? `${avgScore}/100` : "N/A", icon: TrendingUp, color: "text-success" },
          { label: "Companies", value: followedCount, icon: Building2, color: "text-accent-foreground" },
          { label: "This Week", value: analyses.filter(a => {
              const d = new Date(a.created_at);
              const now = new Date();
              return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
            }).length, icon: LayoutDashboard, color: "text-warning" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-2 font-display text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent + Score */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Recent Evaluations</h2>
          {analyses.length > 0 ? (
            <div className="space-y-3">
              {analyses.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-secondary/30 p-4">
                  <div>
                    <p className="font-medium">{a.job_title || "Untitled"}</p>
                    <p className="text-sm text-muted-foreground">{a.company_name || "Unknown company"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-display text-lg font-bold ${
                      a.score >= 75 ? "text-success" : a.score >= 50 ? "text-warning" : "text-destructive"
                    }`}>
                      {a.score}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">No evaluations yet. Analyze your first resume!</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center rounded-2xl border bg-card p-6">
          {avgScore > 0 ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">Average Score</p>
              <ScoreRing score={avgScore} />
            </div>
          ) : (
            <div className="text-center">
              <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Your average score will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
