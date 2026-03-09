import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, MapPin, Clock, ExternalLink, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const allJobs = [
  { id: "1", title: "Senior Frontend Engineer", company: "TechNova", location: "Remote", type: "Full-time", salary: "$140k–$180k", posted: "2d ago", tags: ["React", "TypeScript"] },
  { id: "2", title: "ML Engineer", company: "TechNova", location: "San Francisco", type: "Full-time", salary: "$160k–$200k", posted: "3d ago", tags: ["Python", "PyTorch"] },
  { id: "3", title: "DevOps Engineer", company: "CloudScale", location: "Seattle", type: "Full-time", salary: "$130k–$170k", posted: "1d ago", tags: ["AWS", "Kubernetes"] },
  { id: "4", title: "Product Designer", company: "DesignCraft", location: "New York", type: "Full-time", salary: "$120k–$150k", posted: "4d ago", tags: ["Figma", "UX"] },
  { id: "5", title: "Full Stack Developer", company: "GreenByte", location: "Remote", type: "Contract", salary: "$90–$120/hr", posted: "5d ago", tags: ["Node", "React"] },
  { id: "6", title: "Data Analyst", company: "FinEdge", location: "London", type: "Full-time", salary: "£65k–£85k", posted: "2d ago", tags: ["SQL", "Python"] },
  { id: "7", title: "Software Engineer", company: "Google", location: "Mountain View", type: "Full-time", salary: "$150k–$220k", posted: "1d ago", tags: ["Go", "Distributed Systems"] },
  { id: "8", title: "Backend Engineer", company: "Stripe", location: "Remote", type: "Full-time", salary: "$160k–$210k", posted: "3d ago", tags: ["Ruby", "API Design"] },
  { id: "9", title: "Product Manager", company: "Notion", location: "San Francisco", type: "Full-time", salary: "$140k–$190k", posted: "2d ago", tags: ["Product", "Strategy"] },
];

const Jobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [followedNames, setFollowedNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("followed_companies")
      .select("company_name")
      .eq("user_id", user.id);

    if (data) setFollowedNames(data.map((d) => d.company_name.toLowerCase()));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFollowed();
  }, [fetchFollowed]);

  const filteredJobs = allJobs.filter((job) =>
    followedNames.includes(job.company.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 md:p-10 min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Job Posts</h1>
        <p className="mt-1 text-muted-foreground">
          Showing openings from your watchlist ({followedNames.length} {followedNames.length === 1 ? "company" : "companies"}).
        </p>
      </div>

      {followedNames.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No companies in your watchlist</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add companies to your watchlist first, and their job posts will appear here.
          </p>
          <Button className="mt-4 gap-2 rounded-xl" onClick={() => navigate("/my-companies")}>
            <Building2 className="h-4 w-4" /> Go to Watchlist
          </Button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No job posts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No openings found from your watched companies. Check back later or add more companies.
          </p>
          <Button variant="outline" className="mt-4 gap-2 rounded-xl" onClick={() => navigate("/my-companies")}>
            <Building2 className="h-4 w-4" /> Manage Watchlist
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-6 transition-all hover:shadow-md hover:shadow-primary/5">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-semibold">{job.title}</h3>
                <p className="text-sm text-muted-foreground">{job.company}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.type}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.posted}</span>
                  <span className="font-medium text-foreground">{job.salary}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-md">{tag}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl">
                Apply <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Jobs;
