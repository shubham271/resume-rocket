import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Users, FileText, Briefcase, Building2, BarChart3,
  TrendingUp, ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface PlatformStats {
  total_users: number;
  total_resumes: number;
  total_cover_letters: number;
  total_analyses: number;
  total_career_profiles: number;
  total_followed_companies: number;
  blocked_accounts_count: number;
  users_last_7_days: number;
  users_last_30_days: number;
  resumes_last_7_days: number;
  cover_letters_last_7_days: number;
  daily_signups: Array<{ date: string; count: number }>;
}

const AdminAnalytics = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.rpc("admin_get_platform_stats");
      if (!error && data) setStats(data as unknown as PlatformStats);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const metricCards = [
    { label: "Total Users", value: stats.total_users, icon: Users, color: "text-primary" },
    { label: "New (7 days)", value: stats.users_last_7_days, icon: TrendingUp, color: "text-green-500" },
    { label: "New (30 days)", value: stats.users_last_30_days, icon: TrendingUp, color: "text-blue-500" },
    { label: "Blocked", value: stats.blocked_accounts_count, icon: ShieldAlert, color: "text-destructive" },
    { label: "Resumes", value: stats.total_resumes, icon: FileText, color: "text-primary" },
    { label: "Cover Letters", value: stats.total_cover_letters, icon: FileText, color: "text-primary" },
    { label: "Analyses", value: stats.total_analyses, icon: BarChart3, color: "text-primary" },
    { label: "Career Profiles", value: stats.total_career_profiles, icon: Briefcase, color: "text-primary" },
    { label: "Companies Followed", value: stats.total_followed_companies, icon: Building2, color: "text-primary" },
    { label: "Resumes (7d)", value: stats.resumes_last_7_days, icon: FileText, color: "text-green-500" },
    { label: "Cover Letters (7d)", value: stats.cover_letters_last_7_days, icon: FileText, color: "text-green-500" },
  ];

  const chartData = (stats.daily_signups || []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    signups: d.count,
  }));

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground">Monitor platform-wide metrics and performance</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {metricCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {label}
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signups Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Sign-ups (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAnalytics;
