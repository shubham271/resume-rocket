import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, MapPin, Users, Heart, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
  posted: string;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  logo: string;
  employees: string;
  location: string;
  jobs: Job[];
}

const companiesData: Company[] = [
  { id: "1", name: "TechNova", industry: "AI / Machine Learning", logo: "🚀", employees: "500-1000", location: "San Francisco, CA",
    jobs: [
      { id: "j1", title: "Senior ML Engineer", location: "Remote", type: "Full-time", posted: "2d ago" },
      { id: "j2", title: "Frontend Developer (React)", location: "SF, CA", type: "Full-time", posted: "5d ago" },
    ],
  },
  { id: "2", name: "CloudScale", industry: "Cloud Infrastructure", logo: "☁️", employees: "1000-5000", location: "Seattle, WA",
    jobs: [
      { id: "j3", title: "DevOps Engineer", location: "Seattle, WA", type: "Full-time", posted: "1d ago" },
      { id: "j4", title: "Backend Developer (Go)", location: "Remote", type: "Contract", posted: "3d ago" },
    ],
  },
  { id: "3", name: "DesignCraft", industry: "Design Tools", logo: "🎨", employees: "100-500", location: "New York, NY",
    jobs: [
      { id: "j6", title: "UX Researcher", location: "NY, NY", type: "Full-time", posted: "4d ago" },
    ],
  },
  { id: "4", name: "FinEdge", industry: "FinTech", logo: "💰", employees: "200-500", location: "London, UK",
    jobs: [
      { id: "j8", title: "Data Analyst", location: "London, UK", type: "Full-time", posted: "2d ago" },
    ],
  },
  { id: "5", name: "GreenByte", industry: "CleanTech", logo: "🌱", employees: "50-200", location: "Austin, TX",
    jobs: [
      { id: "j9", title: "React Native Developer", location: "Remote", type: "Full-time", posted: "3d ago" },
    ],
  },
];

const CompaniesPage = () => {
  const { user } = useAuth();
  const [followedNames, setFollowedNames] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("followed_companies")
      .select("company_name")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setFollowedNames(new Set(data.map((d) => d.company_name)));
      });
  }, [user]);

  const toggleFollow = async (company: Company) => {
    if (!user) return;
    const isFollowed = followedNames.has(company.name);

    if (isFollowed) {
      await supabase.from("followed_companies").delete().eq("user_id", user.id).eq("company_name", company.name);
      setFollowedNames((prev) => { const n = new Set(prev); n.delete(company.name); return n; });
      toast.success(`Unfollowed ${company.name}`);
    } else {
      await supabase.from("followed_companies").insert({
        user_id: user.id,
        company_name: company.name,
        company_industry: company.industry,
        company_logo: company.logo,
      });
      setFollowedNames((prev) => new Set(prev).add(company.name));
      toast.success(`Following ${company.name}`);
    }
  };

  const filtered = companiesData.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.industry.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!showFollowedOnly || followedNames.has(c.name));
  });

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Companies</h1>
        <p className="mt-1 text-muted-foreground">Follow companies and explore their latest openings.</p>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl pl-10" />
        </div>
        <Button variant={showFollowedOnly ? "default" : "outline"} onClick={() => setShowFollowedOnly(!showFollowedOnly)} className="gap-2 rounded-xl">
          <Heart className={`h-4 w-4 ${showFollowedOnly ? "fill-current" : ""}`} />
          Following ({followedNames.size})
        </Button>
      </div>

      <div className="space-y-6">
        {filtered.map((company) => {
          const isFollowed = followedNames.has(company.name);
          return (
            <div key={company.id} className="rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-md hover:shadow-primary/5">
              <div className="flex items-center justify-between gap-4 border-b p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-2xl">{company.logo}</div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">{company.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {company.location}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {company.employees}</span>
                      <Badge variant="secondary" className="rounded-md">{company.industry}</Badge>
                    </div>
                  </div>
                </div>
                <Button variant={isFollowed ? "default" : "outline"} size="sm" onClick={() => toggleFollow(company)} className="gap-2 rounded-xl">
                  <Heart className={`h-4 w-4 ${isFollowed ? "fill-current" : ""}`} />
                  {isFollowed ? "Following" : "Follow"}
                </Button>
              </div>
              <div className="divide-y">
                {company.jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-secondary/30">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{job.location}</span><span>•</span><span>{job.type}</span><span>•</span><span>{job.posted}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">View <ExternalLink className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">No companies found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;
